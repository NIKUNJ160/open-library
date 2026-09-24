import uuid
from typing import List, Optional
from pydantic import BaseModel, Field

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, description="User question to answer using knowledge sources")
    top_k: int = Field(5, ge=1, le=20, description="Number of context passages to retrieve")
    stream: bool = Field(False, description="Whether to stream response using SSE")

class SourceCitation(BaseModel):
    doc_id: uuid.UUID
    source: str
    source_id: str
    title: str
    url: Optional[str] = None
    license: str
    snippet: str

class AskResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceCitation]
