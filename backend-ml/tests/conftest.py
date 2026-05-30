"""
Pytest configuration and fixtures for backend-ml tests.
"""
from typing import AsyncGenerator, Generator

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
async def db_engine():
    """
    Create an in-memory SQLite engine per test.
    Rolls back automatically after each test by dropping all tables.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Per-test database session with automatic rollback on exit.
    """
    async with AsyncSession(db_engine, expire_on_commit=False) as session:
        yield session


# ---------------------------------------------------------------------------
# Redis mock fixture
# ---------------------------------------------------------------------------

class FakeRedis:
    """
    Minimal fake Redis for testing — dict-backed, no external dependency.
    Supports only the operations used by the codebase.
    """

    def __init__(self):
        self._data: dict[str, bytes] = {}
        self._lists: dict[str, list[bytes]] = {}

    async def set(self, key, value, ex=None, exat=None, px=None, pxat=None, keepttl=False, nx=False, xx=False):
        str_val = str(value).encode() if isinstance(value, str) else value
        self._data[key] = str_val
        return True

    async def get(self, key):
        v = self._data.get(key)
        return v.decode() if isinstance(v, bytes) else v

    async def delete(self, *keys):
        for k in keys:
            self._data.pop(k, None)
        return len(keys)

    async def brpop(self, keys, timeout=0):
        for k in keys:
            if k in self._lists and self._lists[k]:
                val = self._lists[k].pop(0)
                return (k, val)
        return None

    async def lpush(self, key, *values):
        if key not in self._lists:
            self._lists[key] = []
        encoded = [v.encode() if isinstance(v, str) else v for v in values]
        self._lists[key] = list(encoded) + self._lists[key]
        return len(self._lists[key])

    async def aclose(self):
        pass  # no-op for compatibility


@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()
