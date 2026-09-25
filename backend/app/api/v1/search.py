from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import hybrid_search_service

router = APIRouter()

@router.get("/search", response_model=SearchResponse, tags=["search"])
async def search_documents(
    q: str = Query(..., min_length=1, description="Search query string"),
    doc_type: Optional[str] = Query(None, description="Filter by document type (e.g. book, article)"),
    source: Optional[str] = Query(None, description="Filter by source (e.g. openlibrary, wikipedia)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    enable_vector: bool = Query(True, description="Enable dense vector semantic search"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search indexed knowledge documents using Reciprocal Rank Fusion (RRF) hybrid search,
    combining keyword full-text matching with dense vector semantic search.
    """
    return await hybrid_search_service.search(
        db=db,
        query=q,
        doc_type=doc_type,
        source=source,
        page=page,
        page_size=page_size,
        enable_vector=enable_vector
    )
