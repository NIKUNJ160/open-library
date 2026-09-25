import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from sqlalchemy.orm import selectinload, joinedload
from app.models.document import KnowledgeDocument
from app.models.entity import Entity, DocumentEntity

logger = logging.getLogger(__name__)

class EntityService:
    """
    Knowledge Graph & Entity Resolution Service.
    Resolves, links, deduplicates, and extracts entities across books, encyclopedias,
    and scholarly papers. Provides graph exploration queries and subgraph generation.
    """

    async def resolve_or_create_entity(
        self,
        db: AsyncSession,
        name: str,
        entity_type: str = "topic",
        external_id: Optional[str] = None,
        source: Optional[str] = None,
        description: Optional[str] = None,
        aliases: Optional[List[str]] = None
    ) -> Entity:
        """
        Deduplicates and canonicalizes an entity by external_id (e.g. ORCID, Wikidata QID)
        or normalized name + entity_type matching.
        """
        clean_name = name.strip()
        clean_ext_id = external_id.strip() if external_id else None
        clean_type = entity_type.lower().strip()

        entity: Optional[Entity] = None

        # 1. Deduplicate by external identifier if provided
        if clean_ext_id:
            stmt = select(Entity).where(Entity.external_id == clean_ext_id)
            res = await db.execute(stmt)
            entity = res.scalar_one_or_none()

        # 2. Deduplicate by name + type
        if not entity:
            stmt = select(Entity).where(
                and_(
                    func.lower(Entity.name) == clean_name.lower(),
                    Entity.entity_type == clean_type
                )
            )
            res = await db.execute(stmt)
            entity = res.scalar_one_or_none()

        # 3. If exists, enrich missing attributes
        if entity:
            updated = False
            if clean_ext_id and not entity.external_id:
                entity.external_id = clean_ext_id
                updated = True
            if description and not entity.description:
                entity.description = description
                updated = True
            if source and not entity.source:
                entity.source = source
                updated = True
            if aliases:
                curr_aliases = set(entity.aliases or [])
                new_aliases = curr_aliases.union(aliases)
                if len(new_aliases) > len(curr_aliases):
                    entity.aliases = list(new_aliases)
                    updated = True
            return entity

        # 4. Create new entity
        new_entity = Entity(
            name=clean_name,
            entity_type=clean_type,
            external_id=clean_ext_id,
            source=source,
            description=description,
            aliases=aliases or []
        )
        db.add(new_entity)
        await db.flush()
        return new_entity

    async def link_document_entity(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        entity_id: int,
        role: str = "mentioned"
    ) -> DocumentEntity:
        """Links a document to an entity with a specific semantic role."""
        stmt = select(DocumentEntity).where(
            and_(
                DocumentEntity.document_id == document_id,
                DocumentEntity.entity_id == entity_id,
                DocumentEntity.role == role
            )
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        link = DocumentEntity(
            document_id=document_id,
            entity_id=entity_id,
            role=role
        )
        db.add(link)
        return link

    async def extract_and_link_document(
        self,
        db: AsyncSession,
        doc: KnowledgeDocument
    ) -> List[Entity]:
        """
        Extracts entities from document metadata (authors, topics, journals, institutions,
        and Wikidata references) and creates knowledge graph edges.
        """
        meta = doc.metadata_json or {}
        linked_entities: List[Entity] = []

        # 1. Extract Authors
        authors = meta.get("authors") or []
        for a in authors:
            name = None
            orcid = None
            if isinstance(a, dict):
                name = a.get("name")
                orcid = a.get("orcid")
            elif isinstance(a, str):
                name = a

            if name:
                ent = await self.resolve_or_create_entity(
                    db=db,
                    name=name,
                    entity_type="person",
                    external_id=orcid,
                    source="orcid" if orcid else doc.source
                )
                await self.link_document_entity(db, doc.id, ent.id, role="author")
                linked_entities.append(ent)

        # 2. Extract Topics / Concepts
        topics = meta.get("topics") or meta.get("subjects") or []
        for t in topics:
            t_name = t if isinstance(t, str) else t.get("name")
            if t_name and len(t_name) > 2:
                ent = await self.resolve_or_create_entity(
                    db=db,
                    name=t_name,
                    entity_type="topic",
                    source=doc.source
                )
                await self.link_document_entity(db, doc.id, ent.id, role="subject")
                linked_entities.append(ent)

        # 3. Extract Venue / Publisher / Organization
        venue = meta.get("venue") or meta.get("publisher")
        if venue and isinstance(venue, str):
            ent = await self.resolve_or_create_entity(
                db=db,
                name=venue,
                entity_type="org",
                source=doc.source
            )
            await self.link_document_entity(db, doc.id, ent.id, role="publisher")
            linked_entities.append(ent)

        # 4. Extract Wikidata Item for Wikipedia articles
        if meta.get("wikibase_item"):
            ent = await self.resolve_or_create_entity(
                db=db,
                name=doc.title,
                entity_type="topic",
                external_id=meta["wikibase_item"],
                source="wikidata",
                description=doc.content[:200] if doc.content else None
            )
            await self.link_document_entity(db, doc.id, ent.id, role="subject")
            linked_entities.append(ent)

        return linked_entities

    async def get_entity_subgraph(
        self,
        db: AsyncSession,
        entity_id: int,
        max_docs: int = 15,
        max_co_entities: int = 20
    ) -> Dict[str, Any]:
        """
        Traverses the knowledge graph starting from entity_id:
        Returns nodes (Entity, Document) and edges (authored, published_in, co_occurs_with).
        """
        # Fetch root entity
        stmt = select(Entity).where(Entity.id == entity_id)
        res = await db.execute(stmt)
        root_entity = res.scalar_one_or_none()

        if not root_entity:
            return {"nodes": [], "edges": []}

        nodes_map: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []

        root_node_id = f"entity-{root_entity.id}"
        nodes_map[root_node_id] = {
            "id": root_node_id,
            "entity_id": root_entity.id,
            "label": root_entity.name,
            "category": "entity",
            "type": root_entity.entity_type,
            "description": root_entity.description,
            "external_id": root_entity.external_id,
            "is_root": True,
            "size": 24
        }

        # Fetch connected documents
        doc_stmt = (
            select(DocumentEntity)
            .where(DocumentEntity.entity_id == entity_id)
            .options(joinedload(DocumentEntity.document))
            .limit(max_docs)
        )
        doc_res = await db.execute(doc_stmt)
        doc_links = doc_res.scalars().all()

        doc_ids = []
        for dl in doc_links:
            if not dl.document:
                continue
            d = dl.document
            doc_ids.append(d.id)
            doc_node_id = f"doc-{d.id}"
            if doc_node_id not in nodes_map:
                nodes_map[doc_node_id] = {
                    "id": doc_node_id,
                    "document_id": str(d.id),
                    "label": d.title,
                    "category": "document",
                    "type": d.doc_type,
                    "source": d.source,
                    "url": d.url,
                    "size": 16
                }

            # Edge between root entity and document
            edges.append({
                "source": root_node_id,
                "target": doc_node_id,
                "label": dl.role,
                "weight": 1.0
            })

        # Fetch co-occurring entities in those same documents
        if doc_ids:
            co_stmt = (
                select(DocumentEntity)
                .where(
                    and_(
                        DocumentEntity.document_id.in_(doc_ids),
                        DocumentEntity.entity_id != entity_id
                    )
                )
                .options(joinedload(DocumentEntity.entity))
                .limit(max_co_entities)
            )
            co_res = await db.execute(co_stmt)
            co_links = co_res.scalars().all()

            for cl in co_links:
                if not cl.entity:
                    continue
                co_e = cl.entity
                co_node_id = f"entity-{co_e.id}"
                doc_node_id = f"doc-{cl.document_id}"

                if co_node_id not in nodes_map:
                    nodes_map[co_node_id] = {
                        "id": co_node_id,
                        "entity_id": co_e.id,
                        "label": co_e.name,
                        "category": "entity",
                        "type": co_e.entity_type,
                        "external_id": co_e.external_id,
                        "is_root": False,
                        "size": 14
                    }

                # Edge between co-occurring entity and document
                edges.append({
                    "source": co_node_id,
                    "target": doc_node_id,
                    "label": cl.role,
                    "weight": 1.0
                })

        return {
            "root_id": root_node_id,
            "nodes": list(nodes_map.values()),
            "edges": edges
        }

    async def get_graph_overview(
        self,
        db: AsyncSession,
        limit_entities: int = 25,
        limit_edges: int = 40
    ) -> Dict[str, Any]:
        """
        Generates global graph overview containing highest-degree entities and documents.
        """
        # Top connected entities by document links count
        count_stmt = (
            select(
                Entity,
                func.count(DocumentEntity.document_id).label("doc_count")
            )
            .join(DocumentEntity, Entity.id == DocumentEntity.entity_id)
            .group_by(Entity.id)
            .order_by(func.count(DocumentEntity.document_id).desc())
            .limit(limit_entities)
        )
        res = await db.execute(count_stmt)
        top_entities = res.all()

        nodes_map: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []

        entity_ids = []
        for ent, doc_count in top_entities:
            entity_ids.append(ent.id)
            node_id = f"entity-{ent.id}"
            nodes_map[node_id] = {
                "id": node_id,
                "entity_id": ent.id,
                "label": ent.name,
                "category": "entity",
                "type": ent.entity_type,
                "external_id": ent.external_id,
                "doc_count": doc_count,
                "size": max(12, min(28, 12 + doc_count * 2))
            }

        if entity_ids:
            links_stmt = (
                select(DocumentEntity)
                .where(DocumentEntity.entity_id.in_(entity_ids))
                .options(joinedload(DocumentEntity.document))
                .limit(limit_edges)
            )
            links_res = await db.execute(links_stmt)
            for l in links_res.scalars().all():
                if not l.document:
                    continue
                d = l.document
                doc_node_id = f"doc-{d.id}"
                ent_node_id = f"entity-{l.entity_id}"

                if doc_node_id not in nodes_map:
                    nodes_map[doc_node_id] = {
                        "id": doc_node_id,
                        "document_id": str(d.id),
                        "label": d.title,
                        "category": "document",
                        "type": d.doc_type,
                        "source": d.source,
                        "size": 14
                    }

                edges.append({
                    "source": ent_node_id,
                    "target": doc_node_id,
                    "label": l.role,
                    "weight": 1.0
                })

        return {
            "nodes": list(nodes_map.values()),
            "edges": edges
        }

    async def list_entities(
        self,
        db: AsyncSession,
        q: Optional[str] = None,
        entity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """Lists and searches entities with linked document counts."""
        filters = []
        if q and q.strip():
            filters.append(Entity.name.ilike(f"%{q.strip()}%"))
        if entity_type and entity_type.strip():
            filters.append(Entity.entity_type == entity_type.strip().lower())

        count_stmt = select(func.count(Entity.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(
                Entity,
                func.count(DocumentEntity.document_id).label("doc_count")
            )
            .outerjoin(DocumentEntity, Entity.id == DocumentEntity.entity_id)
        )
        if filters:
            stmt = stmt.where(and_(*filters))
        stmt = (
            stmt.group_by(Entity.id)
            .order_by(func.count(DocumentEntity.document_id).desc(), Entity.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db.execute(stmt)
        rows = res.all()

        items = []
        for ent, doc_count in rows:
            items.append({
                "id": ent.id,
                "name": ent.name,
                "entity_type": ent.entity_type,
                "description": ent.description,
                "external_id": ent.external_id,
                "source": ent.source,
                "doc_count": doc_count
            })

        return total, items

    async def get_entity_detail(
        self,
        db: AsyncSession,
        entity_id: int
    ) -> Optional[Dict[str, Any]]:
        """Returns entity profile with all linked documents."""
        stmt = select(Entity).where(Entity.id == entity_id)
        res = await db.execute(stmt)
        entity = res.scalar_one_or_none()
        if not entity:
            return None

        links_stmt = (
            select(DocumentEntity)
            .where(DocumentEntity.entity_id == entity_id)
            .options(joinedload(DocumentEntity.document))
        )
        links_res = await db.execute(links_stmt)
        doc_links = links_res.scalars().all()

        linked_docs = []
        for link in doc_links:
            if not link.document:
                continue
            d = link.document
            linked_docs.append({
                "id": d.id,
                "title": d.title,
                "source": d.source,
                "doc_type": d.doc_type,
                "role": link.role,
                "url": d.url,
                "published_at": d.published_at.isoformat() if d.published_at else None
            })

        return {
            "id": entity.id,
            "name": entity.name,
            "entity_type": entity.entity_type,
            "description": entity.description,
            "external_id": entity.external_id,
            "source": entity.source,
            "aliases": entity.aliases or [],
            "linked_documents": linked_docs
        }

entity_service = EntityService()
