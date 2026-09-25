import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class LinkedDocumentSummary(BaseModel):
    id: uuid.UUID
    title: str
    source: str
    doc_type: str
    role: str
    url: Optional[str] = None
    published_at: Optional[str] = None

class EntitySummary(BaseModel):
    id: int
    name: str
    entity_type: str
    description: Optional[str] = None
    external_id: Optional[str] = None
    source: Optional[str] = None
    doc_count: int = 0

class EntityDetail(BaseModel):
    id: int
    name: str
    entity_type: str
    description: Optional[str] = None
    external_id: Optional[str] = None
    source: Optional[str] = None
    aliases: Optional[List[str]] = None
    linked_documents: List[LinkedDocumentSummary] = []

class EntityListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[EntitySummary]

class GraphNode(BaseModel):
    id: str
    label: str
    category: str  # "entity" or "document"
    type: str      # "person", "topic", "org", "paper", "book", etc.
    entity_id: Optional[int] = None
    document_id: Optional[str] = None
    description: Optional[str] = None
    external_id: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    is_root: bool = False
    size: int = 16

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    weight: float = 1.0

class GraphResponse(BaseModel):
    root_id: Optional[str] = None
    nodes: List[GraphNode]
    edges: List[GraphEdge]
