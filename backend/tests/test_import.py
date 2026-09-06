"""
Tests for student import processing, column header normalization, default address, and route endpoints.
"""

import pytest
from httpx import AsyncClient
from src.data_management.validation_service import ValidationService
from src.data_management.import_service import ImportService


def test_google_form_row_normalization():
    """Test that Google Form / Sheet headers and values are normalized correctly."""
    service = ValidationService()
    
    raw_google_sheet_row = {
        "Timestamp": "8-9-2026 9:55:29",
        "Student's Name": "Ravi",
        "Parent's Name": "Harish chandra verma",
        "Parent's Mobile Number": "8141248281",
        "Class/Grade": "9",
        "School Name": "St mary school",
        "Monthly Tuition Fee": "900",
        "Batch 1/2": "Batch 2 (5-7)",
    }

    result = service.validate_student_row(raw_google_sheet_row)
    assert result.is_valid is True
    assert len(result.errors) == 0

    data = result.row_data
    assert data["student_name"] == "Ravi"
    assert data["parent_name"] == "Harish chandra verma"
    assert data["parent_mobile"] == "8141248281"
    assert data["class"] == "Class 9"
    assert data["school"] == "St mary school"
    assert data["monthly_fee"] == "900"
    assert data["batch"] == "Batch 2 (5-7)"
    assert data["address"] == "Chanod Colony Vapi"


def test_microsecond_timestamp_parsing():
    """Test that timestamps with microseconds like 2026-08-09 09:55:29.495000 parse validly."""
    service = ValidationService()
    row = {
        "Timestamp": "2026-08-09 09:55:29.495000",
        "Student's Name": "Tisha Patel",
        "Parent's Name": "Chhaya Patel",
        "Parent's Mobile Number": "7574014293",
        "Class/Grade": "10",
        "School Name": "St Mary's school",
        "Monthly Tuition Fee": "1200",
        "Batch 1/2": "Batch 1 (3-5)",
    }
    res = service.validate_student_row(row)
    assert res.is_valid is True
    assert len(res.errors) == 0


def test_batch_resolution():
    """Test smart batch resolution matching Google Sheet strings to DB batches."""
    service = ImportService()
    
    # Mock DB batches
    class FakeBatch:
        def __init__(self, name):
            self.name = name

        def __eq__(self, other):
            return isinstance(other, FakeBatch) and self.name == other.name

        def __repr__(self):
            return f"Batch('{self.name}')"

    b1 = FakeBatch("Batch 1 (03:00 PM - 05:00 PM)")
    b2 = FakeBatch("Batch 2 (05:00 PM - 07:00 PM)")
    
    all_batches = {
        b1.name.lower(): b1,
        b2.name.lower(): b2,
    }

    assert service._resolve_batch("Batch 2 (5-7)", all_batches) == b2
    assert service._resolve_batch("Batch 1 (3-5)", all_batches) == b1
    assert service._resolve_batch("Batch 1", all_batches) == b1
    assert service._resolve_batch("Batch 2", all_batches) == b2


@pytest.mark.asyncio
async def test_data_management_validate_endpoint(client: AsyncClient):
    """Test that /api/data-management/import/validate route is mounted and accessible."""
    # Register/login to get token
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Import Test User",
        "email": "importtest@example.com",
        "password": "password123",
    })
    token = reg_resp.json()["access_token"]

    # Upload sample CSV
    csv_content = (
        "Student's Name,Parent's Name,Parent's Mobile Number,Class/Grade,School Name,Monthly Tuition Fee,Batch 1/2\n"
        "Ravi,Harish chandra verma,8141248281,9,St mary school,900,Batch 2 (5-7)\n"
    )
    
    files = {"file": ("students.csv", csv_content.encode("utf-8"), "text/csv")}
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/data-management/import/validate",
        files=files,
        headers=headers,
    )
    
    assert resp.status_code == 200
    report = resp.json()
    assert report["total_rows"] == 1
    assert report["valid_count"] == 1
    assert report["invalid_count"] == 0
    assert report["row_results"][0]["row_data"]["address"] == "Chanod Colony Vapi"
