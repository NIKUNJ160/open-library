from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.search import router as search_router
from app.api.v1.documents import router as documents_router
from app.api.v1.ask import router as ask_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="", tags=["system"])
api_router.include_router(search_router, prefix="", tags=["search"])
api_router.include_router(documents_router, prefix="", tags=["documents"])
api_router.include_router(ask_router, prefix="", tags=["rag"])
