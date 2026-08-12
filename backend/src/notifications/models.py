"""
SQLAlchemy models for Notifications and Message Templates.
"""

from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDMixin


class Notification(UUIDMixin, TimestampMixin, Base):
    """Notification model — persists every parent communication event."""

    __tablename__ = "notifications"

    student_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    student_name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_mobile: Mapped[str] = mapped_column(String(20), nullable=False)

    notification_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # payment_receipt | fee_reminder | holiday | exam | attendance | performance | custom

    channel: Mapped[str] = mapped_column(
        String(50), nullable=False, default="whatsapp"
    )  # whatsapp | sms | email | app

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="initiated"
    )  # initiated | sent | delivered | failed

    receipt_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata", JSON, nullable=True
    )  # extra context (amount, month, etc.)

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.notification_type}, student={self.student_name})>"


class MessageTemplate(UUIDMixin, TimestampMixin, Base):
    """Reusable message templates for parent communications."""

    __tablename__ = "message_templates"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    template: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<MessageTemplate(key={self.key}, type={self.notification_type})>"
