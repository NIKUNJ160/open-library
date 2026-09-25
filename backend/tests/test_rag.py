import uuid
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.search import SearchResultItem, SearchResponse
from app.services.rag_service import rag_service
from app.db.session import get_db

client = TestClient(app)

def make_sample_search_items():
    return [
        SearchResultItem(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            source="openalex",
            source_id="W2741809807",
            title="Attention Is All You Need",
            snippet="We propose the Transformer, a model architecture eschewing recurrence and relying on attention mechanisms.",
            doc_type="paper",
            url="https://arxiv.org/abs/1706.03762",
            license="CC-BY-4.0",
            score=98.5,
            authors=["Ashish Vaswani", "Noam Shazeer"]
        ),
        SearchResultItem(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
            source="europepmc",
            source_id="PMC6541524",
            title="CRISPR-Cas9 Bacterial Immunity",
            snippet="Cas9 endonuclease is guided by dual-RNA structures to direct site-specific cleavage of target DNA.",
            doc_type="paper",
            url="https://europepmc.org/articles/PMC6541524",
            license="Open Access",
            score=95.2,
            authors=["Martin Jinek", "Jennifer A Doudna"]
        )
    ]

def test_rag_format_context():
    items = make_sample_search_items()
    context_text, sources = rag_service.format_context(items)

    assert "[1] Title: Attention Is All You Need" in context_text
    assert "[2] Title: CRISPR-Cas9 Bacterial Immunity" in context_text
    assert len(sources) == 2
    assert sources[0].doc_id == items[0].id
    assert sources[1].title == items[1].title

def test_rag_local_synthesizer():
    items = make_sample_search_items()
    answer = rag_service._local_synthesize("What is transformer architecture?", items)

    assert "[1]" in answer
    assert "Attention Is All You Need" in answer
    assert "authoritative public knowledge records" in answer

    # Test empty fallback
    empty_ans = rag_service._local_synthesize("random query", [])
    assert "cannot answer this question" in empty_ans

class MockSearchDb:
    pass

def test_ask_json_endpoint(monkeypatch):
    items = make_sample_search_items()
    mock_resp = SearchResponse(
        query="transformer",
        page=1,
        page_size=5,
        total=2,
        search_time_ms=12.5,
        reranked=True,
        results=items
    )

    async def mock_search(*args, **kwargs):
        return mock_resp

    from app.services.search_service import hybrid_search_service
    monkeypatch.setattr(hybrid_search_service, "search", mock_search)

    async def override_get_db():
        yield MockSearchDb()

    app.dependency_overrides[get_db] = override_get_db
    try:
        payload = {"question": "What is transformer architecture?", "top_k": 5, "stream": False}
        resp = client.post("/api/v1/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["question"] == "What is transformer architecture?"
        assert "[1]" in data["answer"]
        assert len(data["sources"]) == 2
        assert data["sources"][0]["title"] == "Attention Is All You Need"
    finally:
        app.dependency_overrides.clear()

def test_ask_stream_endpoint(monkeypatch):
    items = make_sample_search_items()
    mock_resp = SearchResponse(
        query="transformer",
        page=1,
        page_size=5,
        total=2,
        search_time_ms=12.5,
        reranked=True,
        results=items
    )

    async def mock_search(*args, **kwargs):
        return mock_resp

    from app.services.search_service import hybrid_search_service
    monkeypatch.setattr(hybrid_search_service, "search", mock_search)

    async def override_get_db():
        yield MockSearchDb()

    app.dependency_overrides[get_db] = override_get_db
    try:
        payload = {"question": "What is transformer architecture?", "top_k": 5, "stream": True}
        resp = client.post("/api/v1/ask", json=payload)
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

        content = resp.text
        assert 'event": "sources"' in content
        assert 'event": "token"' in content
        assert 'event": "done"' in content
    finally:
        app.dependency_overrides.clear()
