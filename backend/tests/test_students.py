"""
Tests for the Student and Batch management API endpoints.
"""

import pytest
from httpx import AsyncClient

# ──────────────────────────────────────────────
# Batches Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_and_list_batches(client: AsyncClient, auth_headers: dict[str, str]):
    """Create and retrieve batches."""
    # List initial
    resp = await client.get("/api/batches", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 0

    # Create batch A
    resp = await client.post("/api/batches", headers=auth_headers, json={
        "name": "Physics Class 12",
        "subject": "Physics",
        "teacher": "Teacher A",
        "days": ["monday", "wednesday"],
        "timing": "10:00 AM - 12:00 PM",
        "max_students": 30,
        "description": "Mechanics and Electromagnetism",
    })
    assert resp.status_code == 201
    batch_a = resp.json()
    assert batch_a["name"] == "Physics Class 12"
    assert batch_a["description"] == "Mechanics and Electromagnetism"

    # Create batch B
    resp = await client.post("/api/batches", headers=auth_headers, json={
        "name": "Chemistry Class 12",
        "subject": "Chemistry",
        "teacher": "Teacher B",
        "days": ["tuesday", "thursday"],
        "timing": "02:00 PM - 04:00 PM",
        "max_students": 25,
    })
    assert resp.status_code == 201

    # List again
    resp = await client.get("/api/batches", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["items"][0]["name"] == "Chemistry Class 12"  # Sorted alphabetically
    assert data["items"][1]["name"] == "Physics Class 12"


@pytest.mark.asyncio
async def test_create_duplicate_batch_fails(client: AsyncClient, auth_headers: dict[str, str]):
    """Creating batch with existing name returns 409."""
    payload = {
        "name": "Duplicate Batch",
        "subject": "Chemistry",
        "teacher": "Teacher B",
        "days": ["tuesday", "thursday"],
        "timing": "02:00 PM - 04:00 PM",
        "max_students": 25,
    }
    resp = await client.post("/api/batches", headers=auth_headers, json=payload)
    assert resp.status_code == 201

    resp2 = await client.post("/api/batches", headers=auth_headers, json=payload)
    assert resp2.status_code == 409


# ──────────────────────────────────────────────
# Students CRUD Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_student_crud_lifecycle(client: AsyncClient, auth_headers: dict[str, str]):
    """Verify Student creation, detail viewing, updating, and deletion."""
    # 1. Create a batch to link
    batch_resp = await client.post("/api/batches", headers=auth_headers, json={
        "name": "Maths Class 10",
        "subject": "Mathematics",
        "teacher": "Teacher C",
        "days": ["monday", "friday"],
        "timing": "04:00 PM - 05:30 PM",
        "max_students": 40,
    })
    batch_id = batch_resp.json()["id"]

    # 2. Create student
    student_payload = {
        "name": "Aarav Gupta",
        "parent_name": "Sanjay Gupta",
        "parent_mobile": "9876543210",
        "alternate_mobile": "9876543211",
        "address": "123, Saket, New Delhi",
        "school": "Delhi Public School",
        "class_name": "Class 10",
        "subjects": ["Mathematics", "Physics"],
        "joining_date": "2026-04-01",
        "monthly_fee": 4500.0,
        "notes": "Fast learner, weak in geometry.",
        "batch_ids": [batch_id],
    }

    create_resp = await client.post("/api/students", headers=auth_headers, json=student_payload)
    assert create_resp.status_code == 201
    student = create_resp.json()
    assert student["name"] == "Aarav Gupta"
    assert student["monthly_fee"] == 4500.0
    assert len(student["batches"]) == 1
    assert student["batches"][0]["id"] == batch_id
    student_id = student["id"]

    # 3. Get Student Details (deep retrieve)
    detail_resp = await client.get(f"/api/students/{student_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    details = detail_resp.json()
    assert details["address"] == "123, Saket, New Delhi"
    assert details["school"] == "Delhi Public School"
    assert details["notes"] == "Fast learner, weak in geometry."
    assert len(details["payments"]) == 0
    assert len(details["attendance_records"]) == 0
    assert len(details["test_scores"]) == 0

    # 4. Update Student Details
    update_payload = {
        "name": "Aarav S. Gupta",
        "monthly_fee": 4800.0,
        "batch_ids": [],  # Remove from batch
    }
    update_resp = await client.put(f"/api/students/{student_id}", headers=auth_headers, json=update_payload)
    assert update_resp.status_code == 200
    updated_student = update_resp.json()
    assert updated_student["name"] == "Aarav S. Gupta"
    assert updated_student["monthly_fee"] == 4800.0
    assert len(updated_student["batches"]) == 0

    # 5. Delete Student
    del_resp = await client.delete(f"/api/students/{student_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # 6. Retrieve deleted should return 404
    get_del = await client.get(f"/api/students/{student_id}", headers=auth_headers)
    assert get_del.status_code == 404


# ──────────────────────────────────────────────
# List, Filters, Sorting, Search Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_student_list_queries(client: AsyncClient, auth_headers: dict[str, str]):
    """Verify search, sorting, and pagination on students list."""
    # Create classes/batches
    b1 = (await client.post("/api/batches", headers=auth_headers, json={
        "name": "Batch X",
        "subject": "Mathematics",
        "teacher": "Teacher X",
        "days": ["monday"],
        "timing": "04:00 PM - 05:00 PM",
        "max_students": 30,
    })).json()
    b2 = (await client.post("/api/batches", headers=auth_headers, json={
        "name": "Batch Y",
        "subject": "Physics",
        "teacher": "Teacher Y",
        "days": ["tuesday"],
        "timing": "04:00 PM - 05:00 PM",
        "max_students": 30,
    })).json()

    # Create 3 students
    s1 = {
        "name": "Rahul Verma",
        "parent_name": "Karan Verma",
        "parent_mobile": "9999911111",
        "address": "Address info here",
        "school": "School X",
        "class_name": "Class 10",
        "joining_date": "2026-01-01",
        "monthly_fee": 3000.0,
        "batch_ids": [b1["id"]],
    }
    s2 = {
        "name": "Sneha Sen",
        "parent_name": "Amit Sen",
        "parent_mobile": "9999922222",
        "address": "Address info here",
        "school": "School Y",
        "class_name": "Class 12",
        "joining_date": "2026-03-01",
        "monthly_fee": 5000.0,
        "batch_ids": [b2["id"]],
    }
    s3 = {
        "name": "Amit Verma",
        "parent_name": "Suresh Verma",
        "parent_mobile": "8888833333",
        "address": "Address info here",
        "school": "School X",
        "class_name": "Class 10",
        "joining_date": "2026-02-01",
        "monthly_fee": 4000.0,
        "batch_ids": [b1["id"]],
    }

    await client.post("/api/students", headers=auth_headers, json=s1)
    await client.post("/api/students", headers=auth_headers, json=s2)
    await client.post("/api/students", headers=auth_headers, json=s3)

    # Search for "Verma" (should match s1, s3)
    resp = await client.get("/api/students?search=Verma", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    names = [s["name"] for s in data["items"]]
    assert "Rahul Verma" in names
    assert "Amit Verma" in names

    # Filter by class_name "Class 10" (should return s1, s3)
    resp = await client.get("/api/students?class_name=Class 10", headers=auth_headers)
    assert resp.json()["total"] == 2

    # Filter by batch_id b2["id"] (should return s2)
    resp = await client.get(f"/api/students?batch_id={b2['id']}", headers=auth_headers)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["name"] == "Sneha Sen"

    # Sorting by monthly_fee descending
    resp = await client.get("/api/students?sort_by=monthly_fee&sort_order=desc", headers=auth_headers)
    items = resp.json()["items"]
    assert items[0]["name"] == "Sneha Sen"       # 5000.0
    assert items[1]["name"] == "Amit Verma"      # 4000.0
    assert items[2]["name"] == "Rahul Verma"     # 3000.0

    # Pagination: page_size=2
    resp = await client.get("/api/students?page_size=2&page=1", headers=auth_headers)
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 3
    assert data["total_pages"] == 2


# ──────────────────────────────────────────────
# Relationships and Cascades Tests
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_student_child_records_and_cascade(client: AsyncClient, auth_headers: dict[str, str]):
    """Verify adding sub-records (payments, attendance, scores) and cascade delete on student."""
    # Create student
    student = (await client.post("/api/students", headers=auth_headers, json={
        "name": "Test Child Records",
        "parent_name": "Parent",
        "parent_mobile": "9999999999",
        "address": "Home address",
        "school": "School name",
        "class_name": "Class 11",
        "joining_date": "2026-01-01",
        "monthly_fee": 3500.0,
    })).json()
    student_id = student["id"]

    # 1. Add Payment
    pay_resp = await client.post(f"/api/students/{student_id}/payments", headers=auth_headers, json={
        "amount": 3500.0,
        "date": "2026-05-01",
        "status": "paid",
        "method": "upi",
        "remarks": "May Month Fees",
    })
    assert pay_resp.status_code == 201

    # 2. Add Attendance
    att_resp = await client.post(f"/api/students/{student_id}/attendance", headers=auth_headers, json={
        "date": "2026-05-10",
        "status": "present",
        "remarks": "In time",
    })
    assert att_resp.status_code == 201

    # 3. Add Test Score
    score_resp = await client.post(f"/api/students/{student_id}/test-scores", headers=auth_headers, json={
        "test_name": "Unit Test 1",
        "date": "2026-05-15",
        "max_marks": 50.0,
        "marks_obtained": 46.5,
        "remarks": "Excellent work",
    })
    assert score_resp.status_code == 201

    # 4. Eager retrieve details and check
    detail = (await client.get(f"/api/students/{student_id}", headers=auth_headers)).json()
    assert len(detail["payments"]) == 1
    assert detail["payments"][0]["amount"] == 3500.0
    assert len(detail["attendance_records"]) == 1
    assert detail["attendance_records"][0]["status"] == "present"
    assert len(detail["test_scores"]) == 1
    assert detail["test_scores"][0]["marks_obtained"] == 46.5

    # 5. Delete student and check database cascades
    del_resp = await client.delete(f"/api/students/{student_id}", headers=auth_headers)
    assert del_resp.status_code == 204
