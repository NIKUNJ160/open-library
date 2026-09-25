import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class ChunkDetail(BaseModel):
    chunk_index: int
    text: str

class EntityMention(BaseModel):
    id: int
    name: str
    entity_type: str
    role: str
    external_id: Optional[str] = None

class DocumentDetail(BaseModel):
    id: uuid.UUID
    source: str
    source_id: str
    title: str
    content: Optional[str] = None
    doc_type: str
    url: Optional[str] = None
    published_at: Optional[datetime] = None
    language: str
    license: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    chunks: Optional[List[ChunkDetail]] = None
    entities: Optional[List[EntityMention]] = None

class CitationResponse(BaseModel):
    document_id: uuid.UUID
    format: str
    citation: str

class AllCitationsResponse(BaseModel):
    document_id: uuid.UUID
    citations: Dict[str, str]
