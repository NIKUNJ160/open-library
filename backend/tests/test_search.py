import pytest
import uuid
from app.services.search_service import HybridSearchService

def test_rrf_scoring_logic():
    service = HybridSearchService(rrf_k=60)
    
    doc1 = uuid.uuid4()
    doc2 = uuid.uuid4()
    doc3 = uuid.uuid4()

    text_ranks = [doc1, doc2] # doc1 is rank 1, doc2 is rank 2
    vec_ranks = [doc2, doc3]  # doc2 is rank 1, doc3 is rank 2

    rrf_scores = {}
    for rank, doc_id in enumerate(text_ranks, start=1):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (service.rrf_k + rank))

    for rank, doc_id in enumerate(vec_ranks, start=1):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (service.rrf_k + rank))

    # doc2 appeared in BOTH text and vector top results -> should have the highest score!
    assert rrf_scores[doc2] > rrf_scores[doc1]
    assert rrf_scores[doc2] > rrf_scores[doc3]
    # doc1 (rank 1 text) should beat doc3 (rank 2 vec) because rank 1 > rank 2
    assert rrf_scores[doc1] > rrf_scores[doc3]
