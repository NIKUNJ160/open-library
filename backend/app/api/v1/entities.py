from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.entity import EntityListResponse, EntityDetail, GraphResponse
from app.services.entity_service import entity_service

router = APIRouter()

@router.get("/entities", response_model=EntityListResponse, tags=["entities"])
async def list_entities(
    q: Optional[str] = Query(None, description="Search entities by name"),
    entity_type: Optional[str] = Query(None, description="Filter by type (person, topic, org, place)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Search and list entities across books, articles, and papers with document connection counts."""
    total, items = await entity_service.list_entities(
        db=db,
        q=q,
        entity_type=entity_type,
        page=page,
        page_size=page_size
    )
    return EntityListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )

@router.get("/entities/{entity_id}", response_model=EntityDetail, tags=["entities"])
async def get_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Fetch entity profile, canonical external identifiers (ORCID/Wikidata), and linked documents."""
    detail = await entity_service.get_entity_detail(db, entity_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )
    return detail

@router.get("/entities/{entity_id}/graph", response_model=GraphResponse, tags=["graph"])
async def get_entity_graph(
    entity_id: int,
    max_docs: int = Query(15, ge=1, le=50, description="Max linked documents in subgraph"),
    max_co_entities: int = Query(20, ge=1, le=50, description="Max co-occurring entities in subgraph"),
    db: AsyncSession = Depends(get_db)
):
    """Generate interactive knowledge subgraph for an entity, including connected documents and co-occurring entities."""
    graph_data = await entity_service.get_entity_subgraph(
        db=db,
        entity_id=entity_id,
        max_docs=max_docs,
        max_co_entities=max_co_entities
    )
    if not graph_data.get("nodes"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found or has no graph connections."
        )
    return graph_data

@router.get("/graph/overview", response_model=GraphResponse, tags=["graph"])
async def get_graph_overview(
    limit_entities: int = Query(25, ge=5, le=100, description="Top connected entities to display"),
    limit_edges: int = Query(40, ge=5, le=200, description="Max document connection edges"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve global knowledge graph overview showing highest-degree hubs and their connections."""
    return await entity_service.get_graph_overview(
        db=db,
        limit_entities=limit_entities,
        limit_edges=limit_edges
    )
