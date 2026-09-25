import time
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.cache_service import CacheService, cache_service
from app.core.security import RateLimiter, rate_limiter
from app.db.session import get_db

client = TestClient(app)

@pytest.mark.asyncio
async def test_cache_service_in_memory_crud():
    cache = CacheService(max_memory_items=50)

    # Set
    success = await cache.set("test:key1", {"message": "hello world"}, ttl_seconds=60)
    assert success is True

    # Get
    val = await cache.get("test:key1")
    assert val == {"message": "hello world"}

    # Delete
    del_success = await cache.delete("test:key1")
    assert del_success is True

    # Get after delete
    val_after = await cache.get("test:key1")
    assert val_after is None

@pytest.mark.asyncio
async def test_cache_service_ttl_expiry():
    cache = CacheService(max_memory_items=50)

    # Set short TTL
    await cache.set("test:expiring", "temporary", ttl_seconds=0.05)
    assert await cache.get("test:expiring") == "temporary"

    # Wait for expiry
    time.sleep(0.08)
    assert await cache.get("test:expiring") is None

def test_cache_make_key_deterministic():
    cache = CacheService()
    k1 = cache.make_key("search", query="physics", page=1, source="openlibrary")
    k2 = cache.make_key("search", source="openlibrary", page=1, query="physics")
    assert k1 == k2
    assert k1.startswith("search:")

def test_rate_limiter_logic():
    limiter = RateLimiter(limit_per_minute=3)
    ip = "192.168.1.100"

    # 1st request
    allowed1, rem1, retry1 = limiter.check(ip)
    assert allowed1 is True
    assert rem1 == 2

    # 2nd request
    allowed2, rem2, retry2 = limiter.check(ip)
    assert allowed2 is True
    assert rem2 == 1

    # 3rd request
    allowed3, rem3, retry3 = limiter.check(ip)
    assert allowed3 is True
    assert rem3 == 0

    # 4th request - should be rejected with 429 backoff
    allowed4, rem4, retry4 = limiter.check(ip)
    assert allowed4 is False
    assert rem4 == 0
    assert retry4 > 0

    # Reset
    limiter.reset()
    allowed_reset, _, _ = limiter.check(ip)
    assert allowed_reset is True

def test_security_headers_present():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "1; mode=block" in resp.headers.get("x-xss-protection", "")
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

def test_rate_limit_middleware_exceeded(monkeypatch):
    from app.services.search_service import hybrid_search_service
    from app.schemas.search import SearchResponse

    async def mock_search(*args, **kwargs):
        return SearchResponse(query="test", page=1, page_size=10, total=0, results=[])

    monkeypatch.setattr(hybrid_search_service, "search", mock_search)

    class MockDb:
        pass

    async def override_get_db():
        yield MockDb()

    app.dependency_overrides[get_db] = override_get_db

    # Set a very low limit for the global rate_limiter
    rate_limiter.limit = 2
    rate_limiter.reset()

    try:
        # Request 1
        r1 = client.get("/api/v1/search?q=test1")
        assert "x-ratelimit-limit" in r1.headers

        # Request 2
        r2 = client.get("/api/v1/search?q=test2")

        # Request 3 - should trigger 429
        r3 = client.get("/api/v1/search?q=test3")
        assert r3.status_code == 429
        data = r3.json()
        assert data["error"] == "Too Many Requests"
        assert "retry_after" in data
        assert r3.headers.get("x-ratelimit-remaining") == "0"
        assert "retry-after" in r3.headers
    finally:
        app.dependency_overrides.clear()
        from app.config import settings
        rate_limiter.limit = settings.RATE_LIMIT_PER_MINUTE
        rate_limiter.reset()

def test_enhanced_health_check():
    class MockDbResult:
        def __init__(self, val):
            self._val = val
        def scalar(self):
            return self._val

    class MockDbSession:
        async def execute(self, stmt):
            stmt_str = str(stmt).lower()
            if "vector" in stmt_str:
                return MockDbResult("vector")
            return MockDbResult(1)

    async def override_get_db():
        yield MockDbSession()

    app.dependency_overrides[get_db] = override_get_db
    try:
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "components" in data
        assert data["components"]["database"] == "connected"
        assert data["components"]["pgvector"] == "ready"
        assert data["components"]["cache"] in ["redis_connected", "in_memory_fallback"]
        assert data["components"]["embedding_engine"] == "ready"
        assert "version" in data
    finally:
        app.dependency_overrides.clear()
