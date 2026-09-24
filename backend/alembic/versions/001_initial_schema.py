"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-24 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector
from app.config import settings

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure vector and pg_trgm extensions exist
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # Table: knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('doc_type', sa.String(length=50), nullable=False, server_default='document'),
        sa.Column('url', sa.String(length=1000), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('license', sa.String(length=100), nullable=False, server_default='Public Domain'),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_knowledge_documents_source', 'knowledge_documents', ['source'])
    op.create_index('ix_knowledge_documents_source_id', 'knowledge_documents', ['source_id'])
    op.create_index('ix_knowledge_documents_title', 'knowledge_documents', ['title'])
    op.create_index('ix_knowledge_documents_doc_type', 'knowledge_documents', ['doc_type'])
    op.create_index('ix_knowledge_documents_source_source_id', 'knowledge_documents', ['source', 'source_id'], unique=True)

    # Full-Text Search GIN index
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_knowledge_documents_fts 
        ON knowledge_documents 
        USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
    """)

    # Table: document_chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(settings.EMBEDDING_DIMENSION), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('ix_document_chunks_document_index', 'document_chunks', ['document_id', 'chunk_index'], unique=True)

    # HNSW Vector cosine index
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)

    # Table: entities
    op.create_table(
        'entities',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False, server_default='topic'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('external_id', sa.String(length=255), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('aliases', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index('ix_entities_name', 'entities', ['name'])
    op.create_index('ix_entities_entity_type', 'entities', ['entity_type'])
    op.create_index('ix_entities_external_id', 'entities', ['external_id'])

    # Table: document_entities
    op.create_table(
        'document_entities',
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_id', sa.Integer(), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='mentioned'),
        sa.PrimaryKeyConstraint('document_id', 'entity_id', 'role')
    )
    op.create_index('ix_document_entities_entity_role', 'document_entities', ['entity_id', 'role'])


def downgrade() -> None:
    op.drop_table('document_entities')
    op.drop_table('entities')
    op.drop_table('document_chunks')
    op.drop_table('knowledge_documents')
