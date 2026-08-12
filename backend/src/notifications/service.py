"""
Provider-agnostic Notification Service.

Architecture is designed so future providers (WhatsApp Business API, SMS, Email)
can be plugged in by implementing the NotificationProvider interface without
changing any business logic.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

from sqlalchemy.ext.asyncio import AsyncSession

from src.notifications.repository import NotificationRepository
from src.notifications.schemas import NotificationCreate, NotificationResponse


# ──────────────────────────────────────────────
# Provider Interface (Future-Ready)
# ──────────────────────────────────────────────

class NotificationProvider:
    """Abstract provider interface for future notification channels."""

    async def send_whatsapp(self, phone: str, message: str) -> str:
        """Return a URL or delivery confirmation. Default: Click-to-Chat."""
        raise NotImplementedError

    async def send_sms(self, phone: str, message: str) -> bool:
        raise NotImplementedError

    async def send_email(self, email: str, subject: str, body: str) -> bool:
        raise NotImplementedError


class WhatsAppClickToChat(NotificationProvider):
    """
    Free WhatsApp Click-to-Chat implementation.
    Opens WhatsApp with a pre-filled message — no API key needed.
    Future: replace with WhatsApp Business API by overriding send_whatsapp().
    """

    BASE_URL = "https://wa.me/"

    async def send_whatsapp(self, phone: str, message: str) -> str:
        """Generate a Click-to-Chat URL for WhatsApp."""
        # Normalize phone: strip non-digits, ensure country code
        digits = "".join(c for c in phone if c.isdigit())
        if not digits.startswith("91") and len(digits) == 10:
            digits = "91" + digits
        encoded_msg = quote(message)
        return f"{self.BASE_URL}{digits}?text={encoded_msg}"

    async def send_sms(self, phone: str, message: str) -> bool:
        return False

    async def send_email(self, email: str, subject: str, body: str) -> bool:
        return False


# ──────────────────────────────────────────────
# Notification Service
# ──────────────────────────────────────────────

class NotificationService:
    """
    Main notification service.
    Business logic lives here; provider is injected for easy future swapping.
    """

    def __init__(self, db: AsyncSession, provider: NotificationProvider | None = None) -> None:
        self.db = db
        self.repo = NotificationRepository(db)
        self.provider: NotificationProvider = provider or WhatsAppClickToChat()

    # ──────────────────────────────────────────
    # Core: generate content
    # ──────────────────────────────────────────

    def generate_payment_message(
        self,
        parent_name: str,
        student_name: str,
        amount: float,
        month: str,
        receipt_number: str,
        balance: float,
        institute_name: str = "Tuition Centre",
    ) -> str:
        """Generate a professional payment received WhatsApp message."""
        formatted_month = self._format_month(month)
        balance_text = f"₹{balance:,.0f}" if balance > 0 else "₹0 (Fully Paid ✅)"
        return (
            f"Hello {parent_name},\n\n"
            f"We have successfully received *₹{amount:,.0f}* for "
            f"*{student_name}'s* {formatted_month} tuition fees.\n\n"
            f"📋 Receipt No: *{receipt_number}*\n"
            f"💰 Remaining Due: {balance_text}\n\n"
            f"Thank you for your payment! 🙏\n\n"
            f"— {institute_name}"
        )

    def generate_fee_reminder_message(
        self,
        parent_name: str,
        student_name: str,
        amount: float,
        month: str,
        due_date: str,
        days_overdue: int = 0,
        institute_name: str = "Tuition Centre",
    ) -> str:
        """Generate a fee reminder WhatsApp message."""
        formatted_month = self._format_month(month)
        if days_overdue > 0:
            return (
                f"Hello {parent_name},\n\n"
                f"⚠️ The tuition fee of *₹{amount:,.0f}* for *{student_name}* "
                f"({formatted_month}) is *overdue by {days_overdue} day(s)*.\n\n"
                f"Kindly clear the dues at the earliest to avoid any disruption.\n\n"
                f"— {institute_name}"
            )
        return (
            f"Hello {parent_name},\n\n"
            f"This is a friendly reminder that the tuition fee of *₹{amount:,.0f}* "
            f"for *{student_name}* ({formatted_month}) is due on *{due_date}*.\n\n"
            f"Please arrange payment at your earliest convenience. 😊\n\n"
            f"— {institute_name}"
        )

    def generate_whatsapp_url(self, phone: str, message: str) -> str:
        """Generate Click-to-Chat URL synchronously (no async needed)."""
        digits = "".join(c for c in phone if c.isdigit())
        if not digits.startswith("91") and len(digits) == 10:
            digits = "91" + digits
        encoded_msg = quote(message)
        return f"https://wa.me/{digits}?text={encoded_msg}"

    # ──────────────────────────────────────────
    # Core: persist notification
    # ──────────────────────────────────────────

    async def record_notification(
        self,
        student_id: str,
        student_name: str,
        parent_name: str,
        parent_mobile: str,
        notification_type: str,
        message: str,
        channel: str = "whatsapp",
        status: str = "initiated",
        receipt_number: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> NotificationResponse:
        """Persist a notification event to the database."""
        data = NotificationCreate(
            student_id=student_id,
            student_name=student_name,
            parent_name=parent_name,
            parent_mobile=parent_mobile,
            notification_type=notification_type,
            channel=channel,
            status=status,
            receipt_number=receipt_number,
            message=message,
            metadata=metadata,
        )
        notification = await self.repo.create(data)
        await self.db.commit()
        return NotificationResponse.model_validate(notification)

    async def list_notifications(self, **kwargs) -> tuple[list, int]:
        """List notifications with optional filters."""
        return await self.repo.list_notifications(**kwargs)

    async def get_templates(self) -> list:
        """Return all message templates, seeding defaults if needed."""
        templates = await self.repo.get_all_templates()
        if not templates:
            await self.repo.seed_default_templates()
            await self.db.commit()
            templates = await self.repo.get_all_templates()
        return templates

    async def get_analytics(self) -> dict:
        """Return notification analytics aggregates."""
        return await self.repo.get_analytics()

    # ──────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────

    @staticmethod
    def _format_month(month_str: str) -> str:
        """Convert YYYY-MM to 'Month YYYY'."""
        try:
            from datetime import date
            year, month = month_str.split("-")
            d = date(int(year), int(month), 1)
            return d.strftime("%B %Y")
        except Exception:
            return month_str
