import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, ForeignKey, Integer, Index, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), default="topic", index=True) # person, org, topic, place
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True) # e.g. Q42 or ORCID
    source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aliases: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)

    # Relationship
    documents: Mapped[List["DocumentEntity"]] = relationship("DocumentEntity", back_populates="entity")


class DocumentEntity(Base):
    __tablename__ = "document_entities"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="mentioned") # author, subject, mentioned

    # Relationships
    document: Mapped["KnowledgeDocument"] = relationship("KnowledgeDocument", back_populates="entities")
    entity: Mapped["Entity"] = relationship("Entity", back_populates="documents")

    __table_args__ = (
        PrimaryKeyConstraint("document_id", "entity_id", "role"),
        Index("ix_document_entities_entity_role", "entity_id", "role"),
    )
