"""
Dashboard business logic service backed by real database aggregation queries.
Compatible with SQLite and PostgreSQL.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.dashboard.schemas import (
    ChartDataPoint,
    ChartDataPointDual,
    ChartSeries,
    ChartSeriesDual,
    DashboardResponse,
    DashboardStats,
    FeeReminder,
    LatestAdmission,
    NotificationItem,
    NotificationsResponse,
    RecentPayment,
    StatCardData,
)
from src.fees.models import FeeRecord, FeeTransaction
from src.students.models import Attendance, Batch, Payment, Student, TestScore


class DashboardService:
    """Computes real aggregate metrics and trends for the tuition dashboard."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────
    # Stat Cards
    # ──────────────────────────────────────────

    async def get_stats(self) -> DashboardStats:
        """Calculate and return stats metrics for all 7 dashboard cards."""
        today = date.today()
        start_of_this_month = date(today.year, today.month, 1)

        # 1. Total Active Students
        total_students_stmt = select(func.count(Student.id)).where(Student.is_active)
        total_students_res = await self.db.execute(total_students_stmt)
        total_students = total_students_res.scalar() or 0

        # Calculate student growth (joined this month vs before)
        joined_this_month_stmt = select(func.count(Student.id)).where(
            and_(Student.is_active, Student.joining_date >= start_of_this_month)
        )
        joined_this_month_res = await self.db.execute(joined_this_month_stmt)
        joined_this_month = joined_this_month_res.scalar() or 0
        base_students = max(total_students - joined_this_month, 1)
        student_change = (joined_this_month / base_students) * 100

        # 2. Active Batches
        batches_stmt = select(func.count(Batch.id))
        batches_res = await self.db.execute(batches_stmt)
        active_batches = batches_res.scalar() or 0

        # 3. Monthly Collection
        monthly_coll_stmt = select(func.sum(Payment.amount)).where(
            and_(Payment.date >= start_of_this_month, Payment.status == "paid")
        )
        monthly_coll_res = await self.db.execute(monthly_coll_stmt)
        monthly_coll = monthly_coll_res.scalar() or 0.0

        # Get monthly collection change vs last month
        last_month_year = today.year - 1 if today.month == 1 else today.year
        last_month_num = 12 if today.month == 1 else today.month - 1
        start_of_last_month = date(last_month_year, last_month_num, 1)
        prev_coll_stmt = select(func.sum(Payment.amount)).where(
            and_(
                Payment.date >= start_of_last_month,
                Payment.date < start_of_this_month,
                Payment.status == "paid",
            )
        )
        prev_coll_res = await self.db.execute(prev_coll_stmt)
        prev_coll = prev_coll_res.scalar() or 0.0
        coll_change = None
        if prev_coll > 0:
            coll_change = ((monthly_coll - prev_coll) / prev_coll) * 100

        # 4. Pending Fees
        expected_stmt = select(func.sum(Student.monthly_fee)).where(Student.is_active)
        expected_res = await self.db.execute(expected_stmt)
        expected_coll = expected_res.scalar() or 0.0
        pending_fees = max(expected_coll - monthly_coll, 0.0)

        # Calculate pending change vs last month (approximate trend)
        pending_change = None
        if expected_coll > 0:
            pending_change = -((monthly_coll / expected_coll) * 100)

        # 5. Students with Due Fees
        paid_student_ids_stmt = select(Payment.student_id).where(
            and_(Payment.date >= start_of_this_month, Payment.status == "paid")
        )
        paid_student_ids_res = await self.db.execute(paid_student_ids_stmt)
        paid_ids = [r[0] for r in paid_student_ids_res.all()]

        due_students_stmt = select(func.count(Student.id)).where(
            and_(Student.is_active, ~Student.id.in_(paid_ids))
        )
        due_students_res = await self.db.execute(due_students_stmt)
        due_students = due_students_res.scalar() or 0

        # 6. Today's Attendance
        total_att_stmt = select(func.count(Attendance.id)).where(Attendance.date == today)
        total_att_res = await self.db.execute(total_att_stmt)
        total_att = total_att_res.scalar() or 0

        present_att_stmt = select(func.count(Attendance.id)).where(
            and_(Attendance.date == today, or_(Attendance.status == "present", Attendance.status == "late"))
        )
        present_att_res = await self.db.execute(present_att_stmt)
        present_att = present_att_res.scalar() or 0

        attendance_rate = "100%"
        if total_att > 0:
            attendance_rate = f"{round((present_att / total_att) * 100)}%"

        # 7. Upcoming Tests
        upcoming_tests_stmt = select(func.count(func.distinct(TestScore.test_name))).where(
            TestScore.date >= today
        )
        upcoming_tests_res = await self.db.execute(upcoming_tests_stmt)
        upcoming_tests = upcoming_tests_res.scalar() or 0

        return DashboardStats(
            total_students=StatCardData(
                label="Total Students",
                value=str(total_students),
                change=student_change if total_students > 0 else 0.0,
                change_label="vs last month",
                icon="students",
            ),
            active_batches=StatCardData(
                label="Active Batches",
                value=str(active_batches),
                change=None,
                change_label=None,
                icon="batches",
            ),
            monthly_collection=StatCardData(
                label="Monthly Collection",
                value=f"₹{int(monthly_coll):,}",
                change=coll_change,
                change_label="vs last month" if coll_change is not None else None,
                icon="collection",
            ),
            pending_fees=StatCardData(
                label="Pending Fees",
                value=f"₹{int(pending_fees):,}",
                change=pending_change,
                change_label="collected so far",
                icon="pending",
            ),
            students_with_due_fees=StatCardData(
                label="Students with Due Fees",
                value=str(due_students),
                change=None,
                change_label="this month",
                icon="due_fees",
            ),
            todays_attendance=StatCardData(
                label="Today's Attendance",
                value=attendance_rate,
                change=None,
                change_label="recorded sessions today",
                icon="attendance",
            ),
            upcoming_tests=StatCardData(
                label="Upcoming Tests",
                value=str(upcoming_tests),
                change=None,
                change_label="active tests scheduled",
                icon="tests",
            ),
        )

    # ──────────────────────────────────────────
    # Charts
    # ──────────────────────────────────────────

    async def get_monthly_collection_chart(self) -> ChartSeries:
        """Calculate payments grouped by month for the last 12 months."""
        today = date.today()
        # Query all paid payments in the last 12 months
        start_date = date(today.year - 1, today.month, 1)
        payments_stmt = (
            select(Payment.amount, Payment.date)
            .where(and_(Payment.date >= start_date, Payment.status == "paid"))
            .order_by(Payment.date.asc())
        )
        payments_res = await self.db.execute(payments_stmt)
        payments = payments_res.all()

        # Group in Python to remain fully dialect-compatible
        monthly_map: dict[str, float] = {}
        # Prepopulate last 12 months
        for i in range(12):
            m_date = start_date + timedelta(days=i * 30.5)
            # Normalize to month name
            m_lbl = m_date.strftime("%b")
            monthly_map[m_lbl] = 0.0

        for amt, dt in payments:
            m_lbl = dt.strftime("%b")
            monthly_map[m_lbl] = monthly_map.get(m_lbl, 0.0) + amt

        data = [ChartDataPoint(label=m, value=v) for m, v in monthly_map.items()]
        return ChartSeries(title="Monthly Collection", data=data)

    async def get_student_growth_chart(self) -> ChartSeries:
        """Calculate active student counts over the past 12 months."""
        today = date.today()
        start_date = date(today.year - 1, today.month, 1)

        students_stmt = select(Student.joining_date).where(Student.is_active)
        students_res = await self.db.execute(students_stmt)
        joining_dates = [r[0] for r in students_res.all()]

        # Generate month list
        months = []
        for i in range(12):
            m_date = start_date + timedelta(days=i * 30.5)
            months.append(m_date)

        data = []
        for m_date in months:
            # Count students who joined before or during this month
            joined_count = sum(1 for d in joining_dates if d <= m_date)
            data.append(ChartDataPoint(label=m_date.strftime("%b"), value=float(joined_count)))

        return ChartSeries(title="Student Growth", data=data)

    async def get_attendance_trend_chart(self) -> ChartSeriesDual:
        """Calculate attendance rates (present/absent) daily for the last 30 days."""
        today = date.today()
        start_date = today - timedelta(days=29)

        attendance_stmt = select(Attendance.date, Attendance.status).where(
            Attendance.date >= start_date
        )
        attendance_res = await self.db.execute(attendance_stmt)
        records = attendance_res.all()

        daily_data: dict[date, dict[str, int]] = {}
        for i in range(30):
            d = start_date + timedelta(days=i)
            daily_data[d] = {"present": 0, "absent": 0, "total": 0}

        for dt, status in records:
            if dt in daily_data:
                daily_data[dt]["total"] += 1
                if status in ["present", "late"]:
                    daily_data[dt]["present"] += 1
                else:
                    daily_data[dt]["absent"] += 1

        chart_points = []
        for dt, counts in daily_data.items():
            present_pct = 100.0
            absent_pct = 0.0
            if counts["total"] > 0:
                present_pct = round((counts["present"] / counts["total"]) * 100, 1)
                absent_pct = round((counts["absent"] / counts["total"]) * 100, 1)

            chart_points.append(
                ChartDataPointDual(
                    label=dt.strftime("%d %b"),
                    value=present_pct,
                    secondary=absent_pct,
                )
            )

        return ChartSeriesDual(title="Attendance Trend", data=chart_points)

    # ──────────────────────────────────────────
    # Activity Feeds
    # ──────────────────────────────────────────

    async def get_recent_payments(self) -> list[RecentPayment]:
        """Fetch last 5 payments."""
        payments_stmt = (
            select(Payment)
            .options(selectinload(Payment.student).selectinload(Student.batches))
            .order_by(desc(Payment.date))
            .limit(5)
        )
        payments_res = await self.db.execute(payments_stmt)
        payments = payments_res.scalars().all()

        results = []
        for p in payments:
            batch_name = "Class Tuition"
            if p.student.batches:
                batch_name = p.student.batches[0].name

            results.append(
                RecentPayment(
                    id=p.id,
                    student_name=p.student.name,
                    amount=p.amount,
                    date=datetime.combine(p.date, datetime.min.time(), tzinfo=UTC),
                    batch=batch_name,
                    method=p.method,
                )
            )
        return results

    async def get_fee_reminders(self) -> list[FeeReminder]:
        """Generate reminders for students who owe fees this month."""
        today = date.today()
        start_of_this_month = date(today.year, today.month, 1)

        paid_student_ids_stmt = select(Payment.student_id).where(
            and_(Payment.date >= start_of_this_month, Payment.status == "paid")
        )
        paid_student_ids_res = await self.db.execute(paid_student_ids_stmt)
        paid_ids = [r[0] for r in paid_student_ids_res.all()]

        unpaid_students_stmt = (
            select(Student)
            .options(selectinload(Student.batches))
            .where(and_(Student.is_active, ~Student.id.in_(paid_ids)))
            .limit(5)
        )
        unpaid_students_res = await self.db.execute(unpaid_students_stmt)
        unpaid_students = unpaid_students_res.scalars().all()

        results = []
        for s in unpaid_students:
            batch_name = "Class Tuition"
            if s.batches:
                batch_name = s.batches[0].name

            # Estimate next due date to be today + 3 days or end of month
            due_date = date(today.year, today.month, 10)
            days_until_due = (due_date - today).days

            results.append(
                FeeReminder(
                    id=f"rem-{s.id}",
                    student_name=s.name,
                    amount_due=s.monthly_fee,
                    due_date=due_date,
                    batch=batch_name,
                    days_until_due=max(days_until_due, 0),
                )
            )
        return results

    async def get_latest_admissions(self) -> list[LatestAdmission]:
        """Fetch last 5 enrolled students."""
        students_stmt = (
            select(Student)
            .options(selectinload(Student.batches))
            .order_by(desc(Student.created_at))
            .limit(5)
        )
        students_res = await self.db.execute(students_stmt)
        students = students_res.scalars().all()

        results = []
        for s in students:
            batch_name = "Class Tuition"
            if s.batches:
                batch_name = s.batches[0].name

            results.append(
                LatestAdmission(
                    id=s.id,
                    student_name=s.name,
                    batch=batch_name,
                    date=s.created_at,
                    guardian_name=s.parent_name,
                    phone=s.parent_mobile,
                )
            )
        return results

    # ──────────────────────────────────────────
    # Notifications
    # ──────────────────────────────────────────

    async def get_notifications(self) -> NotificationsResponse:
        """Compute live alerts and recent activity for the notification center."""
        today = date.today()
        alerts: list[NotificationItem] = []
        activity: list[NotificationItem] = []

        # 1. Pending Fee Records — due_date <= today, balance > 0
        from sqlalchemy.orm import selectinload as _sio

        pending_stmt = (
            select(FeeRecord)
            .join(FeeRecord.student)
            .options(_sio(FeeRecord.student), _sio(FeeRecord.transactions))
            .where(FeeRecord.due_date <= today)
            .order_by(FeeRecord.due_date.asc())
            .limit(10)
        )
        pending_res = await self.db.execute(pending_stmt)
        pending_records = pending_res.scalars().unique().all()
        for rec in pending_records:
            paid = sum(t.amount for t in rec.transactions)
            balance = max(rec.net_amount - paid, 0.0)
            if balance > 0:
                student_name = rec.student.name if rec.student else "Unknown"
                overdue_days = (today - rec.due_date).days
                alerts.append(NotificationItem(
                    id=f"pending_fee_{rec.id}",
                    type="pending_fee",
                    title=f"Pending Fee — {student_name}",
                    message=f"₹{balance:,.0f} due for {rec.month}" + (f" · {overdue_days}d overdue" if overdue_days > 0 else ""),
                    icon="pending_fee",
                    color="red",
                    url=f"/dashboard/fees/student/{rec.student_id}",
                    meta={"student_id": rec.student_id, "balance": balance, "month": rec.month},
                ))

        # 2. Today's Classes — batches scheduled on today's weekday
        today_weekday = today.strftime("%A")  # e.g. "Monday"
        batches_stmt = select(Batch).options(_sio(Batch.students))
        batches_res = await self.db.execute(batches_stmt)
        all_batches = batches_res.scalars().unique().all()
        for batch in all_batches:
            days = batch.days or []
            if any(d.lower() == today_weekday.lower() for d in days):
                alerts.append(NotificationItem(
                    id=f"today_class_{batch.id}",
                    type="today_class",
                    title=f"Class Today — {batch.name}",
                    message=f"{batch.subject} · {batch.timing} · {len(batch.students)} students",
                    icon="today_class",
                    color="blue",
                    url=f"/dashboard/batches/{batch.id}",
                    meta={"batch_id": batch.id, "timing": batch.timing},
                ))

        # 3. Upcoming Tests — next 7 days
        test_window = today + timedelta(days=7)
        tests_stmt = (
            select(TestScore)
            .options(_sio(TestScore.student))
            .where(and_(TestScore.date >= today, TestScore.date <= test_window))
            .order_by(TestScore.date.asc())
            .limit(5)
        )
        tests_res = await self.db.execute(tests_stmt)
        upcoming_tests = tests_res.scalars().all()
        seen_tests: set[str] = set()
        for t in upcoming_tests:
            key = f"{t.test_name}_{t.date}"
            if key in seen_tests:
                continue
            seen_tests.add(key)
            days_left = (t.date - today).days
            alerts.append(NotificationItem(
                id=f"upcoming_test_{t.id}",
                type="upcoming_test",
                title=f"Upcoming Test — {t.test_name}",
                message=f"{t.date} · In {days_left} day{'s' if days_left != 1 else ''}",
                icon="upcoming_test",
                color="yellow",
                url="/dashboard/tests",
                meta={"test_name": t.test_name, "date": str(t.date)},
            ))

        # 4. New Admissions — last 7 days
        week_ago = today - timedelta(days=7)
        new_students_stmt = (
            select(Student)
            .options(_sio(Student.batches))
            .where(and_(Student.is_active == True, Student.joining_date >= week_ago))  # noqa: E712
            .order_by(desc(Student.joining_date))
            .limit(5)
        )
        new_students_res = await self.db.execute(new_students_stmt)
        new_students = new_students_res.scalars().unique().all()
        for s in new_students:
            batch_name = s.batches[0].name if s.batches else "No batch"
            activity.append(NotificationItem(
                id=f"new_admission_{s.id}",
                type="new_admission",
                title=f"New Admission — {s.name}",
                message=f"Class {s.class_name} · {batch_name} · Joined {s.joining_date}",
                icon="new_admission",
                color="green",
                url=f"/dashboard/students/{s.id}",
                meta={"student_id": s.id, "class_name": s.class_name},
            ))

        # 5. Recent Payments — last 24 hours
        yesterday = datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=UTC)
        recent_payments_stmt = (
            select(FeeTransaction)
            .join(FeeTransaction.student)
            .options(_sio(FeeTransaction.student))
            .where(FeeTransaction.created_at >= yesterday)
            .order_by(desc(FeeTransaction.created_at))
            .limit(5)
        )
        recent_payments_res = await self.db.execute(recent_payments_stmt)
        recent_payments = recent_payments_res.scalars().all()
        for p in recent_payments:
            student_name = p.student.name if p.student else "Unknown"
            activity.append(NotificationItem(
                id=f"payment_{p.id}",
                type="payment",
                title=f"Payment Received — {student_name}",
                message=f"₹{p.amount:,.0f} via {p.mode.replace('_', ' ').title()} · Receipt {p.receipt_number}",
                icon="payment",
                color="green",
                url=f"/dashboard/fees/student/{p.student_id}",
                timestamp=p.created_at,
                meta={"receipt": p.receipt_number, "amount": p.amount},
            ))

        total = len(alerts) + len(activity)
        # Unread count = all alerts + activity from last 24h
        unread = len(alerts) + len(recent_payments)

        return NotificationsResponse(
            total=total,
            unread_count=min(unread, 99),
            alerts=alerts[:15],
            recent_activity=activity[:10],
        )

    # ──────────────────────────────────────────
    # Combined Dashboard
    # ──────────────────────────────────────────

    async def get_dashboard(self) -> DashboardResponse:
        """Build the full aggregate database-backed dashboard response."""
        return DashboardResponse(
            stats=await self.get_stats(),
            monthly_collection_chart=await self.get_monthly_collection_chart(),
            student_growth_chart=await self.get_student_growth_chart(),
            attendance_trend_chart=await self.get_attendance_trend_chart(),
            recent_payments=await self.get_recent_payments(),
            fee_reminders=await self.get_fee_reminders(),
            latest_admissions=await self.get_latest_admissions(),
        )
