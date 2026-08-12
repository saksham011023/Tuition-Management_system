"""
Tests for the Parent Notification & Digital Receipt System backend module.
Covers: creating notification logs, listing notification history with filters,
fetching message templates, and notification analytics aggregation.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_notification_flow(client: AsyncClient):
    """Integration test for notifications API endpoints."""

    # 1. Register & Login Teacher
    reg_resp = await client.post(
        "/api/auth/register",
        json={
            "name": "Teacher Noti",
            "email": "noti_teacher@example.com",
            "password": "securepass123",
        },
    )
    assert reg_resp.status_code == 201
    auth_data = reg_resp.json()
    headers = {"Authorization": f"Bearer {auth_data['access_token']}"}

    # 2. Fetch Default Templates
    tmpl_resp = await client.get("/api/notifications/templates", headers=headers)
    assert tmpl_resp.status_code == 200
    templates = tmpl_resp.json()
    assert len(templates) >= 6
    template_keys = [t["key"] for t in templates]
    assert "payment_received" in template_keys
    assert "fee_reminder_upcoming" in template_keys

    # 3. Log a Notification Event
    create_resp = await client.post(
        "/api/notifications",
        headers=headers,
        json={
            "student_id": "test-student-123",
            "student_name": "Rohan Sharma",
            "parent_name": "Suresh Sharma",
            "parent_mobile": "9876543210",
            "notification_type": "payment_receipt",
            "channel": "whatsapp",
            "status": "initiated",
            "receipt_number": "TMS-2026-0001",
            "message": "Hello Suresh Sharma, payment of ₹3000 received for Rohan Sharma.",
            "metadata": {"amount": 3000, "month": "2026-07"},
        },
    )
    assert create_resp.status_code == 201
    noti_data = create_resp.json()
    assert noti_data["student_name"] == "Rohan Sharma"
    assert noti_data["receipt_number"] == "TMS-2026-0001"

    # 4. List Notification History
    list_resp = await client.get("/api/notifications?search=Rohan", headers=headers)
    assert list_resp.status_code == 200
    history = list_resp.json()
    assert history["total"] >= 1
    assert history["items"][0]["receipt_number"] == "TMS-2026-0001"

    # 5. Fetch Notification Analytics
    analytics_resp = await client.get("/api/notifications/analytics", headers=headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert analytics["total_receipts_generated"] >= 1
    assert analytics["whatsapp_shares_initiated"] >= 1
