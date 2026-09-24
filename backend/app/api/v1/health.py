from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/health", tags=["system"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check validating backend and database readiness."""
    db_status = "unreachable"
    pgvector_status = "unavailable"

    try:
        # Check basic DB query
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "connected"

        # Check if vector extension is active
        ext_check = await db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
        if ext_check.scalar() == "vector":
            pgvector_status = "ready"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "pgvector": pgvector_status,
        "version": "0.1.0"
    }
