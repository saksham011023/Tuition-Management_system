"""
Tests for critical fee management and payment ledger business logic.
Covers: fee record generation, payment transactions, dynamic status calculations,
and receipt sequence numbering.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.students.models import Student
from src.fees.models import FeeRecord, FeeTransaction


@pytest.mark.asyncio
async def test_fee_generation_and_payment_ledger(client: AsyncClient, db_session: AsyncSession):
    """
    Complete integration test for critical fee business rules:
    - User Registration & Authentication
    - Student Enrollment with monthly fee pre-fill
    - Ledger Monthly Invoice Obligation Generation
    - Payment Transaction posting & sequential receipt formatting (TMS-YYYY-NNNN)
    - Outstanding Balance & Ledger status calculation
    """

    # 1. Register & Login Teacher
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Teacher Saksham",
        "email": "saksham@example.com",
        "password": "securepass123",
    })
    assert reg_resp.status_code == 201
    auth_data = reg_resp.json()
    headers = {"Authorization": f"Bearer {auth_data['access_token']}"}

    # 2. Enroll a Student
    stud_resp = await client.post("/api/students", headers=headers, json={
        "name": "Arjun Kumar",
        "parent_name": "Rajesh Kumar",
        "parent_mobile": "9999988888",
        "alternate_mobile": "",
        "address": "Delhi, India",
        "school": "Modern School",
        "class_name": "Class 12 - Science",
        "subjects": ["Mathematics", "Physics"],
        "joining_date": "2026-07-01",
        "monthly_fee": 5000.0,
        "notes": "Prefers evening sessions",
        "batch_ids": [],
    })
    assert stud_resp.status_code == 201
    student = stud_resp.json()
    student_id = student["id"]

    # 3. Generate Monthly Fee Record
    gen_resp = await client.post("/api/fees/generate", headers=headers, json={
        "month": "2026-07",
        "student_ids": [student_id]
    })
    assert gen_resp.status_code == 201
    gen_data = gen_resp.json()
    assert gen_data["generated_count"] == 1
    assert gen_data["skipped_count"] == 0

    # Retrieve generated record
    records_resp = await client.get(f"/api/fees?student_id={student_id}", headers=headers)
    assert records_resp.status_code == 200
    records = records_resp.json()["items"]
    assert len(records) == 1
    fee_record = records[0]
    
    assert fee_record["base_amount"] == 5000.0
    assert fee_record["net_amount"] == 5000.0
    assert fee_record["paid_amount"] == 0.0
    assert fee_record["balance"] == 5000.0
    assert fee_record["status"] == "pending"
    fee_record_id = fee_record["id"]

    # 4. Record Partial Payment (₹2000)
    pay1_resp = await client.post(f"/api/fees/{fee_record_id}/pay", headers=headers, json={
        "amount": 2000.0,
        "date": "2026-07-10",
        "mode": "upi",
        "transaction_id": "TXN999888777",
        "notes": "First installment"
    })
    assert pay1_resp.status_code == 200
    updated_fee = pay1_resp.json()
    
    # Financial state verification after first transaction
    assert updated_fee["paid_amount"] == 2000.0
    assert updated_fee["balance"] == 3000.0
    assert updated_fee["status"] == "partially_paid"
    
    # Verify receipt details
    assert len(updated_fee["transactions"]) == 1
    t1 = updated_fee["transactions"][0]
    assert t1["amount"] == 2000.0
    assert t1["mode"] == "upi"
    assert t1["receipt_number"].startswith("TMS-2026-")

    # 5. Record Remaining Payment (₹3000)
    pay2_resp = await client.post(f"/api/fees/{fee_record_id}/pay", headers=headers, json={
        "amount": 3000.0,
        "date": "2026-07-15",
        "mode": "cash",
        "notes": "Paid in full"
    })
    assert pay2_resp.status_code == 200
    final_fee = pay2_resp.json()

    # Verification of final ledger state
    assert final_fee["paid_amount"] == 5000.0
    assert final_fee["balance"] == 0.0
    assert final_fee["status"] == "paid"
    assert len(final_fee["transactions"]) == 2

    # Receipt numbering sequencing check
    receipt1 = final_fee["transactions"][0]["receipt_number"]
    receipt2 = final_fee["transactions"][1]["receipt_number"]
    assert receipt1 != receipt2
    assert receipt1.split("-")[2] == "0001"
    assert receipt2.split("-")[2] == "0002"
