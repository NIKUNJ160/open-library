import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc, text
from app.models.document import KnowledgeDocument, DocumentChunk
from app.services.embedding_service import embedding_service
from app.schemas.search import SearchResultItem, SearchResponse

logger = logging.getLogger(__name__)

class HybridSearchService:
    """
    Hybrid Search combining BM25 keyword matching and dense vector cosine similarity
    using Reciprocal Rank Fusion (RRF).
    """

    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    async def search(
        self,
        db: AsyncSession,
        query: str,
        doc_type: Optional[str] = None,
        source: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
        enable_vector: bool = True
    ) -> SearchResponse:
        """
        Execute hybrid search over knowledge documents and passage chunks.
        """
        offset = (page - 1) * page_size
        clean_query = query.strip()
        query_pattern = f"%{clean_query}%"

        # 1. Text Search Candidates
        text_filters = [
            or_(
                KnowledgeDocument.title.ilike(query_pattern),
                KnowledgeDocument.content.ilike(query_pattern)
            )
        ]
        if doc_type:
            text_filters.append(KnowledgeDocument.doc_type == doc_type.lower())
        if source:
            text_filters.append(KnowledgeDocument.source == source.lower())

        text_stmt = (
            select(KnowledgeDocument.id)
            .where(*text_filters)
            .order_by(
                desc(KnowledgeDocument.title.ilike(query_pattern)),
                KnowledgeDocument.created_at.desc()
            )
            .limit(50)
        )
        text_res = await db.execute(text_stmt)
        text_ranked_ids = [row[0] for row in text_res.fetchall()]

        # 2. Vector Search Candidates (if enabled)
        vector_ranked_ids: List[uuid.UUID] = []
        best_chunk_snippets: Dict[uuid.UUID, str] = {}

        if enable_vector and clean_query:
            try:
                query_vector = embedding_service.embed_query(clean_query)
                # Check if pgvector is usable in this session
                # Query nearest chunks using cosine distance
                vec_stmt = (
                    select(
                        DocumentChunk.document_id,
                        DocumentChunk.text,
                        DocumentChunk.embedding.cosine_distance(query_vector).label("distance")
                    )
                    .join(KnowledgeDocument, DocumentChunk.document_id == KnowledgeDocument.id)
                    .order_by("distance")
                    .limit(50)
                )
                if doc_type:
                    vec_stmt = vec_stmt.where(KnowledgeDocument.doc_type == doc_type.lower())
                if source:
                    vec_stmt = vec_stmt.where(KnowledgeDocument.source == source.lower())

                vec_res = await db.execute(vec_stmt)
                seen_docs = set()
                for doc_id, chunk_text, dist in vec_res.fetchall():
                    if doc_id not in seen_docs:
                        seen_docs.add(doc_id)
                        vector_ranked_ids.append(doc_id)
                        best_chunk_snippets[doc_id] = chunk_text
            except Exception as e:
                logger.warning(f"Vector search bypassed or unavailable: {e}")

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF_Score(d) = sum(1 / (k + rank))
        rrf_scores: Dict[uuid.UUID, float] = {}

        for rank, doc_id in enumerate(text_ranked_ids, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        for rank, doc_id in enumerate(vector_ranked_ids, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        # Sort all matched doc IDs by fused RRF score
        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda d: rrf_scores[d], reverse=True)
        total = len(sorted_doc_ids)

        # Slice for pagination
        page_doc_ids = sorted_doc_ids[offset: offset + page_size]
        if not page_doc_ids:
            return SearchResponse(
                query=clean_query,
                page=page,
                page_size=page_size,
                total=total,
                results=[]
            )

        # Load full document details for page results
        docs_stmt = select(KnowledgeDocument).where(KnowledgeDocument.id.in_(page_doc_ids))
        docs_res = await db.execute(docs_stmt)
        docs_by_id = {doc.id: doc for doc in docs_res.scalars().all()}

        results: List[SearchResultItem] = []
        for doc_id in page_doc_ids:
            doc = docs_by_id.get(doc_id)
            if not doc:
                continue

            # Choose snippet: best chunk match if available, else content match
            snippet = best_chunk_snippets.get(doc_id)
            if not snippet and doc.content:
                idx = doc.content.lower().find(clean_query.lower())
                if idx != -1:
                    s_start = max(0, idx - 60)
                    s_end = min(len(doc.content), idx + len(clean_query) + 120)
                    snippet = ("..." if s_start > 0 else "") + doc.content[s_start:s_end].replace("\n", " ") + ("..." if s_end < len(doc.content) else "")
                else:
                    snippet = doc.content[:200].replace("\n", " ") + "..."
            elif not snippet:
                snippet = doc.title

            authors = None
            if doc.metadata_json and isinstance(doc.metadata_json, dict):
                authors = doc.metadata_json.get("authors")

            score = round(rrf_scores.get(doc_id, 0.0) * 100, 2)

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
                    score=score,
                    published_at=doc.published_at.isoformat() if doc.published_at else None,
                    authors=authors
                )
            )

        return SearchResponse(
            query=clean_query,
            page=page,
            page_size=page_size,
            total=total,
            results=results
        )

hybrid_search_service = HybridSearchService()
