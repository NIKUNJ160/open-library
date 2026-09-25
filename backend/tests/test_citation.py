import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.document import KnowledgeDocument
from app.services.citation_service import citation_service
from app.db.session import get_db

client = TestClient(app)

def make_sample_paper():
    return KnowledgeDocument(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        source="openalex",
        source_id="W2741809807",
        title="Attention Is All You Need",
        content="Transformer model architecture.",
        doc_type="paper",
        url="https://arxiv.org/abs/1706.03762",
        published_at=datetime(2017, 6, 12, tzinfo=timezone.utc),
        language="en",
        license="CC-BY-4.0",
        metadata_json={
            "doi": "10.48550/arxiv.1706.03762",
            "venue": "NeurIPS",
            "authors": [
                {"name": "Ashish Vaswani", "family": "Vaswani", "given": "Ashish"},
                {"name": "Noam Shazeer", "family": "Shazeer", "given": "Noam"}
            ]
        }
    )

def test_citation_bibtex():
    doc = make_sample_paper()
    bibtex = citation_service.to_bibtex(doc)
    assert "@article{vaswani2017attention," in bibtex
    assert "title = {Attention Is All You Need}" in bibtex
    assert "author = {Vaswani, Ashish and Shazeer, Noam}" in bibtex
    assert "journal = {NeurIPS}" in bibtex
    assert "year = {2017}" in bibtex
    assert "doi = {10.48550/arxiv.1706.03762}" in bibtex

def test_citation_apa():
    doc = make_sample_paper()
    apa = citation_service.to_apa(doc)
    assert "Vaswani, A., & Shazeer, N." in apa
    assert "(2017)" in apa
    assert "Attention Is All You Need." in apa
    assert "*NeurIPS*." in apa
    assert "https://doi.org/10.48550/arxiv.1706.03762" in apa

def test_citation_mla():
    doc = make_sample_paper()
    mla = citation_service.to_mla(doc)
    assert 'Vaswani, Ashish, and Noam Shazeer.' in mla
    assert '"Attention Is All You Need."' in mla
    assert '*NeurIPS*,' in mla
    assert '2017,' in mla
    assert 'doi:10.48550/arxiv.1706.03762.' in mla

def test_citation_chicago():
    doc = make_sample_paper()
    chicago = citation_service.to_chicago(doc)
    assert 'Vaswani, Ashish, and Noam Shazeer.' in chicago
    assert '2017.' in chicago
    assert '"Attention Is All You Need."' in chicago
    assert '*NeurIPS*.' in chicago
    assert 'https://doi.org/10.48550/arxiv.1706.03762.' in chicago

def test_citation_all():
    doc = make_sample_paper()
    all_cites = citation_service.generate_all(doc)
    assert "bibtex" in all_cites
    assert "apa" in all_cites
    assert "mla" in all_cites
    assert "chicago" in all_cites

class MockAsyncResult:
    def __init__(self, item):
        self._item = item
    def scalar_one_or_none(self):
        return self._item

class MockAsyncSession:
    def __init__(self, doc):
        self.doc = doc
    async def execute(self, stmt):
        return MockAsyncResult(self.doc)

def test_citation_api_endpoints():
    sample_doc = make_sample_paper()
    async def override_get_db():
        yield MockAsyncSession(sample_doc)

    app.dependency_overrides[get_db] = override_get_db
    try:
        # Test single citation endpoint
        resp = client.get(f"/api/v1/documents/{sample_doc.id}/citation?format=bibtex")
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "bibtex"
        assert "@article" in data["citation"]

        # Test invalid format validation
        resp_invalid = client.get(f"/api/v1/documents/{sample_doc.id}/citation?format=invalid_format")
        assert resp_invalid.status_code == 422

        # Test all citations endpoint
        resp_all = client.get(f"/api/v1/documents/{sample_doc.id}/citations")
        assert resp_all.status_code == 200
        all_data = resp_all.json()
        assert "bibtex" in all_data["citations"]
        assert "apa" in all_data["citations"]
        assert "mla" in all_data["citations"]
        assert "chicago" in all_data["citations"]
    finally:
        app.dependency_overrides.clear()
