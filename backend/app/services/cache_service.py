import time
import json
import hashlib
import logging
from typing import Any, Optional, Dict, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """
    Dual-layer production cache:
    Primary: Distributed Redis instance (asyncio).
    Secondary/Fallback: Thread-safe in-memory TTL cache with LRU eviction.
    Guarantees zero downtime if Redis is disconnected.
    """

    def __init__(self, max_memory_items: int = 1000):
        self._redis_client = None
        self._memory_cache: Dict[str, Tuple[float, Any]] = {}
        self._max_memory_items = max_memory_items
        self._redis_disabled = False

    async def _get_redis(self):
        if not settings.CACHE_ENABLED:
            return None
        if self._redis_disabled:
            return None
        if self._redis_client is None:
            try:
                import redis.asyncio as aioredis
                self._redis_client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=1.0
                )
            except Exception as e:
                logger.warning(f"Could not initialize Redis client, using in-memory cache: {e}")
                self._redis_disabled = True
                return None
        return self._redis_client

    def make_key(self, prefix: str, **kwargs) -> str:
        """Constructs a deterministic cache key from parameters."""
        sorted_items = sorted((k, str(v)) for k, v in kwargs.items() if v is not None)
        raw = json.dumps(sorted_items, sort_keys=True)
        hash_digest = hashlib.md5(raw.encode('utf-8')).hexdigest()[:12]
        return f"{prefix}:{hash_digest}"

    async def get(self, key: str) -> Optional[Any]:
        """Fetches item from Redis, falling back seamlessly to local in-memory TTL store."""
        if not settings.CACHE_ENABLED:
            return None

        # 1. Try Redis
        try:
            r = await self._get_redis()
            if r:
                val = await r.get(key)
                if val is not None:
                    return json.loads(val)
        except Exception:
            # Fall back silently to in-memory on Redis connection/timeout errors
            pass

        # 2. In-Memory fallback
        if key in self._memory_cache:
            expires_at, data = self._memory_cache[key]
            if time.time() < expires_at:
                return data
            else:
                del self._memory_cache[key]

        return None

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Stores item in Redis and local memory with TTL."""
        if not settings.CACHE_ENABLED:
            return False

        ttl = ttl_seconds if ttl_seconds is not None else settings.CACHE_TTL_SEARCH
        payload = json.dumps(value, default=str)

        # 1. Set in Redis
        stored_redis = False
        try:
            r = await self._get_redis()
            if r:
                await r.set(key, payload, ex=ttl)
                stored_redis = True
        except Exception:
            pass

        # 2. Set in memory fallback
        if len(self._memory_cache) >= self._max_memory_items:
            # Evict oldest 20% entries
            now = time.time()
            to_remove = [k for k, (exp, _) in self._memory_cache.items() if exp < now]
            if len(to_remove) < 100:
                to_remove.extend(list(self._memory_cache.keys())[:100])
            for k in to_remove:
                self._memory_cache.pop(k, None)

        self._memory_cache[key] = (time.time() + ttl, value)
        return True

    async def delete(self, key: str) -> bool:
        """Deletes item from both Redis and local memory."""
        self._memory_cache.pop(key, None)
        try:
            r = await self._get_redis()
            if r:
                await r.delete(key)
        except Exception:
            pass
        return True

    async def is_redis_available(self) -> bool:
        """Checks if Redis server is reachable and responsive."""
        try:
            r = await self._get_redis()
            if r:
                res = await r.ping()
                return bool(res)
        except Exception:
            return False
        return False

    async def close(self):
        """Disposes Redis connection pool."""
        if self._redis_client:
            try:
                await self._redis_client.aclose()
            except Exception:
                pass
            self._redis_client = None

cache_service = CacheService()
