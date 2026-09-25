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
    enable_rerank: bool = Query(True, description="Enable second-stage neural cross-encoder reranking"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search indexed knowledge documents using two-stage Hybrid Search:
    Stage 1: Fast candidate retrieval fusing BM25 keyword matching and pgvector HNSW dense search.
    Stage 2: Neural cross-encoder reranking with sigmoid-normalized relevance scoring.
    """
    return await hybrid_search_service.search(
        db=db,
        query=q,
        doc_type=doc_type,
        source=source,
        page=page,
        page_size=page_size,
        enable_vector=enable_vector,
        enable_rerank=enable_rerank
    )
