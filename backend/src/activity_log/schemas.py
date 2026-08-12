"""
Pydantic schemas for Activity Log.
"""

from datetime import datetime

from pydantic import BaseModel


class ActivityLogResponse(BaseModel):
    """Activity log entry response schema."""

    id: str
    performed_by: str
    action: str
    entity_type: str | None
    entity_id: str | None
    summary: str
    details: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogListResponse(BaseModel):
    """Paginated activity log response."""

    items: list[ActivityLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
