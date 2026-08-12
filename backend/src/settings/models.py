"""
System settings database model.
"""

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDMixin


class SystemSetting(UUIDMixin, TimestampMixin, Base):
    """SystemSettings model to store system settings in a key-value structure."""

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<SystemSetting(key={self.key}, value={self.value})>"
