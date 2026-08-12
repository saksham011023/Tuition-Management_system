"""
Pydantic schemas for the global search API.
"""

from enum import Enum
from typing import Any

from pydantic import BaseModel


class SearchCategory(str, Enum):
    ALL = "all"
    STUDENTS = "students"
    BATCHES = "batches"
    FEES = "fees"
    PAYMENTS = "payments"
    ATTENDANCE = "attendance"


class SearchResult(BaseModel):
    """A single search result across any module."""

    id: str
    category: SearchCategory
    title: str           # Primary display text (e.g. student name)
    subtitle: str        # Secondary text (e.g. class, phone)
    url: str             # Frontend navigation target
    badge: str | None = None   # Extra tag shown on the right (e.g. "Paid", "Present")
    badge_color: str | None = None  # "green" | "red" | "yellow" | "blue" | "gray"
    meta: dict[str, Any] = {}


class SearchResponse(BaseModel):
    """Paginated, categorized search response."""

    query: str
    total: int
    results: list[SearchResult]
    by_category: dict[str, int] = {}  # count per category
