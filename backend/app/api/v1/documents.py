import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.document import KnowledgeDocument, DocumentChunk
from app.models.entity import DocumentEntity, Entity
from app.schemas.document import DocumentDetail, ChunkDetail, EntityMention

router = APIRouter()

@router.get("/documents/{document_id}", response_model=DocumentDetail, tags=["documents"])
async def get_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fetch full document details, including passage chunks and associated entity mentions."""
    stmt = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.id == document_id)
        .options(
            selectinload(KnowledgeDocument.chunks),
            selectinload(KnowledgeDocument.entities).joinedload(DocumentEntity.entity)
        )
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )

    chunk_details = [
        ChunkDetail(chunk_index=c.chunk_index, text=c.text)
        for c in sorted(doc.chunks, key=lambda x: x.chunk_index)
    ]

    entity_mentions = [
        EntityMention(
            id=de.entity.id,
            name=de.entity.name,
            entity_type=de.entity.entity_type,
            role=de.role,
            external_id=de.entity.external_id
        )
        for de in doc.entities if de.entity
    ]

    return DocumentDetail(
        id=doc.id,
        source=doc.source,
        source_id=doc.source_id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        url=doc.url,
        published_at=doc.published_at,
        language=doc.language,
        license=doc.license,
        metadata_json=doc.metadata_json,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunks=chunk_details,
        entities=entity_mentions
    )
