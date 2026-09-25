import time
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.services.cache_service import cache_service
from app.services.embedding_service import embedding_service
from app.config import settings

router = APIRouter()

_START_TIME = time.time()

@router.get("/health", tags=["system"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive diagnostic health check for DB, pgvector, Redis, and Embedding engine."""
    db_status = "unreachable"
    pgvector_status = "unavailable"

    # 1. Database & pgvector check
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "connected"

        ext_check = await db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
        if ext_check.scalar() == "vector":
            pgvector_status = "ready"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # 2. Redis Cache check
    redis_available = await cache_service.is_redis_available()
    cache_status = "redis_connected" if redis_available else "in_memory_fallback"

    # 3. Embedding Engine check
    embedding_ready = hasattr(embedding_service, "embed_query") and hasattr(embedding_service, "embed_documents")

    is_healthy = (db_status == "connected")

    return {
        "status": "healthy" if is_healthy else "degraded",
        "components": {
            "database": db_status,
            "pgvector": pgvector_status,
            "cache": cache_status,
            "embedding_engine": "ready" if embedding_ready else "initializing"
        },
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": round(time.time() - _START_TIME, 1),
        "version": "0.1.0"
    }
