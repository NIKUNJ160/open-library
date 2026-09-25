import pytest
from app.services.embedding_service import embedding_service
from app.config import settings

def test_embed_query_dimension():
    vec = embedding_service.embed_query("Biomedical genetics and RNA")
    assert isinstance(vec, list)
    assert len(vec) == settings.EMBEDDING_DIMENSION
    # Check that vector contains non-zero floats
    assert any(abs(v) > 0.0001 for v in vec)

def test_embed_documents_batch():
    texts = [
        "First document about astrophysics.",
        "Second document regarding quantum computing algorithms."
    ]
    vecs = embedding_service.embed_documents(texts)
    assert len(vecs) == 2
    assert len(vecs[0]) == settings.EMBEDDING_DIMENSION
    assert len(vecs[1]) == settings.EMBEDDING_DIMENSION
