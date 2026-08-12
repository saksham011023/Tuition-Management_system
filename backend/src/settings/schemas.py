"""
Pydantic schemas for Settings and Teacher profile.
"""

from pydantic import BaseModel, EmailStr, Field


class TeacherProfileUpdate(BaseModel):
    """Schema to update currently logged in User details."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str | None = Field(None, min_length=6, max_length=100, description="Optional new password")
    phone: str | None = None
    profile_image: str | None = None
    signature_image: str | None = None


class SystemSettingsUpdate(BaseModel):
    """Schema for bulk updating settings via key-value dictionary."""

    settings: dict[str, str | int | float | bool | list | dict | None]


class OnboardingWizardPayload(BaseModel):
    """Schema for first time teacher setup wizard."""

    institute_name: str = Field(default="Excellence Tuition Classes", min_length=2, max_length=255)
    teacher_name: str = Field(..., min_length=2, max_length=255)
    teacher_email: EmailStr
    teacher_phone: str = Field(..., min_length=5, max_length=20)
    alternate_phone: str | None = None
    address: str = Field(..., min_length=3)
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    academic_session: str = Field(default="2026-2027")
    preferred_currency: str = Field(default="₹")
    receipt_prefix: str = Field(default="ETC")
    receipt_footer: str = Field(
        default="Thank you for choosing Excellence Tuition Classes. Keep this receipt for your records."
    )
    primary_color: str = Field(default="#4F46E5")
    secondary_color: str = Field(default="#10B981")
    institute_description: str | None = None
    institute_logo_url: str | None = None
    teacher_signature_url: str | None = None

