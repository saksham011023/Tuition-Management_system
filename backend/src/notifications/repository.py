"""
Notification repository — async DB operations for notifications and templates.
"""

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.notifications.models import MessageTemplate, Notification
from src.notifications.schemas import NotificationCreate


class NotificationRepository:
    """Async repository for notification persistence."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────
    # Notifications
    # ──────────────────────────────────────────

    async def create(self, data: NotificationCreate) -> Notification:
        """Persist a notification record."""
        notification = Notification(
            student_id=data.student_id,
            student_name=data.student_name,
            parent_name=data.parent_name,
            parent_mobile=data.parent_mobile,
            notification_type=data.notification_type,
            channel=data.channel,
            status=data.status,
            receipt_number=data.receipt_number,
            message=data.message,
            metadata_=data.metadata_,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def list_notifications(
        self,
        page: int = 1,
        page_size: int = 20,
        student_id: str | None = None,
        notification_type: str | None = None,
        channel: str | None = None,
        status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ) -> tuple[list[Notification], int]:
        """List notifications with filters."""
        query = select(Notification)

        if student_id:
            query = query.where(Notification.student_id == student_id)
        if notification_type:
            query = query.where(Notification.notification_type == notification_type)
        if channel:
            query = query.where(Notification.channel == channel)
        if status:
            query = query.where(Notification.status == status)
        if date_from:
            dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
            query = query.where(Notification.created_at >= dt_from)
        if date_to:
            dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)
            query = query.where(Notification.created_at <= dt_to)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                Notification.student_name.ilike(pattern)
                | Notification.parent_name.ilike(pattern)
                | Notification.parent_mobile.ilike(pattern)
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(Notification.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_analytics(self) -> dict:
        """Aggregate notification analytics."""
        today = datetime.now(timezone.utc).date()
        today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)

        total = (await self.db.execute(select(func.count()).select_from(Notification))).scalar() or 0
        receipts = (
            await self.db.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.notification_type == "payment_receipt"
                )
            )
        ).scalar() or 0
        wa_shares = (
            await self.db.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.channel == "whatsapp"
                )
            )
        ).scalar() or 0
        today_count = (
            await self.db.execute(
                select(func.count()).select_from(Notification).where(
                    Notification.created_at >= today_start
                )
            )
        ).scalar() or 0

        return {
            "total_receipts_generated": receipts,
            "whatsapp_shares_initiated": wa_shares,
            "sms_sent": 0,
            "email_sent": 0,
            "pending_reminders": 0,
            "today_notifications": today_count,
        }

    # ──────────────────────────────────────────
    # Templates
    # ──────────────────────────────────────────

    async def get_all_templates(self) -> list[MessageTemplate]:
        """Return all active message templates."""
        result = await self.db.execute(
            select(MessageTemplate).where(MessageTemplate.is_active == True).order_by(MessageTemplate.notification_type)
        )
        return list(result.scalars().all())

    async def seed_default_templates(self) -> None:
        """Seed the default message templates if they don't exist yet."""
        existing = await self.get_all_templates()
        existing_keys = {t.key for t in existing}

        defaults = [
            MessageTemplate(
                key="payment_received",
                name="Payment Received",
                notification_type="payment_receipt",
                variables=["parent_name", "student_name", "amount", "month", "receipt_number", "balance"],
                template=(
                    "Hello {parent_name},\n\n"
                    "We have successfully received ₹{amount} for {student_name}'s {month} tuition fees.\n\n"
                    "Receipt No: {receipt_number}\n"
                    "Remaining Due: ₹{balance}\n\n"
                    "Thank you for your prompt payment!\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="fee_reminder_upcoming",
                name="Fee Reminder (Upcoming)",
                notification_type="fee_reminder",
                variables=["parent_name", "student_name", "amount", "due_date", "month"],
                template=(
                    "Hello {parent_name},\n\n"
                    "This is a friendly reminder that the tuition fee of ₹{amount} for {student_name} "
                    "({month}) is due on {due_date}.\n\n"
                    "Please arrange payment at your earliest convenience.\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="fee_reminder_overdue",
                name="Fee Reminder (Overdue)",
                notification_type="fee_reminder",
                variables=["parent_name", "student_name", "amount", "days_overdue", "month"],
                template=(
                    "Hello {parent_name},\n\n"
                    "The tuition fee of ₹{amount} for {student_name} ({month}) is overdue by {days_overdue} day(s).\n\n"
                    "Kindly clear the dues at the earliest to avoid any disruption.\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="holiday_notice",
                name="Holiday Notice",
                notification_type="holiday",
                variables=["parent_name", "student_name", "holiday_date", "reason"],
                template=(
                    "Hello {parent_name},\n\n"
                    "Please note that the tuition classes for {student_name} will remain *closed* "
                    "on {holiday_date} due to {reason}.\n\n"
                    "Classes will resume as per normal schedule.\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="exam_notice",
                name="Exam / Test Notice",
                notification_type="exam",
                variables=["parent_name", "student_name", "test_name", "test_date", "subjects"],
                template=(
                    "Hello {parent_name},\n\n"
                    "A *{test_name}* is scheduled for {student_name} on {test_date}.\n"
                    "Subjects: {subjects}\n\n"
                    "Please ensure your child is prepared.\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="attendance_alert",
                name="Attendance Alert",
                notification_type="attendance",
                variables=["parent_name", "student_name", "date", "status"],
                template=(
                    "Hello {parent_name},\n\n"
                    "{student_name} was marked *{status}* on {date} in tuition classes.\n\n"
                    "If this is an error, please contact us.\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
            MessageTemplate(
                key="custom_message",
                name="Custom Message",
                notification_type="custom",
                variables=["parent_name", "student_name", "message"],
                template=(
                    "Hello {parent_name},\n\n"
                    "{message}\n\n"
                    "— Tuition Centre"
                ),
                is_active=True,
            ),
        ]

        for tmpl in defaults:
            if tmpl.key not in existing_keys:
                self.db.add(tmpl)

        await self.db.flush()
