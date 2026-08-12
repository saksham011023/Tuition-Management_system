"""
Reports service — business logic for aggregating data into report models.
All computation lives here; no HTTP or DB interaction.
"""

from calendar import monthrange
from collections import defaultdict
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from src.reports.repository import ReportsRepository
from src.reports.schemas import (
    AttendanceDailyRow,
    AttendanceReport,
    AttendanceStudentRow,
    BatchReport,
    BatchReportRow,
    FeeCollectionReport,
    FeeCollectionRow,
    MonthlySummaryReport,
    MonthlySummaryRow,
    PendingFeeRow,
    PendingFeesReport,
    StudentPerformanceReport,
    StudentPerformanceRow,
)


def _compute_fee_status(paid: float, net: float) -> str:
    if paid <= 0:
        return "pending"
    if paid >= net:
        return "paid"
    return "partially_paid"


def _months_between(start: date, end: date) -> list[str]:
    """Return list of YYYY-MM strings covering start..end (inclusive)."""
    months = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months


class ReportsService:
    """Computes structured report data from raw repository results."""

    def __init__(self, db: AsyncSession):
        self.repo = ReportsRepository(db)

    # ──────────────────────────────────────────────────────
    # Fee Collection
    # ──────────────────────────────────────────────────────

    async def get_fee_collection_report(
        self,
        start_date: date,
        end_date: date,
        student_id: str | None = None,
    ) -> FeeCollectionReport:
        records = await self.repo.get_fee_records_in_range(start_date, end_date, student_id)

        rows: list[FeeCollectionRow] = []
        total_expected = 0.0
        total_collected = 0.0
        by_mode: dict[str, float] = {"cash": 0.0, "upi": 0.0, "bank_transfer": 0.0}
        paid_count = partially_paid_count = pending_count = 0

        for rec in records:
            paid = sum(t.amount for t in rec.transactions)
            net = rec.net_amount
            balance = max(net - paid, 0.0)
            status = _compute_fee_status(paid, net)

            modes_used = list({t.mode for t in rec.transactions})
            last_payment = max((t.date for t in rec.transactions), default=None)

            for t in rec.transactions:
                if t.mode in by_mode:
                    by_mode[t.mode] += t.amount

            total_expected += net
            total_collected += min(paid, net)

            if status == "paid":
                paid_count += 1
            elif status == "partially_paid":
                partially_paid_count += 1
            else:
                pending_count += 1

            rows.append(FeeCollectionRow(
                student_id=rec.student_id,
                student_name=rec.student.name if rec.student else "",
                class_name=rec.student.class_name if rec.student else "",
                month=rec.month,
                base_amount=rec.base_amount,
                discount=rec.discount,
                extra_charges=rec.extra_charges,
                net_amount=net,
                paid_amount=round(paid, 2),
                balance=round(balance, 2),
                status=status,
                payment_modes=modes_used,
                last_payment_date=last_payment,
            ))

        collection_rate = (total_collected / total_expected * 100) if total_expected > 0 else 0.0

        return FeeCollectionReport(
            start_date=start_date,
            end_date=end_date,
            total_expected=round(total_expected, 2),
            total_collected=round(total_collected, 2),
            total_pending=round(total_expected - total_collected, 2),
            collection_rate=round(collection_rate, 1),
            total_students=len({r.student_id for r in records}),
            paid_count=paid_count,
            partially_paid_count=partially_paid_count,
            pending_count=pending_count,
            by_mode={k: round(v, 2) for k, v in by_mode.items()},
            rows=rows,
        )

    # ──────────────────────────────────────────────────────
    # Pending Fees
    # ──────────────────────────────────────────────────────

    async def get_pending_fees_report(self, as_of: date) -> PendingFeesReport:
        records = await self.repo.get_pending_fee_records(as_of)

        rows: list[PendingFeeRow] = []
        total_pending = 0.0

        for rec in records:
            paid = sum(t.amount for t in rec.transactions)
            net = rec.net_amount
            balance = round(max(net - paid, 0.0), 2)

            if balance <= 0:
                continue  # fully paid — skip

            status = _compute_fee_status(paid, net)
            days_overdue = max((as_of - rec.due_date).days, 0)
            total_pending += balance

            rows.append(PendingFeeRow(
                student_id=rec.student_id,
                student_name=rec.student.name if rec.student else "",
                class_name=rec.student.class_name if rec.student else "",
                month=rec.month,
                net_amount=round(net, 2),
                paid_amount=round(paid, 2),
                balance=balance,
                due_date=rec.due_date,
                days_overdue=days_overdue,
                status=status,
            ))

        return PendingFeesReport(
            as_of_date=as_of,
            total_pending_amount=round(total_pending, 2),
            total_records=len(rows),
            rows=rows,
        )

    # ──────────────────────────────────────────────────────
    # Attendance
    # ──────────────────────────────────────────────────────

    async def get_attendance_report(
        self,
        start_date: date,
        end_date: date,
        batch_id: str | None = None,
    ) -> AttendanceReport:
        records = await self.repo.get_attendance_in_range(start_date, end_date, batch_id)

        # Per-student aggregation
        student_stats: dict[str, dict] = defaultdict(
            lambda: {"name": "", "class": "", "batch": None, "present": 0, "absent": 0, "leave": 0}
        )
        # Per-day aggregation
        daily_stats: dict[str, dict] = defaultdict(
            lambda: {"batch": None, "present": 0, "absent": 0, "leave": 0, "students": set()}
        )

        for att in records:
            sid = att.student_id
            day = str(att.date)
            student_stats[sid]["name"] = att.student.name if att.student else sid
            student_stats[sid]["class"] = att.student.class_name if att.student else ""
            student_stats[sid]["batch"] = att.batch.name if att.batch else None
            student_stats[sid][att.status] = student_stats[sid].get(att.status, 0) + 1
            daily_stats[day]["batch"] = att.batch.name if att.batch else None
            daily_stats[day][att.status] = daily_stats[day].get(att.status, 0) + 1
            daily_stats[day]["students"].add(sid)

        student_rows: list[AttendanceStudentRow] = []
        total_present = total_sessions = 0

        for sid, s in student_stats.items():
            p, a, l = s.get("present", 0), s.get("absent", 0), s.get("leave", 0)
            sess = p + a + l
            rate = round(p / sess * 100, 1) if sess > 0 else 100.0
            total_present += p
            total_sessions += sess
            student_rows.append(AttendanceStudentRow(
                student_id=sid,
                student_name=s["name"],
                class_name=s["class"],
                batch_name=s["batch"],
                total_sessions=sess,
                present=p,
                absent=a,
                leave=l,
                attendance_percentage=rate,
            ))

        daily_rows: list[AttendanceDailyRow] = []
        for day_str, d in sorted(daily_stats.items()):
            p, a, l = d.get("present", 0), d.get("absent", 0), d.get("leave", 0)
            total = p + a + l
            rate = round(p / total * 100, 1) if total > 0 else 0.0
            daily_rows.append(AttendanceDailyRow(
                date=date.fromisoformat(day_str),
                batch_name=d["batch"],
                total_students=len(d["students"]),
                present=p,
                absent=a,
                leave=l,
                attendance_rate=rate,
            ))

        overall_rate = round(total_present / total_sessions * 100, 1) if total_sessions > 0 else 100.0

        return AttendanceReport(
            start_date=start_date,
            end_date=end_date,
            batch_id=batch_id,
            overall_rate=overall_rate,
            total_sessions=total_sessions,
            student_rows=sorted(student_rows, key=lambda r: r.student_name),
            daily_rows=daily_rows,
        )

    # ──────────────────────────────────────────────────────
    # Student Performance
    # ──────────────────────────────────────────────────────

    async def get_student_performance_report(
        self,
        start_date: date,
        end_date: date,
    ) -> StudentPerformanceReport:
        students = await self.repo.get_all_active_students_with_relations()
        scores = await self.repo.get_test_scores_in_range(start_date, end_date)
        attendance = await self.repo.get_attendance_in_range(start_date, end_date)
        fee_records = await self.repo.get_fee_records_in_range(start_date, end_date)

        # Build lookup maps
        scores_by_student: dict[str, list] = defaultdict(list)
        for s in scores:
            scores_by_student[s.student_id].append(s)

        att_by_student: dict[str, list] = defaultdict(list)
        for a in attendance:
            att_by_student[a.student_id].append(a)

        balance_by_student: dict[str, float] = defaultdict(float)
        for rec in fee_records:
            paid = sum(t.amount for t in rec.transactions)
            balance_by_student[rec.student_id] += max(rec.net_amount - paid, 0.0)

        rows: list[StudentPerformanceRow] = []

        for stu in students:
            sid = stu.id
            test_list = scores_by_student[sid]
            att_list = att_by_student[sid]

            if test_list:
                pcts = [s.marks_obtained / s.max_marks * 100 for s in test_list if s.max_marks > 0]
                avg_pct = round(sum(pcts) / len(pcts), 1)
                highest = round(max(pcts), 1)
                lowest = round(min(pcts), 1)
            else:
                avg_pct = highest = lowest = 0.0

            present = sum(1 for a in att_list if a.status == "present")
            total_sess = len(att_list)
            att_rate = round(present / total_sess * 100, 1) if total_sess > 0 else 100.0

            rows.append(StudentPerformanceRow(
                student_id=sid,
                student_name=stu.name,
                class_name=stu.class_name,
                total_tests=len(test_list),
                avg_score_percentage=avg_pct,
                highest_score_percentage=highest,
                lowest_score_percentage=lowest,
                attendance_percentage=att_rate,
                outstanding_balance=round(balance_by_student[sid], 2),
            ))

        return StudentPerformanceReport(
            start_date=start_date,
            end_date=end_date,
            rows=sorted(rows, key=lambda r: r.student_name),
        )

    # ──────────────────────────────────────────────────────
    # Batch Report
    # ──────────────────────────────────────────────────────

    async def get_batch_report(self, start_date: date, end_date: date) -> BatchReport:
        batches = await self.repo.get_all_batches_with_students()
        attendance = await self.repo.get_attendance_in_range(start_date, end_date)
        fee_records = await self.repo.get_fee_records_in_range(start_date, end_date)

        # Attendance stats per batch
        att_by_batch: dict[str, dict] = defaultdict(lambda: {"present": 0, "total": 0})
        for att in attendance:
            bid = att.batch_id or "none"
            att_by_batch[bid]["total"] += 1
            if att.status == "present":
                att_by_batch[bid]["present"] += 1

        # Fee per student — aggregate to batches via student->batch
        fee_by_student: dict[str, dict] = {}
        for rec in fee_records:
            sid = rec.student_id
            paid = sum(t.amount for t in rec.transactions)
            if sid not in fee_by_student:
                fee_by_student[sid] = {"collected": 0.0, "pending": 0.0}
            fee_by_student[sid]["collected"] += min(paid, rec.net_amount)
            fee_by_student[sid]["pending"] += max(rec.net_amount - paid, 0.0)

        rows: list[BatchReportRow] = []
        for batch in batches:
            bid = batch.id
            att_data = att_by_batch.get(bid, {"present": 0, "total": 0})
            att_rate = round(att_data["present"] / att_data["total"] * 100, 1) if att_data["total"] > 0 else 0.0

            student_ids = {s.id for s in batch.students}
            collected = sum(fee_by_student.get(sid, {}).get("collected", 0) for sid in student_ids)
            pending = sum(fee_by_student.get(sid, {}).get("pending", 0) for sid in student_ids)

            rows.append(BatchReportRow(
                batch_id=bid,
                batch_name=batch.name,
                subject=batch.subject,
                teacher=batch.teacher,
                days=batch.days or [],
                timing=batch.timing,
                total_students=len(student_ids),
                max_students=batch.max_students,
                attendance_rate=att_rate,
                total_fee_collected=round(collected, 2),
                total_fee_pending=round(pending, 2),
            ))

        return BatchReport(
            start_date=start_date,
            end_date=end_date,
            rows=rows,
        )

    # ──────────────────────────────────────────────────────
    # Monthly Summary
    # ──────────────────────────────────────────────────────

    async def get_monthly_summary_report(
        self,
        start_date: date,
        end_date: date,
    ) -> MonthlySummaryReport:
        months = _months_between(start_date, end_date)
        all_attendance = await self.repo.get_attendance_in_range(start_date, end_date)
        all_fees = await self.repo.get_fee_records_in_range(start_date, end_date)
        all_scores = await self.repo.get_test_scores_in_range(start_date, end_date)

        # Bucket attendance by month
        att_by_month: dict[str, dict] = defaultdict(lambda: {"present": 0, "total": 0})
        for att in all_attendance:
            m = att.date.strftime("%Y-%m")
            att_by_month[m]["total"] += 1
            if att.status == "present":
                att_by_month[m]["present"] += 1

        # Bucket fees by month
        fees_by_month: dict[str, dict] = defaultdict(lambda: {"expected": 0.0, "collected": 0.0})
        for rec in all_fees:
            paid = sum(t.amount for t in rec.transactions)
            m = rec.month
            fees_by_month[m]["expected"] += rec.net_amount
            fees_by_month[m]["collected"] += min(paid, rec.net_amount)

        # Bucket tests by month
        tests_by_month: dict[str, int] = defaultdict(int)
        for score in all_scores:
            m = score.date.strftime("%Y-%m")
            tests_by_month[m] += 1

        rows: list[MonthlySummaryRow] = []
        for m in months:
            year, mon = int(m[:4]), int(m[5:7])
            _, last_day = monthrange(year, mon)
            date(year, mon, 1)
            date(year, mon, last_day)

            active = await self.repo.get_active_student_count_by_month(m)
            att_data = att_by_month.get(m, {"present": 0, "total": 0})
            att_rate = round(att_data["present"] / att_data["total"] * 100, 1) if att_data["total"] > 0 else 0.0
            fee_data = fees_by_month.get(m, {"expected": 0.0, "collected": 0.0})
            expected = fee_data["expected"]
            collected = fee_data["collected"]
            coll_rate = round(collected / expected * 100, 1) if expected > 0 else 0.0

            rows.append(MonthlySummaryRow(
                month=m,
                active_students=active,
                total_sessions=att_data["total"],
                avg_attendance_rate=att_rate,
                fees_expected=round(expected, 2),
                fees_collected=round(collected, 2),
                fees_pending=round(max(expected - collected, 0.0), 2),
                collection_rate=coll_rate,
                tests_conducted=tests_by_month.get(m, 0),
            ))

        return MonthlySummaryReport(
            start_date=start_date,
            end_date=end_date,
            rows=rows,
        )
