from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import async_engine
import logging

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Open Library Knowledge Engine backend...")
    # Attempt to auto-create tables if database is available
    try:
        async with async_engine.begin() as conn:
            # Create extension if supported
            try:
                from sqlalchemy import text
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
            except Exception as ext_err:
                logger.warning(f"Could not initialize extensions directly: {ext_err}")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schemas verified.")
    except Exception as e:
        logger.warning(f"Database connection skipped during lifespan boot (will reconnect on request): {e}")

    yield
    logger.info("Shutting down backend...")
    await async_engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Knowledge Engine backend offering hybrid search, entity exploration, and citation-grounded RAG",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

from app.core.security import RateLimitMiddleware, SecurityHeadersMiddleware

# Security Headers & Rate Limiting Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
