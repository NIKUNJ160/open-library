import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SearchResultItem(BaseModel):
    id: uuid.UUID
    source: str
    source_id: str
    title: str
    snippet: str
    doc_type: str
    url: Optional[str] = None
    license: str
    score: float
    published_at: Optional[str] = None
    authors: Optional[List[str]] = None

class SearchResponse(BaseModel):
    query: str
    page: int
    page_size: int
    total: int
    results: List[SearchResultItem]
