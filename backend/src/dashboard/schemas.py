"""
Pydantic schemas for dashboard API responses.
"""

from datetime import date, datetime

from pydantic import BaseModel

# ──────────────────────────────────────────────
# Stat Cards
# ──────────────────────────────────────────────

class StatCardData(BaseModel):
    """A single dashboard stat card."""
    label: str
    value: str
    change: float | None = None        # percentage change vs previous period
    change_label: str | None = None    # e.g. "vs last month"
    icon: str                          # icon identifier for frontend


class DashboardStats(BaseModel):
    """All 7 stat cards."""
    total_students: StatCardData
    active_batches: StatCardData
    monthly_collection: StatCardData
    pending_fees: StatCardData
    students_with_due_fees: StatCardData
    todays_attendance: StatCardData
    upcoming_tests: StatCardData


# ──────────────────────────────────────────────
# Chart Data
# ──────────────────────────────────────────────

class ChartDataPoint(BaseModel):
    """Single point on a chart."""
    label: str       # x-axis label (e.g. "Jan", "Feb", or a date)
    value: float     # primary y-axis value


class ChartDataPointDual(BaseModel):
    """Chart point with two y-values (e.g. present + absent)."""
    label: str
    value: float
    secondary: float | None = None


class ChartSeries(BaseModel):
    """A chart with a title and data points."""
    title: str
    data: list[ChartDataPoint]


class ChartSeriesDual(BaseModel):
    """A chart with dual data series."""
    title: str
    data: list[ChartDataPointDual]


# ──────────────────────────────────────────────
# Activity Feeds
# ──────────────────────────────────────────────

class RecentPayment(BaseModel):
    """A recent payment entry."""
    id: str
    student_name: str
    amount: float
    date: datetime
    batch: str
    method: str       # "cash", "upi", "bank_transfer"


class FeeReminder(BaseModel):
    """An upcoming fee reminder."""
    id: str
    student_name: str
    amount_due: float
    due_date: date
    batch: str
    days_until_due: int


class LatestAdmission(BaseModel):
    """A recent admission entry."""
    id: str
    student_name: str
    batch: str
    date: datetime
    guardian_name: str
    phone: str


# ──────────────────────────────────────────────
# Combined Response
# ──────────────────────────────────────────────

class DashboardResponse(BaseModel):
    """Full dashboard payload."""
    stats: DashboardStats
    monthly_collection_chart: ChartSeries
    student_growth_chart: ChartSeries
    attendance_trend_chart: ChartSeriesDual
    recent_payments: list[RecentPayment]
    fee_reminders: list[FeeReminder]
    latest_admissions: list[LatestAdmission]


# ──────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────

class NotificationItem(BaseModel):
    """A single notification or alert item."""
    id: str
    type: str          # "pending_fee" | "today_class" | "upcoming_test" | "new_admission" | "payment"
    title: str
    message: str
    icon: str          # icon identifier for frontend
    color: str         # "red" | "green" | "yellow" | "blue" | "purple"
    url: str | None = None    # navigation target
    timestamp: datetime | None = None
    meta: dict = {}


class NotificationsResponse(BaseModel):
    """Full notifications payload for the notification center."""
    total: int
    unread_count: int
    alerts: list[NotificationItem]        # Pending fees, upcoming tests, today's classes
    recent_activity: list[NotificationItem]  # New admissions, payments received

