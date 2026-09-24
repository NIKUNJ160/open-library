import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base
from app.config import settings

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False, default="document", index=True)
    url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en", index=True)
    license: Mapped[str] = mapped_column(String(100), default="Public Domain")
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    entities: Mapped[List["DocumentEntity"]] = relationship("DocumentEntity", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_knowledge_documents_source_source_id", "source", "source_id", unique=True),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(settings.EMBEDDING_DIMENSION), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    document: Mapped["KnowledgeDocument"] = relationship("KnowledgeDocument", back_populates="chunks")

    __table_args__ = (
        Index("ix_document_chunks_document_index", "document_id", "chunk_index", unique=True),
    )
