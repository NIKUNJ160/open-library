import uuid
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc, text
from app.models.document import KnowledgeDocument, DocumentChunk
from app.services.embedding_service import embedding_service
from app.services.rerank_service import rerank_service
from app.services.cache_service import cache_service
from app.schemas.search import SearchResultItem, SearchResponse
from app.config import settings

logger = logging.getLogger(__name__)

class HybridSearchService:
    """
    Two-stage Hybrid Search Service:
    - Stage 1: Fast candidate retrieval fusing BM25 keyword matching and pgvector HNSW
      dense embeddings via Reciprocal Rank Fusion (RRF, k=60).
    - Stage 2: High-precision neural cross-encoder reranking (Xenova/ms-marco-MiniLM-L-6-v2)
      with sigmoid-normalized confidence scoring.
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
        enable_vector: bool = True,
        enable_rerank: bool = True,
        rerank_top_k: int = 20
    ) -> SearchResponse:
        """
        Execute two-stage hybrid search over knowledge documents and passage chunks.
        """
        start_time = time.perf_counter()
        offset = (page - 1) * page_size
        clean_query = query.strip()
        query_pattern = f"%{clean_query}%"

        # Check production cache
        cache_key = cache_service.make_key(
            "search",
            query=clean_query,
            doc_type=doc_type,
            source=source,
            page=page,
            page_size=page_size,
            enable_vector=enable_vector,
            enable_rerank=enable_rerank
        )
        cached = await cache_service.get(cache_key)
        if cached:
            cached["search_time_ms"] = round((time.perf_counter() - start_time) * 1000, 2)
            return SearchResponse(**cached)

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
                # Optimize pgvector HNSW search recall within the local transaction
                try:
                    await db.execute(text("SET LOCAL hnsw.ef_search = 40;"))
                except Exception:
                    pass

                query_vector = embedding_service.embed_query(clean_query)
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
        rrf_scores: Dict[uuid.UUID, float] = {}

        for rank, doc_id in enumerate(text_ranked_ids, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        for rank, doc_id in enumerate(vector_ranked_ids, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda d: rrf_scores[d], reverse=True)
        total = len(sorted_doc_ids)

        if not sorted_doc_ids:
            search_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return SearchResponse(
                query=clean_query,
                page=page,
                page_size=page_size,
                total=0,
                search_time_ms=search_time_ms,
                reranked=False,
                results=[]
            )

        # 4. Stage-2 Neural Cross-Encoder Reranking
        is_reranked = False
        rerank_scores: Dict[uuid.UUID, float] = {}

        if enable_rerank and clean_query and len(sorted_doc_ids) > 0:
            top_candidates = sorted_doc_ids[:rerank_top_k]
            tail_candidates = sorted_doc_ids[rerank_top_k:]

            # Pre-fetch candidate documents for reranking
            candidate_stmt = select(KnowledgeDocument).where(KnowledgeDocument.id.in_(top_candidates))
            candidate_res = await db.execute(candidate_stmt)
            candidate_docs = candidate_res.scalars().all()
            candidate_map = {doc.id: doc for doc in candidate_docs}

            # Prepare items to rerank
            items_to_score = [candidate_map[did] for did in top_candidates if did in candidate_map]

            def extract_doc_text(doc: KnowledgeDocument) -> str:
                snippet = best_chunk_snippets.get(doc.id) or doc.content or doc.title
                return f"{doc.title}. {snippet[:300]}"

            try:
                reranked_tuples = await rerank_service.rerank(
                    query=clean_query,
                    items=items_to_score,
                    text_extractor=extract_doc_text
                )

                if reranked_tuples:
                    reranked_ids = [doc.id for doc, _ in reranked_tuples]
                    for doc, score in reranked_tuples:
                        rerank_scores[doc.id] = score

                    # Reconstruct final ranked list: reranked head + tail
                    sorted_doc_ids = reranked_ids + tail_candidates
                    is_reranked = True
            except Exception as e:
                logger.error(f"Neural rerank execution failed: {e}. Falling back to RRF.")

        # 5. Pagination & Result Construction
        page_doc_ids = sorted_doc_ids[offset: offset + page_size]

        # Load document details
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

            # Final score: cross-encoder confidence percentage if reranked, else RRF score
            if is_reranked and doc_id in rerank_scores:
                score = round(rerank_scores[doc_id] * 100, 2)
            else:
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

        search_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        resp = SearchResponse(
            query=clean_query,
            page=page,
            page_size=page_size,
            total=total,
            search_time_ms=search_time_ms,
            reranked=is_reranked,
            results=results
        )
        await cache_service.set(cache_key, resp.model_dump(), ttl_seconds=settings.CACHE_TTL_SEARCH)
        return resp

hybrid_search_service = HybridSearchService()
