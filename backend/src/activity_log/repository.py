"""
Activity Log repository — handles DB access for ActivityLog records.
"""

from collections.abc import Sequence

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.activity_log.models import ActivityLog


class ActivityLogRepository:
    """Data access layer for ActivityLog."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        action: str,
        summary: str,
        *,
        performed_by: str = "system",
        entity_type: str | None = None,
        entity_id: str | None = None,
        details: dict | None = None,
    ) -> ActivityLog:
        """Insert a new activity log entry and flush to the DB."""
        entry = ActivityLog(
            action=action,
            summary=summary,
            performed_by=performed_by,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def list_logs(
        self,
        page: int = 1,
        page_size: int = 20,
        action_filter: str | None = None,
        entity_type_filter: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[ActivityLog], int]:
        """Return paginated activity log entries, newest first."""
        query = select(ActivityLog)

        if action_filter:
            query = query.where(ActivityLog.action == action_filter)
        if entity_type_filter:
            query = query.where(ActivityLog.entity_type == entity_type_filter)
        if search:
            q = f"%{search.strip()}%"
            query = query.where(
                or_(
                    ActivityLog.summary.ilike(q),
                    ActivityLog.action.ilike(q),
                    ActivityLog.performed_by.ilike(q),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        query = query.order_by(desc(ActivityLog.created_at))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        return result.scalars().all(), total
