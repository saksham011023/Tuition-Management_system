"""
Pydantic schemas for Student and Batch request/response validation.
"""

from datetime import date, datetime

from pydantic import BaseModel, Field

from src.batches.schemas import BatchResponse

# ──────────────────────────────────────────────
# Child relation schemas
# ──────────────────────────────────────────────

class PaymentCreate(BaseModel):
    """Create payment schema."""
    amount: float = Field(..., gt=0)
    date: date
    status: str = "paid"
    method: str = "cash"
    remarks: str | None = None


class PaymentResponse(BaseModel):
    """Payment response schema."""
    id: str
    student_id: str
    amount: float
    date: date
    status: str
    method: str
    remarks: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceCreate(BaseModel):
    """Create attendance schema."""
    date: date
    status: str  # present, absent, late
    remarks: str | None = None


class AttendanceResponse(BaseModel):
    """Attendance response schema."""
    id: str
    student_id: str
    date: date
    status: str
    remarks: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TestScoreCreate(BaseModel):
    """Create test score schema."""
    test_name: str = Field(..., min_length=1)
    date: date
    max_marks: float = Field(..., gt=0)
    marks_obtained: float = Field(..., ge=0)
    remarks: str | None = None


class TestScoreResponse(BaseModel):
    """Test score response schema."""
    id: str
    student_id: str
    test_name: str
    date: date
    max_marks: float
    marks_obtained: float
    remarks: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Student Schemas
# ──────────────────────────────────────────────

class StudentCreate(BaseModel):
    """Student creation schema."""
    name: str = Field(..., min_length=2, max_length=255)
    parent_name: str = Field(..., min_length=2, max_length=255)
    parent_mobile: str = Field(..., min_length=10, max_length=20)
    alternate_mobile: str | None = Field(None, max_length=20)
    address: str = Field(..., min_length=5, max_length=1000)
    school: str = Field(..., min_length=2, max_length=255)
    class_name: str = Field(..., min_length=1, max_length=100)
    subjects: list[str] = Field(default_factory=list)
    joining_date: date
    monthly_fee: float = Field(..., ge=0)
    notes: str | None = Field(None, max_length=2000)
    profile_image: str | None = Field(None, max_length=1000)
    batch_ids: list[str] = Field(default_factory=list)  # Associated batch IDs during creation


class StudentUpdate(BaseModel):
    """Student update schema."""
    name: str | None = Field(None, min_length=2, max_length=255)
    parent_name: str | None = Field(None, min_length=2, max_length=255)
    parent_mobile: str | None = Field(None, min_length=10, max_length=20)
    alternate_mobile: str | None = Field(None, max_length=20)
    address: str | None = Field(None, min_length=5, max_length=1000)
    school: str | None = Field(None, min_length=2, max_length=255)
    class_name: str | None = Field(None, min_length=1, max_length=100)
    subjects: list[str] | None = None
    joining_date: date | None = None
    monthly_fee: float | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=2000)
    profile_image: str | None = Field(None, max_length=1000)
    is_active: bool | None = None
    batch_ids: list[str] | None = None  # Full override of associated batch IDs


class StudentResponse(BaseModel):
    """Basic student details in list views."""
    id: str
    name: str
    parent_name: str
    parent_mobile: str
    alternate_mobile: str | None
    class_name: str
    subjects: list[str]
    joining_date: date
    monthly_fee: float
    is_active: bool
    is_demo: bool
    batches: list[BatchResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudentDetailResponse(StudentResponse):
    """Full student details including relations for profile page."""
    address: str
    school: str
    notes: str | None
    profile_image: str | None
    payments: list[PaymentResponse] = []
    attendance_records: list[AttendanceResponse] = []
    test_scores: list[TestScoreResponse] = []

    model_config = {"from_attributes": True}


class StudentListResponse(BaseModel):
    """Paginated list of students."""
    items: list[StudentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ──────────────────────────────────────────────
# Duplicate Detection Schemas
# ──────────────────────────────────────────────

class DuplicateCheckRequest(BaseModel):
    """Request body for duplicate student check."""
    name: str
    class_name: str
    parent_mobile: str
    exclude_id: str | None = None  # exclude current student when editing


class DuplicateCheckResponse(BaseModel):
    """Response containing potential duplicate students."""
    has_duplicates: bool
    duplicates: list[StudentResponse]
