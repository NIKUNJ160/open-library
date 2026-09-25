import pytest
import uuid
from app.services.rerank_service import RerankService, rerank_service
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db

client = TestClient(app)

def test_sigmoid_math():
    assert RerankService.sigmoid(0.0) == 0.5
    assert RerankService.sigmoid(10.0) > 0.999
    assert RerankService.sigmoid(-10.0) < 0.001
    # Extreme bounds testing
    assert RerankService.sigmoid(100.0) == 1.0
    assert RerankService.sigmoid(-100.0) == 0.0

def test_rerank_fidelity():
    query = "deep residual neural networks for image recognition"
    items = [
        {"id": 1, "text": "Deep Residual Learning for Image Recognition. We present residual networks (ResNet) to ease training of deep neural networks."},
        {"id": 2, "text": "A delicious recipe for homemade tomato soup and freshly baked bread."},
        {"id": 3, "text": "Computer vision and convolutional neural networks architectures for classification."}
    ]

    reranked = rerank_service.rerank_sync(
        query=query,
        items=items,
        text_extractor=lambda x: x["text"]
    )

    assert len(reranked) == 3
    # Top item must be the ResNet paper
    top_item, top_score = reranked[0]
    last_item, last_score = reranked[-1]

    assert top_item["id"] == 1
    assert last_item["id"] == 2
    assert top_score > last_score
    # Score discrimination
    assert top_score > 0.70
    assert last_score < 0.20

def test_rerank_empty():
    assert rerank_service.rerank_sync("", ["doc"], lambda x: x) == []
    assert rerank_service.rerank_sync("query", [], lambda x: x) == []

class MockAsyncResult:
    def __init__(self, items):
        self._items = items
    def fetchall(self):
        return self._items
    def scalars(self):
        return self
    def all(self):
        return []

class MockSearchSession:
    async def execute(self, stmt):
        return MockAsyncResult([])

def test_search_api_rerank_toggle():
    async def override_get_db():
        yield MockSearchSession()

    app.dependency_overrides[get_db] = override_get_db
    try:
        resp = client.get("/api/v1/search?q=relativity&enable_rerank=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "reranked" in data
        assert "search_time_ms" in data

        resp_no_rerank = client.get("/api/v1/search?q=relativity&enable_rerank=false")
        assert resp_no_rerank.status_code == 200
        data_no_rerank = resp_no_rerank.json()
        assert data_no_rerank["reranked"] is False
    finally:
        app.dependency_overrides.clear()
