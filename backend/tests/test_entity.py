import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import KnowledgeDocument
from app.models.entity import Entity, DocumentEntity
from app.services.entity_service import EntityService, entity_service
from app.db.session import get_db

client = TestClient(app)

@pytest.mark.asyncio
async def test_resolve_or_create_entity_new():
    service = EntityService()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # When querying by ext_id and name+type, return None (not found)
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    entity = await service.resolve_or_create_entity(
        db=mock_db,
        name="  Albert Einstein  ",
        entity_type="PERSON",
        external_id="0000-0001-2345-6789",
        source="wikidata",
        description="Theoretical physicist"
    )

    assert entity.name == "Albert Einstein"
    assert entity.entity_type == "person"
    assert entity.external_id == "0000-0001-2345-6789"
    assert entity.description == "Theoretical physicist"
    assert mock_db.add.called
    assert mock_db.flush.called

@pytest.mark.asyncio
async def test_resolve_or_create_entity_dedup_by_orcid():
    service = EntityService()
    mock_db = AsyncMock()

    existing_entity = Entity(
        id=42,
        name="A. Einstein",
        entity_type="person",
        external_id="https://orcid.org/0000-0001-2345-6789",
        source="orcid",
        description=None,
        aliases=["Albert Einstein"]
    )

    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = existing_entity
    mock_db.execute.return_value = mock_res

    resolved = await service.resolve_or_create_entity(
        db=mock_db,
        name="Albert Einstein",
        entity_type="person",
        external_id="https://orcid.org/0000-0001-2345-6789",
        description="Developed general relativity",
        aliases=["Einstein"]
    )

    assert resolved.id == 42
    assert resolved.description == "Developed general relativity"
    assert "Einstein" in resolved.aliases
    assert "Albert Einstein" in resolved.aliases
    # Should NOT have called add for a duplicate
    assert not mock_db.add.called

@pytest.mark.asyncio
async def test_extract_and_link_document_metadata():
    service = EntityService()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # Mock execute for resolving entities
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    doc_id = uuid.uuid4()
    doc = KnowledgeDocument(
        id=doc_id,
        source="openalex",
        source_id="W123456",
        title="Deep Learning Foundations",
        content="Overview of deep neural networks.",
        doc_type="paper",
        metadata_json={
            "authors": [
                {"name": "Yann LeCun", "orcid": "0000-0002-1234-5678"},
                "Yoshua Bengio"
            ],
            "topics": ["Deep learning", "Neural networks"],
            "venue": "Nature",
            "wikibase_item": "Q2539"
        }
    )

    linked = await service.extract_and_link_document(mock_db, doc)

    assert len(linked) >= 4
    names = [e.name for e in linked]
    assert "Yann LeCun" in names
    assert "Yoshua Bengio" in names
    assert "Deep learning" in names
    assert "Nature" in names

def test_entity_api_list(monkeypatch):
    async def mock_list(*args, **kwargs):
        return 1, [
            {
                "id": 1,
                "name": "Albert Einstein",
                "entity_type": "person",
                "description": "Theoretical physicist",
                "external_id": "Q937",
                "source": "wikidata",
                "doc_count": 5
            }
        ]

    monkeypatch.setattr(entity_service, "list_entities", mock_list)

    class MockDb:
        pass

    async def override_get_db():
        yield MockDb()

    app.dependency_overrides[get_db] = override_get_db
    try:
        resp = client.get("/api/v1/entities?q=Einstein")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Albert Einstein"
        assert data["items"][0]["doc_count"] == 5
    finally:
        app.dependency_overrides.clear()

def test_entity_api_detail(monkeypatch):
    doc_id = uuid.uuid4()
    async def mock_detail(*args, **kwargs):
        entity_id = args[1] if len(args) > 1 else kwargs.get("entity_id")
        if entity_id == 1:
            return {
                "id": 1,
                "name": "Albert Einstein",
                "entity_type": "person",
                "description": "Theoretical physicist",
                "external_id": "Q937",
                "source": "wikidata",
                "aliases": ["A. Einstein"],
                "linked_documents": [
                    {
                        "id": doc_id,
                        "title": "Relativity",
                        "source": "openlibrary",
                        "doc_type": "book",
                        "role": "author",
                        "url": "https://openlibrary.org/works/OL27479W",
                        "published_at": "1916-01-01T00:00:00"
                    }
                ]
            }
        return None

    monkeypatch.setattr(entity_service, "get_entity_detail", mock_detail)

    class MockDb:
        pass

    async def override_get_db():
        yield MockDb()

    app.dependency_overrides[get_db] = override_get_db
    try:
        # Success case
        resp = client.get("/api/v1/entities/1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Albert Einstein"
        assert len(data["linked_documents"]) == 1
        assert data["linked_documents"][0]["role"] == "author"

        # Not found case
        resp_404 = client.get("/api/v1/entities/9999")
        assert resp_404.status_code == 404
    finally:
        app.dependency_overrides.clear()

def test_entity_api_graph_and_overview(monkeypatch):
    async def mock_subgraph(*args, **kwargs):
        entity_id = kwargs.get("entity_id") or (args[1] if len(args) > 1 else 1)
        if entity_id == 1:
            return {
                "root_id": "entity-1",
                "nodes": [
                    {
                        "id": "entity-1",
                        "label": "Albert Einstein",
                        "category": "entity",
                        "type": "person",
                        "entity_id": 1,
                        "is_root": True,
                        "size": 24
                    },
                    {
                        "id": "doc-111",
                        "label": "Relativity",
                        "category": "document",
                        "type": "book",
                        "document_id": "111",
                        "is_root": False,
                        "size": 16
                    }
                ],
                "edges": [
                    {
                        "source": "entity-1",
                        "target": "doc-111",
                        "label": "author",
                        "weight": 1.0
                    }
                ]
            }
        return {"nodes": [], "edges": []}

    async def mock_overview(*args, **kwargs):
        return {
            "root_id": None,
            "nodes": [
                {
                    "id": "entity-1",
                    "label": "Albert Einstein",
                    "category": "entity",
                    "type": "person",
                    "entity_id": 1,
                    "is_root": False,
                    "size": 20
                }
            ],
            "edges": []
        }

    monkeypatch.setattr(entity_service, "get_entity_subgraph", mock_subgraph)
    monkeypatch.setattr(entity_service, "get_graph_overview", mock_overview)

    class MockDb:
        pass

    async def override_get_db():
        yield MockDb()

    app.dependency_overrides[get_db] = override_get_db
    try:
        # Subgraph endpoint
        resp_graph = client.get("/api/v1/entities/1/graph")
        assert resp_graph.status_code == 200
        g_data = resp_graph.json()
        assert g_data["root_id"] == "entity-1"
        assert len(g_data["nodes"]) == 2
        assert len(g_data["edges"]) == 1
        assert g_data["edges"][0]["label"] == "author"

        # Overview endpoint
        resp_overview = client.get("/api/v1/graph/overview")
        assert resp_overview.status_code == 200
        o_data = resp_overview.json()
        assert len(o_data["nodes"]) == 1

        # 404 for missing entity graph
        resp_missing = client.get("/api/v1/entities/999/graph")
        assert resp_missing.status_code == 404
    finally:
        app.dependency_overrides.clear()
