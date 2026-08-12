"""
SQLAlchemy models for Fee records and transactions.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.students.models import Student


class FeeRecord(UUIDMixin, TimestampMixin, Base):
    """FeeRecord model representing a monthly fee obligation for a student."""

    __tablename__ = "fee_records"

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # e.g., "2026-07"
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month_num: Mapped[int] = mapped_column(Integer, nullable=False)
    base_amount: Mapped[float] = mapped_column(Float, nullable=False)
    discount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    discount_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extra_charges: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    extra_charges_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="fee_records")
    transactions: Mapped[list[FeeTransaction]] = relationship(
        "FeeTransaction", back_populates="fee_record", cascade="all, delete-orphan", order_by="asc(FeeTransaction.date)"
    )

    def __repr__(self) -> str:
        return f"<FeeRecord(id={self.id}, student_id={self.student_id}, month={self.month}, net_amount={self.net_amount})>"


class FeeTransaction(UUIDMixin, TimestampMixin, Base):
    """FeeTransaction model representing an individual payment towards a FeeRecord."""

    __tablename__ = "fee_transactions"

    fee_record_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_records.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # "cash", "upi", "bank_transfer"
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # auto-generated (e.g. TMS-YYYY-NNNN)
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # transaction ID for UPI / bank transfer
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationships
    fee_record: Mapped[FeeRecord] = relationship("FeeRecord", back_populates="transactions")
    student: Mapped[Student] = relationship("Student", back_populates="fee_transactions")

    def __repr__(self) -> str:
        return f"<FeeTransaction(id={self.id}, receipt={self.receipt_number}, amount={self.amount})>"
