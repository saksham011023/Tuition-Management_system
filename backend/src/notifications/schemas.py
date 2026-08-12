"""
Pydantic schemas for Notifications and Message Templates.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Request schemas
# ──────────────────────────────────────────────

class NotificationCreate(BaseModel):
    """Schema to log a notification event."""

    student_id: str
    student_name: str
    parent_name: str
    parent_mobile: str
    notification_type: str = Field(
        ...,
        pattern="^(payment_receipt|fee_reminder|holiday|exam|attendance|performance|custom)$",
    )
    channel: str = Field(default="whatsapp", pattern="^(whatsapp|sms|email|app)$")
    status: str = Field(default="initiated", pattern="^(initiated|sent|delivered|failed)$")
    receipt_number: str | None = None
    message: str
    metadata_: dict[str, Any] | None = Field(default=None, alias="metadata")

    model_config = {"populate_by_name": True}


class NotificationStatusUpdate(BaseModel):
    """Update notification delivery status."""
    status: str = Field(..., pattern="^(initiated|sent|delivered|failed)$")


# ──────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────

class NotificationResponse(BaseModel):
    """Schema for notification response."""

    id: str
    student_id: str
    student_name: str
    parent_name: str
    parent_mobile: str
    notification_type: str
    channel: str
    status: str
    receipt_number: str | None
    message: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Paginated response for notification history."""

    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageTemplateResponse(BaseModel):
    """Schema for message template."""

    id: str
    key: str
    name: str
    template: str
    variables: list[str]
    notification_type: str
    is_active: bool

    model_config = {"from_attributes": True}


class NotificationAnalytics(BaseModel):
    """Analytics data for notification activity."""

    total_receipts_generated: int = 0
    whatsapp_shares_initiated: int = 0
    sms_sent: int = 0
    email_sent: int = 0
    pending_reminders: int = 0
    today_notifications: int = 0
