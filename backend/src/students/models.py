"""
SQLAlchemy models for Students, Batches, Payments, Attendance, and Test Scores.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Column, Date, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.fees.models import FeeRecord, FeeTransaction

# Association table for Student <-> Batch Many-to-Many relationship
student_batches = Table(
    "student_batches",
    Base.metadata,
    Column("student_id", String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    Column("batch_id", String(36), ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True),
)


class Batch(UUIDMixin, TimestampMixin, Base):
    """Batch model."""

    __tablename__ = "batches"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher: Mapped[str] = mapped_column(String(255), nullable=False)
    days: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)  # list of weekdays
    timing: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "04:00 PM - 05:30 PM"
    max_students: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationships
    students: Mapped[list[Student]] = relationship(
        "Student", secondary=student_batches, back_populates="batches"
    )
    attendance_records: Mapped[list[Attendance]] = relationship(
        "Attendance", back_populates="batch", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Batch(id={self.id}, name={self.name}, subject={self.subject})>"


class Student(UUIDMixin, TimestampMixin, Base):
    """Student database model."""

    __tablename__ = "students"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    alternate_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(String(1000), nullable=False)
    school: Mapped[str] = mapped_column(String(255), nullable=False)
    class_name: Mapped[str] = mapped_column(String(100), nullable=False)  # class or grade
    subjects: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)  # list of subjects studied
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_fee: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    profile_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)  # URL or relative path
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True for seed/demo records

    # Relationships
    batches: Mapped[list[Batch]] = relationship(
        "Batch", secondary=student_batches, back_populates="students"
    )
    fee_records: Mapped[list[FeeRecord]] = relationship(
        "FeeRecord", back_populates="student", cascade="all, delete-orphan", order_by="desc(FeeRecord.month)"
    )
    fee_transactions: Mapped[list[FeeTransaction]] = relationship(
        "FeeTransaction", back_populates="student", cascade="all, delete-orphan", order_by="desc(FeeTransaction.date)"
    )
    payments: Mapped[list[Payment]] = relationship(
        "Payment", back_populates="student", cascade="all, delete-orphan", order_by="desc(Payment.date)"
    )
    attendance_records: Mapped[list[Attendance]] = relationship(
        "Attendance", back_populates="student", cascade="all, delete-orphan", order_by="desc(Attendance.date)"
    )
    test_scores: Mapped[list[TestScore]] = relationship(
        "TestScore", back_populates="student", cascade="all, delete-orphan", order_by="desc(TestScore.date)"
    )

    def __repr__(self) -> str:
        return f"<Student(id={self.id}, name={self.name}, class={self.class_name})>"


class Payment(UUIDMixin, TimestampMixin, Base):
    """Payment history model."""

    __tablename__ = "payments"

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    status: Mapped[str] = mapped_column(String(50), default="paid", nullable=False)  # paid, pending, failed
    method: Mapped[str] = mapped_column(String(50), default="cash", nullable=False)  # cash, upi, bank_transfer
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True for seed/demo records

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, student_id={self.student_id}, amount={self.amount})>"


class Attendance(UUIDMixin, TimestampMixin, Base):
    """Attendance model."""

    __tablename__ = "attendance"

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    batch_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # present, absent, late
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True for seed/demo records

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="attendance_records")
    batch: Mapped[Batch] = relationship("Batch", back_populates="attendance_records")

    def __repr__(self) -> str:
        return f"<Attendance(id={self.id}, student_id={self.student_id}, date={self.date}, status={self.status})>"


class TestScore(UUIDMixin, TimestampMixin, Base):
    """Test scores model."""

    __tablename__ = "test_scores"

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, nullable=False)
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True for seed/demo records

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="test_scores")

    def __repr__(self) -> str:
        return f"<TestScore(id={self.id}, student_id={self.student_id}, test={self.test_name}, marks={self.marks_obtained}/{self.max_marks})>"
