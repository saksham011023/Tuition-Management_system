"""
Global search API router.
GET /api/search?q=...&category=...&limit=20
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.dependencies import get_current_user, get_db
from src.search.schemas import SearchCategory, SearchResponse
from src.search.service import SearchService

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query string"),
    category: SearchCategory = Query(default=SearchCategory.ALL),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SearchResponse:
    """
    Search across students, batches, fees, payments, and attendance.
    Results are categorized and ranked by relevance.
    """
    service = SearchService(db)
    return await service.search(query=q, category=category, limit=limit)
