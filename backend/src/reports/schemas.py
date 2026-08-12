"""
Pydantic schemas for all report types.
Supports: Fee Collection, Pending Fees, Attendance, Student Performance, Batch, Monthly Summary.
"""

from datetime import date
from enum import Enum

from pydantic import BaseModel

# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class ReportType(str, Enum):
    FEE_COLLECTION = "fee_collection"
    PENDING_FEES = "pending_fees"
    ATTENDANCE = "attendance"
    STUDENT_PERFORMANCE = "student_performance"
    BATCH = "batch"
    MONTHLY_SUMMARY = "monthly_summary"


class ExportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"


# ──────────────────────────────────────────────
# Request / Filter Schemas
# ──────────────────────────────────────────────

class DateRangeFilter(BaseModel):
    """Date range for any report query."""
    start_date: date
    end_date: date

    @classmethod
    def validate_range(cls, start: date, end: date) -> None:
        if start > end:
            raise ValueError("start_date must be before or equal to end_date")


# ──────────────────────────────────────────────
# Fee Collection Report
# ──────────────────────────────────────────────

class FeeCollectionRow(BaseModel):
    """One row in the Fee Collection report."""
    student_id: str
    student_name: str
    class_name: str
    month: str
    base_amount: float
    discount: float
    extra_charges: float
    net_amount: float
    paid_amount: float
    balance: float
    status: str  # pending | partially_paid | paid
    payment_modes: list[str]  # modes used by this student for this month
    last_payment_date: date | None


class FeeCollectionReport(BaseModel):
    """Aggregated fee collection report for a date range."""
    start_date: date
    end_date: date
    total_expected: float
    total_collected: float
    total_pending: float
    collection_rate: float
    total_students: int
    paid_count: int
    partially_paid_count: int
    pending_count: int
    by_mode: dict[str, float]  # cash | upi | bank_transfer
    rows: list[FeeCollectionRow]


# ──────────────────────────────────────────────
# Pending Fees Report
# ──────────────────────────────────────────────

class PendingFeeRow(BaseModel):
    """One row in the Pending Fees report."""
    student_id: str
    student_name: str
    class_name: str
    month: str
    net_amount: float
    paid_amount: float
    balance: float
    due_date: date
    days_overdue: int
    status: str


class PendingFeesReport(BaseModel):
    """All outstanding/partially paid fee records."""
    as_of_date: date
    total_pending_amount: float
    total_records: int
    rows: list[PendingFeeRow]


# ──────────────────────────────────────────────
# Attendance Report
# ──────────────────────────────────────────────

class AttendanceStudentRow(BaseModel):
    """Per-student attendance summary row."""
    student_id: str
    student_name: str
    class_name: str
    batch_name: str | None
    total_sessions: int
    present: int
    absent: int
    leave: int
    attendance_percentage: float


class AttendanceDailyRow(BaseModel):
    """Per-day aggregate attendance row."""
    date: date
    batch_name: str | None
    total_students: int
    present: int
    absent: int
    leave: int
    attendance_rate: float


class AttendanceReport(BaseModel):
    """Attendance report for a date range."""
    start_date: date
    end_date: date
    batch_id: str | None
    overall_rate: float
    total_sessions: int
    student_rows: list[AttendanceStudentRow]
    daily_rows: list[AttendanceDailyRow]


# ──────────────────────────────────────────────
# Student Performance Report
# ──────────────────────────────────────────────

class StudentPerformanceRow(BaseModel):
    """Per-student academic and attendance performance summary."""
    student_id: str
    student_name: str
    class_name: str
    total_tests: int
    avg_score_percentage: float
    highest_score_percentage: float
    lowest_score_percentage: float
    attendance_percentage: float
    outstanding_balance: float


class StudentPerformanceReport(BaseModel):
    """Student performance report across fee, attendance, and test data."""
    start_date: date
    end_date: date
    rows: list[StudentPerformanceRow]


# ──────────────────────────────────────────────
# Batch Report
# ──────────────────────────────────────────────

class BatchReportRow(BaseModel):
    """Summary row for a single batch."""
    batch_id: str
    batch_name: str
    subject: str
    teacher: str
    days: list[str]
    timing: str
    total_students: int
    max_students: int
    attendance_rate: float  # over the date range
    total_fee_collected: float
    total_fee_pending: float


class BatchReport(BaseModel):
    """Batch-level summary report."""
    start_date: date
    end_date: date
    rows: list[BatchReportRow]


# ──────────────────────────────────────────────
# Monthly Summary Report
# ──────────────────────────────────────────────

class MonthlySummaryRow(BaseModel):
    """One month's aggregate data."""
    month: str  # YYYY-MM
    active_students: int
    total_sessions: int
    avg_attendance_rate: float
    fees_expected: float
    fees_collected: float
    fees_pending: float
    collection_rate: float
    tests_conducted: int


class MonthlySummaryReport(BaseModel):
    """Month-by-month summary across the selected date range."""
    start_date: date
    end_date: date
    rows: list[MonthlySummaryRow]
