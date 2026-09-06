"""
Tests for the authentication API endpoints.
Covers: register, login, refresh, and /me.
"""

import pytest
from httpx import AsyncClient

# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint returns 200 with correct payload."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "service" in data


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """A new user can register successfully."""
    resp = await client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["name"] == "Test User"
    assert data["user"]["role"] == "teacher"
    assert data["user"]["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Registering with an existing email returns 409."""
    payload = {
        "name": "User One",
        "email": "duplicate@example.com",
        "password": "password123",
    }
    resp1 = await client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/auth/register", json=payload)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    """Registering with an invalid email returns 422."""
    resp = await client.post("/api/auth/register", json={
        "name": "Bad Email",
        "email": "not-an-email",
        "password": "password123",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Registering with a too-short password returns 422."""
    resp = await client.post("/api/auth/register", json={
        "name": "Short Pass",
        "email": "short@example.com",
        "password": "123",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_name(client: AsyncClient):
    """Registering without a name returns 422."""
    resp = await client.post("/api/auth/register", json={
        "email": "noname@example.com",
        "password": "password123",
    })
    assert resp.status_code == 422


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """A registered user can log in."""
    # Register first
    await client.post("/api/auth/register", json={
        "name": "Login User",
        "email": "login@example.com",
        "password": "password123",
    })

    # Login
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "login@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Login with wrong password returns 401."""
    await client.post("/api/auth/register", json={
        "name": "Wrong Pass",
        "email": "wrongpass@example.com",
        "password": "password123",
    })

    resp = await client.post("/api/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Login with non-existent email returns 401."""
    resp = await client.post("/api/auth/login", json={
        "email": "ghost@example.com",
        "password": "password123",
    })
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# Token Refresh
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient):
    """Valid refresh token returns new tokens."""
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Refresh User",
        "email": "refresh@example.com",
        "password": "password123",
    })
    refresh_token = reg_resp.json()["refresh_token"]

    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    """Invalid refresh token returns 401."""
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": "invalid-token-string",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client: AsyncClient):
    """Using an access token as refresh token returns 401."""
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Access As Refresh",
        "email": "accessrefresh@example.com",
        "password": "password123",
    })
    access_token = reg_resp.json()["access_token"]

    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": access_token,
    })
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# Get Current User (/me)
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    """Authenticated user can access /me."""
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Me User",
        "email": "me@example.com",
        "password": "password123",
    })
    access_token = reg_resp.json()["access_token"]

    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "me@example.com"
    assert data["name"] == "Me User"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    """Accessing /me without a token returns 401 or 403."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    """Accessing /me with an invalid token returns 401."""
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# Users /me endpoint
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_users_me_authenticated(client: AsyncClient):
    """Authenticated user can access /api/users/me."""
    reg_resp = await client.post("/api/auth/register", json={
        "name": "Users Me",
        "email": "usersme@example.com",
        "password": "password123",
    })
    access_token = reg_resp.json()["access_token"]

    resp = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "usersme@example.com"
