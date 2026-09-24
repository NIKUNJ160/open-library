import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Open Library Knowledge Engine" in data["name"]
    assert data["version"] == "0.1.0"

def test_docs_endpoint():
    response = client.get("/docs")
    assert response.status_code == 200
