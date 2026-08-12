"""
Test configuration and fixtures.
Uses an in-memory SQLite database to avoid requiring PostgreSQL.
"""

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import all models so they register in Base.metadata
from src.auth.models import User  # noqa: F401
from src.db.base import Base
from src.students.models import (  # noqa: F401
    Attendance,
    Batch,
    Payment,
    Student,
    TestScore,
)
from src.fees.models import FeeRecord, FeeTransaction  # noqa: F401
from src.notifications.models import MessageTemplate, Notification  # noqa: F401
from src.settings.models import SystemSetting  # noqa: F401

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a test database session."""
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP test client with dependency overrides."""
    from src.core.dependencies import get_db
    from src.main import app

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Helper fixture providing headers for authenticated request endpoints."""
    resp = await client.post("/api/auth/register", json={
        "name": "Auth User",
        "email": "auth@example.com",
        "password": "securepass123",
    })
    data = resp.json()
    return {"Authorization": f"Bearer {data['access_token']}"}
