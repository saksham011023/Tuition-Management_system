"""
Automated tests for the database-backed dynamic Dashboard API.
"""

from datetime import date, timedelta
import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_dashboard_data(client: AsyncClient) -> dict[str, str]:
    """Register manager user and prepopulate database with dashboard metrics."""
    # 1. Register and get token
    reg = await client.post("/api/auth/register", json={
        "name": "Dashboard Manager",
        "email": "manager_dash@example.com",
        "password": "password123",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a Batch
    batch_resp = await client.post("/api/batches", headers=headers, json={
        "name": "JEE Advanced — Batch A",
        "subject": "Mathematics",
        "teacher": "Saksham",
        "days": ["monday", "wednesday"],
        "timing": "10:00 AM - 12:00 PM",
        "max_students": 30,
        "description": "Premium JEE prep class",
    })
    batch_id = batch_resp.json()["id"]

    # 3. Create active Student 1 (joining today)
    student1_resp = await client.post("/api/students", headers=headers, json={
        "name": "Aarav Sharma",
        "parent_name": "Alok Sharma",
        "parent_mobile": "9876543210",
        "address": "123 Main Street",
        "school": "DPS",
        "class_name": "Class 12 - Science",
        "joining_date": str(date.today()),
        "monthly_fee": 5000.0,
        "batch_ids": [batch_id],
    })
    student1_id = student1_resp.json()["id"]

    # 4. Create active Student 2 (joining 32 days ago - last month)
    student2_resp = await client.post("/api/students", headers=headers, json={
        "name": "Priya Patel",
        "parent_name": "Ramesh Patel",
        "parent_mobile": "9876543211",
        "address": "456 Side Street",
        "school": "St. Xavier",
        "class_name": "Class 12 - Science",
        "joining_date": str(date.today() - timedelta(days=32)),
        "monthly_fee": 4000.0,
        "batch_ids": [batch_id],
    })
    student2_id = student2_resp.json()["id"]

    # 5. Record Payment for Student 1 today (this month collection)
    await client.post(f"/api/students/{student1_id}/payments", headers=headers, json={
        "amount": 5000.0,
        "date": str(date.today()),
        "status": "paid",
        "method": "upi",
        "remarks": "July Fees",
    })

    # 6. Record Attendance for Student 1 today
    await client.post(f"/api/students/{student1_id}/attendance", headers=headers, json={
        "date": str(date.today()),
        "status": "present",
        "remarks": "In time",
    })

    # 7. Record Test Score for Student 1 today
    await client.post(f"/api/students/{student1_id}/test-scores", headers=headers, json={
        "test_name": "Vector Quiz",
        "date": str(date.today()),
        "max_marks": 50.0,
        "marks_obtained": 45.0,
        "remarks": "Great job",
    })

    return headers


@pytest.mark.asyncio
async def test_get_dashboard_aggregations(client: AsyncClient, setup_dashboard_data: dict[str, str]):
    """Verify stats cards aggregate dynamic DB records correctly."""
    headers = setup_dashboard_data

    resp = await client.get("/api/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # 1. Verify Stat Cards
    stats = data["stats"]
    assert stats["total_students"]["value"] == "2"
    assert stats["active_batches"]["value"] == "1"
    assert stats["monthly_collection"]["value"] == "₹5,000"
    
    # Expected fee = 5000 (s1) + 4000 (s2) = 9000. Paid = 5000. Pending = 4000.
    assert stats["pending_fees"]["value"] == "₹4,000"
    
    # s2 has not paid this month
    assert stats["students_with_due_fees"]["value"] == "1"
    
    # 1 attendance logged today, present
    assert stats["todays_attendance"]["value"] == "100%"
    assert stats["upcoming_tests"]["value"] == "1"

    # 2. Verify Feeds
    assert len(data["recent_payments"]) == 1
    assert data["recent_payments"][0]["student_name"] == "Aarav Sharma"
    assert data["recent_payments"][0]["amount"] == 5000.0

    # s2 hasn't paid, should have a reminder
    assert len(data["fee_reminders"]) == 1
    assert data["fee_reminders"][0]["student_name"] == "Priya Patel"
    assert data["fee_reminders"][0]["amount_due"] == 4000.0

    # 2 admissions recorded
    assert len(data["latest_admissions"]) == 2
    assert data["latest_admissions"][0]["student_name"] == "Priya Patel"  # Sorted by created_at desc
    assert data["latest_admissions"][1]["student_name"] == "Aarav Sharma"


@pytest.mark.asyncio
async def test_dashboard_stats_only_dynamic(client: AsyncClient, setup_dashboard_data: dict[str, str]):
    """Verify stats card endpoint runs successfully with DB metrics."""
    headers = setup_dashboard_data

    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()

    assert stats["total_students"]["value"] == "2"
    assert stats["active_batches"]["value"] == "1"
    assert stats["monthly_collection"]["value"] == "₹5,000"
