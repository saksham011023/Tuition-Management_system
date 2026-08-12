"""
SQLAlchemy model for Activity Log.
Tracks every significant action performed in the system.
"""

from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDMixin


class ActivityLog(UUIDMixin, TimestampMixin, Base):
    """Activity log model — records user actions for audit trail."""

    __tablename__ = "activity_logs"

    # Who performed the action (user id or "system")
    performed_by: Mapped[str] = mapped_column(String(255), nullable=False, default="system")

    # Action type: student_created, student_updated, student_deleted,
    # student_restored, import_performed, export_performed,
    # backup_created, restore_performed, demo_seeded, demo_cleared
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # The primary entity affected
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Student"
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Short human-readable summary
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Extra structured data (counts, file names, error lists, etc.)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<ActivityLog(action={self.action}, entity_type={self.entity_type}, by={self.performed_by})>"
