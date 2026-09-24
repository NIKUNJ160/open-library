from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc
from app.db.session import get_db
from app.models.document import KnowledgeDocument
from app.schemas.search import SearchResponse, SearchResultItem

router = APIRouter()

@router.get("/search", response_model=SearchResponse, tags=["search"])
async def search_documents(
    q: str = Query(..., min_length=1, description="Search query string"),
    doc_type: Optional[str] = Query(None, description="Filter by document type (e.g. book, article)"),
    source: Optional[str] = Query(None, description="Filter by source (e.g. openlibrary, wikipedia)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search indexed knowledge documents using text matching and ranking filters.
    """
    offset = (page - 1) * page_size
    query_term = f"%{q.strip()}%"

    # Base filter condition
    filter_conditions = [
        or_(
            KnowledgeDocument.title.ilike(query_term),
            KnowledgeDocument.content.ilike(query_term)
        )
    ]

    if doc_type:
        filter_conditions.append(KnowledgeDocument.doc_type == doc_type.lower())
    if source:
        filter_conditions.append(KnowledgeDocument.source == source.lower())

    # Count total matches
    count_stmt = select(func.count(KnowledgeDocument.id)).where(*filter_conditions)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Query matching documents
    query_stmt = (
        select(KnowledgeDocument)
        .where(*filter_conditions)
        .order_by(
            # Rank title matches higher than content matches
            desc(KnowledgeDocument.title.ilike(query_term)),
            KnowledgeDocument.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
    )
    docs_result = await db.execute(query_stmt)
    docs = docs_result.scalars().all()

    results: List[SearchResultItem] = []
    for doc in docs:
        # Create concise snippet
        snippet = ""
        if doc.content:
            lower_content = doc.content.lower()
            q_lower = q.lower()
            idx = lower_content.find(q_lower)
            if idx != -1:
                start = max(0, idx - 60)
                end = min(len(doc.content), idx + len(q) + 120)
                snippet = ("..." if start > 0 else "") + doc.content[start:end].replace("\n", " ").strip() + ("..." if end < len(doc.content) else "")
            else:
                snippet = doc.content[:180].replace("\n", " ").strip() + "..."
        elif doc.title:
            snippet = doc.title

        # Extract authors from metadata if present
        authors = None
        if doc.metadata_json and isinstance(doc.metadata_json, dict):
            authors = doc.metadata_json.get("authors")

        results.append(
            SearchResultItem(
                id=doc.id,
                source=doc.source,
                source_id=doc.source_id,
                title=doc.title,
                snippet=snippet,
                doc_type=doc.doc_type,
                url=doc.url,
                license=doc.license,
                score=1.0,
                published_at=doc.published_at.isoformat() if doc.published_at else None,
                authors=authors
            )
        )

    return SearchResponse(
        query=q,
        page=page,
        page_size=page_size,
        total=total,
        results=results
    )
