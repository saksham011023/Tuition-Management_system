"""
Search service — aggregates raw results, maps them to SearchResult,
merges categories, and computes per-category counts.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from src.search.repository import SearchRepository
from src.search.schemas import SearchCategory, SearchResponse, SearchResult


def _fee_status(paid: float, net: float) -> tuple[str, str]:
    """Compute display badge and color for a fee record."""
    if paid <= 0:
        return "Pending", "red"
    if paid >= net:
        return "Paid", "green"
    return "Partial", "yellow"


class SearchService:
    """Merges cross-module search results into a ranked, categorised response."""

    PER_CATEGORY_LIMIT = 8

    def __init__(self, db: AsyncSession):
        self.repo = SearchRepository(db)

    async def search(
        self,
        query: str,
        category: SearchCategory = SearchCategory.ALL,
        limit: int = 20,
    ) -> SearchResponse:
        """Run cross-module search and return merged, ranked results."""
        results: list[SearchResult] = []
        per_cat = self.PER_CATEGORY_LIMIT
        q = query.strip()

        # ── Students ─────────────────────────────────────────────────
        if category in (SearchCategory.ALL, SearchCategory.STUDENTS):
            students = await self.repo.search_students(q, limit=per_cat)
            for s in students:
                batch_names = ", ".join(b.name for b in s.batches[:2]) if s.batches else "No batch"
                results.append(SearchResult(
                    id=s.id,
                    category=SearchCategory.STUDENTS,
                    title=s.name,
                    subtitle=f"Class {s.class_name} · {s.parent_mobile} · {batch_names}",
                    url=f"/dashboard/students/{s.id}",
                    meta={
                        "class_name": s.class_name,
                        "school": s.school,
                        "parent": s.parent_name,
                        "phone": s.parent_mobile,
                    },
                ))

        # ── Batches ──────────────────────────────────────────────────
        if category in (SearchCategory.ALL, SearchCategory.BATCHES):
            batches = await self.repo.search_batches(q, limit=per_cat)
            for b in batches:
                days_str = ", ".join(b.days[:3]) if b.days else ""
                results.append(SearchResult(
                    id=b.id,
                    category=SearchCategory.BATCHES,
                    title=b.name,
                    subtitle=f"{b.subject} · {b.teacher} · {days_str}",
                    url=f"/dashboard/batches/{b.id}",
                    meta={"subject": b.subject, "teacher": b.teacher},
                ))

        # ── Fee Transactions (Payments / Receipts) ───────────────────
        if category in (SearchCategory.ALL, SearchCategory.PAYMENTS):
            transactions = await self.repo.search_fee_transactions(q, limit=per_cat)
            for t in transactions:
                student_name = t.student.name if t.student else "Unknown"
                results.append(SearchResult(
                    id=t.id,
                    category=SearchCategory.PAYMENTS,
                    title=f"Receipt {t.receipt_number}",
                    subtitle=f"{student_name} · ₹{t.amount:,.0f} · {t.mode.replace('_', ' ').title()} · {t.date}",
                    url=f"/dashboard/fees/student/{t.student_id}",
                    badge="Paid",
                    badge_color="green",
                    meta={
                        "receipt": t.receipt_number,
                        "amount": t.amount,
                        "mode": t.mode,
                        "date": str(t.date),
                    },
                ))

        # ── Fee Records ───────────────────────────────────────────────
        if category in (SearchCategory.ALL, SearchCategory.FEES):
            fee_records = await self.repo.search_fee_records(q, limit=per_cat)
            for rec in fee_records:
                student_name = rec.student.name if rec.student else "Unknown"
                paid = sum(t.amount for t in rec.transactions)
                badge_label, badge_color = _fee_status(paid, rec.net_amount)
                results.append(SearchResult(
                    id=rec.id,
                    category=SearchCategory.FEES,
                    title=f"{student_name} — {rec.month}",
                    subtitle=f"₹{rec.net_amount:,.0f} due · ₹{paid:,.0f} paid · Balance ₹{max(rec.net_amount - paid, 0):,.0f}",
                    url=f"/dashboard/fees/student/{rec.student_id}",
                    badge=badge_label,
                    badge_color=badge_color,
                    meta={"month": rec.month, "net_amount": rec.net_amount, "paid": paid},
                ))

        # ── Attendance ────────────────────────────────────────────────
        if category in (SearchCategory.ALL, SearchCategory.ATTENDANCE):
            attendance = await self.repo.search_attendance(q, limit=per_cat)
            for att in attendance:
                student_name = att.student.name if att.student else "Unknown"
                batch_name = att.batch.name if att.batch else "—"
                status_colors = {"present": "green", "absent": "red", "leave": "yellow"}
                results.append(SearchResult(
                    id=att.id,
                    category=SearchCategory.ATTENDANCE,
                    title=f"{student_name}",
                    subtitle=f"{att.date} · {batch_name} · {att.remarks or ''}".rstrip(" ·"),
                    url=f"/dashboard/attendance?student_id={att.student_id}",
                    badge=att.status.title(),
                    badge_color=status_colors.get(att.status, "gray"),
                    meta={"date": str(att.date), "status": att.status},
                ))

        # ── Sort: students first, then others, keeping relative ordering ──
        priority = {
            SearchCategory.STUDENTS: 0,
            SearchCategory.BATCHES: 1,
            SearchCategory.FEES: 2,
            SearchCategory.PAYMENTS: 3,
            SearchCategory.ATTENDANCE: 4,
        }
        results.sort(key=lambda r: priority.get(r.category, 99))

        # ── Per-category counts ───────────────────────────────────────
        by_category: dict[str, int] = {}
        for r in results:
            by_category[r.category.value] = by_category.get(r.category.value, 0) + 1

        # Apply overall limit
        results = results[:limit]

        return SearchResponse(
            query=q,
            total=sum(by_category.values()),
            results=results,
            by_category=by_category,
        )
