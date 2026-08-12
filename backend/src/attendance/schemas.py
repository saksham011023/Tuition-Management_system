"""
Pydantic validation schemas for Attendance management.
"""

from datetime import date as datetime_date
from datetime import datetime

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# Request / Input Schemas
# ──────────────────────────────────────────────

class AttendanceMark(BaseModel):
    """Schema for marking a single student's attendance."""

    student_id: str
    status: str = Field(..., pattern="^(present|absent|leave)$")
    remarks: str | None = Field(default=None, max_length=500)


class BatchAttendanceSubmit(BaseModel):
    """Schema to submit or update an entire batch attendance sheet for a date."""

    batch_id: str
    date: datetime_date
    records: list[AttendanceMark]


# ──────────────────────────────────────────────
# Response / Output Schemas
# ──────────────────────────────────────────────

class AttendanceResponse(BaseModel):
    """Details of a single marked attendance record."""

    id: str
    student_id: str
    student_name: str | None = None
    batch_id: str | None = None
    date: datetime_date
    status: str
    remarks: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BatchAttendanceReport(BaseModel):
    """Aggregated attendance sheet session details for a batch on a specific date."""

    batch_id: str
    batch_name: str
    date: datetime_date
    present_count: int
    absent_count: int
    leave_count: int
    total_students: int
    attendance_rate: float  # Percentage
    records: list[AttendanceResponse]


class StudentAttendanceStats(BaseModel):
    """Summary metrics of a student's billing attendance rate."""

    student_id: str
    student_name: str
    present_count: int
    absent_count: int
    leave_count: int
    total_sessions: int
    attendance_percentage: float  # Percentage


class AttendanceSummaryItem(BaseModel):
    """Aggregated stats breakdown for daily, weekly, or monthly reports."""

    label: str  # e.g., "12 Jul", "Week 28", "Jul 2026"
    present_count: int = 0
    absent_count: int = 0
    leave_count: int = 0
    attendance_rate: float = 0.0


class AttendanceTrends(BaseModel):
    """A collection of summary metrics over a timeline."""

    view: str  # "daily" | "weekly" | "monthly"
    items: list[AttendanceSummaryItem]
