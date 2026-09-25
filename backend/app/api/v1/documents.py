import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.document import KnowledgeDocument, DocumentChunk
from app.models.entity import DocumentEntity, Entity
from app.schemas.document import DocumentDetail, ChunkDetail, EntityMention, CitationResponse, AllCitationsResponse
from app.services.citation_service import citation_service

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

@router.get("/documents/{document_id}/citation", response_model=CitationResponse, tags=["citations"])
async def get_document_citation(
    document_id: uuid.UUID,
    format: str = Query("bibtex", pattern="^(bibtex|apa|mla|chicago)$", description="Citation format style"),
    db: AsyncSession = Depends(get_db)
):
    """Generate a single formatted citation (BibTeX, APA, MLA, or Chicago) for the specified document."""
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )

    fmt = format.lower()
    if fmt == "bibtex":
        citation_text = citation_service.to_bibtex(doc)
    elif fmt == "apa":
        citation_text = citation_service.to_apa(doc)
    elif fmt == "mla":
        citation_text = citation_service.to_mla(doc)
    elif fmt == "chicago":
        citation_text = citation_service.to_chicago(doc)
    else:
        citation_text = citation_service.to_bibtex(doc)

    return CitationResponse(
        document_id=doc.id,
        format=fmt,
        citation=citation_text
    )

@router.get("/documents/{document_id}/citations", response_model=AllCitationsResponse, tags=["citations"])
async def get_all_document_citations(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Generate all supported citation styles (BibTeX, APA, MLA, Chicago) for the specified document."""
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )

    citations = citation_service.generate_all(doc)
    return AllCitationsResponse(
        document_id=doc.id,
        citations=citations
    )
