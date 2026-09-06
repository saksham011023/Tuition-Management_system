"""
Pydantic schemas for Fee records, transactions, generation, and reports.
"""

from datetime import date as datetime_date
from datetime import datetime

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# Request / Input Schemas
# ──────────────────────────────────────────────

class FeeRecordCreate(BaseModel):
    """Schema for manually creating a Fee Record."""

    student_id: str
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM")
    discount: float = Field(default=0.0, ge=0.0)
    discount_reason: str | None = Field(default=None, max_length=255)
    extra_charges: float = Field(default=0.0, ge=0.0)
    extra_charges_reason: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    due_date: datetime_date | None = None


class FeeRecordUpdate(BaseModel):
    """Schema for updating details of an existing Fee Record."""

    discount: float | None = Field(default=None, ge=0.0)
    discount_reason: str | None = Field(default=None, max_length=255)
    extra_charges: float | None = Field(default=None, ge=0.0)
    extra_charges_reason: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    due_date: datetime_date | None = None


class FeeTransactionCreate(BaseModel):
    """Schema for recording a payment transaction against a Fee Record."""

    amount: float = Field(..., gt=0.0)
    date: datetime_date = Field(default_factory=datetime_date.today)
    mode: str = Field(..., pattern="^(cash|upi|bank_transfer)$")
    transaction_id: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)


class GenerateFeesRequest(BaseModel):
    """Schema to trigger monthly fee record generation."""

    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM")
    student_ids: list[str] | None = None


# ──────────────────────────────────────────────
# Response / Output Schemas
# ──────────────────────────────────────────────

class FeeTransactionResponse(BaseModel):
    """Schema for fee transaction response."""

    id: str
    fee_record_id: str
    student_id: str
    amount: float
    date: datetime_date
    mode: str
    receipt_number: str
    transaction_id: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeeRecordResponse(BaseModel):
    """Schema for basic fee record details."""

    id: str
    student_id: str
    student_name: str | None = None
    month: str
    year: int
    month_num: int
    base_amount: float
    discount: float
    discount_reason: str | None
    extra_charges: float
    extra_charges_reason: str | None
    net_amount: float
    due_date: datetime_date
    notes: str | None
    created_at: datetime
    updated_at: datetime

    # Computed fields
    paid_amount: float = 0.0
    balance: float = 0.0
    status: str = "pending"  # "pending", "partially_paid", "paid"

    model_config = {"from_attributes": True}


class FeeRecordDetailResponse(FeeRecordResponse):
    """Full detail response including transactions list and receipt context."""

    transactions: list[FeeTransactionResponse] = []

    # Extra context for PDF receipt generation and WhatsApp notifications
    parent_name: str | None = None
    parent_mobile: str | None = None
    class_name: str | None = None
    batch_names: list[str] = []


class DailySummaryItem(BaseModel):
    """Summary for a single payment mode."""
    mode: str
    total: float
    count: int


class DailySummary(BaseModel):
    """Daily payment collection summary."""
    date: str
    total_collected: float
    receipt_count: int
    by_mode: list[DailySummaryItem]



class FeeRecordListResponse(BaseModel):
    """Paginated response for listing fee records."""

    items: list[FeeRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StudentFeeTimeline(BaseModel):
    """Timeline details of a student's outstanding fees and billing history."""

    student_id: str
    student_name: str
    monthly_fee: float
    total_expected: float
    total_paid: float
    total_outstanding: float
    records: list[FeeRecordDetailResponse]


class PendingFeeItem(BaseModel):
    """Details of a single pending or partially paid fee record."""

    id: str
    student_id: str
    student_name: str
    class_name: str
    month: str
    due_date: datetime_date
    net_amount: float
    paid_amount: float
    balance: float
    days_overdue: int
    parent_name: str | None = None
    parent_mobile: str | None = None


class ModeBreakdown(BaseModel):
    """breakdown of collection by payment mode."""

    cash: float = 0.0
    upi: float = 0.0
    bank_transfer: float = 0.0


class MonthlyCollectionReport(BaseModel):
    """Aggregated financial report for a specific billing month."""

    month: str
    total_expected: float
    total_collected: float
    total_pending: float
    collection_rate: float  # Percentage
    by_mode: ModeBreakdown


class GenerateFeesResponse(BaseModel):
    """Outcome of bulk monthly fee record generation."""

    month: str
    generated_count: int
    skipped_count: int
