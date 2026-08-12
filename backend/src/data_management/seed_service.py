"""
SeedService — generates realistic demo data for development & testing.
ONLY to be called when APP_ENV=development.
"""

from __future__ import annotations

import random
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.students.models import Attendance, Batch, Payment, Student, TestScore


# ──────────────────────────────────────────────────────
# Demo data constants — realistic Indian student names
# ──────────────────────────────────────────────────────

STUDENT_NAMES = [
    "Rahul Sharma", "Priya Patel", "Aarav Shah", "Riya Verma",
    "Arjun Singh", "Sneha Gupta", "Rohan Mehta", "Pooja Nair",
    "Vikram Joshi", "Ananya Reddy", "Karan Malhotra", "Divya Iyer",
    "Siddharth Kapoor", "Neha Agarwal", "Amit Kumar", "Shweta Mishra",
    "Rajesh Yadav", "Kavya Pillai", "Tushar Bhatt", "Muskan Saxena",
    "Harsh Pandey", "Shreya Chatterjee", "Nikhil Desai", "Ankita Roy",
    "Dev Choudhary", "Ritika Bansal", "Gaurav Tiwari", "Swati Dubey",
    "Manish Srivastava", "Preeti Ghosh", "Varun Patil", "Deepa Bose",
    "Ayaan Khan", "Shivani Jain", "Rohit Bajaj", "Pallavi Kulkarni",
    "Sunny Arora", "Megha Sharma", "Vivek Naidu", "Prachi Chopra",
    "Sameer Goyal", "Ishaan Tomar", "Yash Mehrotra", "Tanvi Soni",
    "Akash Tripathi", "Ruchi Bajpai", "Kunal Aggarwal", "Meera Nambiar",
    "Puneet Grover", "Nisha Varma",
]

PARENT_FIRST_NAMES = [
    "Suresh", "Ramesh", "Mahesh", "Rajesh", "Dinesh",
    "Kamlesh", "Mukesh", "Yogesh", "Naresh", "Ganesh",
    "Sunita", "Anita", "Kavita", "Geeta", "Sita",
    "Rita", "Neeta", "Seema", "Reema", "Meena",
]

SCHOOLS = [
    "Delhi Public School",
    "Kendriya Vidyalaya",
    "Ryan International School",
    "Bal Bharati Public School",
    "St. Mary's Convent School",
    "Vidya Niketan School",
    "Modern School",
    "Springdales School",
    "DAV Public School",
    "Holy Child School",
]

CLASSES = ["6", "7", "8", "9", "10", "11 (Science)", "11 (Commerce)", "12 (Science)", "12 (Commerce)"]

SUBJECTS_MAP = {
    "6": ["Mathematics", "Science", "English"],
    "7": ["Mathematics", "Science", "English"],
    "8": ["Mathematics", "Science", "English", "Social Studies"],
    "9": ["Mathematics", "Science", "English", "Social Studies", "Hindi"],
    "10": ["Mathematics", "Science", "English", "Social Studies", "Hindi"],
    "11 (Science)": ["Physics", "Chemistry", "Mathematics", "Biology"],
    "11 (Commerce)": ["Accountancy", "Business Studies", "Economics", "Mathematics"],
    "12 (Science)": ["Physics", "Chemistry", "Mathematics", "Biology"],
    "12 (Commerce)": ["Accountancy", "Business Studies", "Economics", "Mathematics"],
}

TEST_NAMES = [
    "Unit Test 1", "Unit Test 2", "Mid-Term Exam", "Unit Test 3", "Final Exam",
    "Chapter Test", "Weekly Quiz", "Practice Test",
]

ADDRESSES = [
    "12/A, Sector 15, Noida",
    "Block B, Flat 203, Rohini",
    "45, Rajpur Road, Dehradun",
    "C-7, Vasant Kunj, New Delhi",
    "8, Nehru Nagar, Ghaziabad",
    "Plot 22, DLF Phase 2, Gurugram",
    "House No. 5, Pitampura",
    "A-102, Saket, New Delhi",
    "72, Lajpat Nagar III",
    "9/12, Civil Lines, Faridabad",
]

PAYMENT_METHODS = ["cash", "upi", "bank_transfer"]
ATTENDANCE_STATUSES = ["present", "present", "present", "present", "absent", "late"]


class SeedService:
    """Generates and removes demo data for development purposes only."""

    async def seed_all(self, db: AsyncSession, performed_by: str = "system") -> dict:
        """Populate the database with realistic demo data."""
        # 1. Ensure we have demo batches beyond the 2 defaults
        batches = await self._ensure_demo_batches(db)

        # 2. Create 40 demo students
        students = await self._create_demo_students(db, batches)

        # 3. Add payment history for each student (2–6 months)
        payment_count = await self._create_demo_payments(db, students)

        # 4. Add attendance records (last 30 days)
        attendance_count = await self._create_demo_attendance(db, students, batches)

        # 5. Add test scores (2–4 per student)
        test_count = await self._create_demo_test_scores(db, students)

        await db.flush()

        # 6. Log the action
        try:
            from src.activity_log.repository import ActivityLogRepository
            log_repo = ActivityLogRepository(db)
            counts = {
                "students": len(students),
                "payments": payment_count,
                "attendance": attendance_count,
                "test_scores": test_count,
            }
            await log_repo.log(
                action="demo_seeded",
                summary=f"Generated demo data: {len(students)} students",
                performed_by=performed_by,
                entity_type="System",
                details=counts,
            )
        except Exception:
            pass

        return {
            "students": len(students),
            "batches": len(batches),
            "payments": payment_count,
            "attendance": attendance_count,
            "test_scores": test_count,
        }

    async def clear_demo_data(self, db: AsyncSession, performed_by: str = "system") -> dict:
        """Remove all records tagged with is_demo=True."""
        from sqlalchemy import delete

        # Delete demo students (cascades to payments, attendance, test_scores)
        result = await db.execute(
            delete(Student).where(Student.is_demo == True)  # noqa: E712
        )
        student_count = result.rowcount

        await db.flush()

        deleted = {"students": student_count}

        # Log
        try:
            from src.activity_log.repository import ActivityLogRepository
            log_repo = ActivityLogRepository(db)
            await log_repo.log(
                action="demo_cleared",
                summary=f"Cleared demo data: {student_count} students removed",
                performed_by=performed_by,
                entity_type="System",
                details=deleted,
            )
        except Exception:
            pass

        return deleted

    # ──────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────

    async def _ensure_demo_batches(self, db: AsyncSession) -> list[Batch]:
        """Return all existing batches (they are already seeded at startup)."""
        result = await db.execute(select(Batch))
        return list(result.scalars().all())

    async def _create_demo_students(self, db: AsyncSession, batches: list[Batch]) -> list[Student]:
        """Create 40 demo students spread across classes and batches."""
        students: list[Student] = []

        for i, full_name in enumerate(STUDENT_NAMES[:40]):
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            class_name = random.choice(CLASSES)
            subjects = SUBJECTS_MAP.get(class_name, ["Mathematics", "Science"])

            # Generate parent name
            parent_first = random.choice(PARENT_FIRST_NAMES)
            parent_name = f"{parent_first} {last_name}"

            # Generate unique phone
            phone = f"9{random.randint(100000000, 999999999)}"

            # Joining date: random within last 18 months
            days_ago = random.randint(30, 540)
            joining_date = date.today() - timedelta(days=days_ago)

            # Monthly fee based on class
            if class_name.startswith("12") or class_name.startswith("11"):
                fee = random.choice([2500.0, 3000.0, 3500.0, 4000.0])
            elif class_name in ("9", "10"):
                fee = random.choice([1500.0, 2000.0, 2500.0])
            else:
                fee = random.choice([1000.0, 1200.0, 1500.0])

            student = Student(
                name=full_name,
                parent_name=parent_name,
                parent_mobile=phone,
                alternate_mobile=f"8{random.randint(100000000, 999999999)}" if random.random() > 0.5 else None,
                address=random.choice(ADDRESSES),
                school=random.choice(SCHOOLS),
                class_name=class_name,
                subjects=subjects,
                joining_date=joining_date,
                monthly_fee=fee,
                notes=f"Demo student. Enrolled in {class_name}." if random.random() > 0.5 else None,
                is_active=random.random() > 0.1,  # ~10% inactive
                is_demo=True,
            )

            # Assign to 1 or 2 batches randomly
            if batches:
                assigned = random.sample(batches, min(random.randint(1, 2), len(batches)))
                student.batches = assigned

            db.add(student)
            students.append(student)

        await db.flush()
        return students

    async def _create_demo_payments(self, db: AsyncSession, students: list[Student]) -> int:
        """Add 2–6 months of payment history per student."""
        count = 0
        today = date.today()

        for student in students:
            num_payments = random.randint(2, 6)
            for m in range(num_payments):
                pay_date = date(today.year, today.month, random.randint(1, 28))
                # Step back months
                month_offset = m
                pay_month = pay_date.month - month_offset
                pay_year = pay_date.year
                while pay_month <= 0:
                    pay_month += 12
                    pay_year -= 1
                actual_date = date(pay_year, pay_month, random.randint(1, 28))

                payment = Payment(
                    student_id=student.id,
                    amount=student.monthly_fee,
                    date=actual_date,
                    status="paid",
                    method=random.choice(PAYMENT_METHODS),
                    remarks=f"Monthly fee for {actual_date.strftime('%B %Y')}",
                    is_demo=True,
                )
                db.add(payment)
                count += 1

        await db.flush()
        return count

    async def _create_demo_attendance(
        self, db: AsyncSession, students: list[Student], batches: list[Batch]
    ) -> int:
        """Add 30 days of attendance records for each student."""
        count = 0
        today = date.today()
        batch_map = {s.id: s.batches for s in students}

        for student in students:
            student_batches = batch_map.get(student.id) or batches[:1]
            if not student_batches:
                continue
            batch = random.choice(student_batches)

            for day_offset in range(30):
                att_date = today - timedelta(days=day_offset)
                # Skip Sundays
                if att_date.weekday() == 6:
                    continue

                attendance = Attendance(
                    student_id=student.id,
                    batch_id=batch.id,
                    date=att_date,
                    status=random.choice(ATTENDANCE_STATUSES),
                    is_demo=True,
                )
                db.add(attendance)
                count += 1

        await db.flush()
        return count

    async def _create_demo_test_scores(self, db: AsyncSession, students: list[Student]) -> int:
        """Add 2–4 test score records per student."""
        count = 0
        today = date.today()

        for student in students:
            num_tests = random.randint(2, 4)
            subjects = student.subjects or ["Mathematics"]

            for t in range(num_tests):
                test_date = today - timedelta(days=random.randint(7, 120))
                max_marks = random.choice([25.0, 50.0, 100.0])
                marks_obtained = round(random.uniform(max_marks * 0.4, max_marks), 1)
                subject = random.choice(subjects)

                score = TestScore(
                    student_id=student.id,
                    test_name=f"{random.choice(TEST_NAMES)} — {subject}",
                    date=test_date,
                    max_marks=max_marks,
                    marks_obtained=marks_obtained,
                    remarks="Demo test score" if random.random() > 0.6 else None,
                    is_demo=True,
                )
                db.add(score)
                count += 1

        await db.flush()
        return count
