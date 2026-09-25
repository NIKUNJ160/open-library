import re
import uuid
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.document import KnowledgeDocument, DocumentChunk
from app.services.embedding_service import embedding_service
import logging

logger = logging.getLogger(__name__)

class BaseCollector(ABC):
    """
    Abstract base collector defining text chunking, canonical transformation,
    and embedding generation for knowledge sources.
    """

    def chunk_text(self, text: str, chunk_size_words: int = 250, overlap_words: int = 30) -> List[str]:
        """
        Splits text into sliding-window passages by word count.
        """
        if not text or not text.strip():
            return []

        # Clean text
        clean_text = re.sub(r'\s+', ' ', text).strip()
        words = clean_text.split()

        if len(words) <= chunk_size_words:
            return [clean_text]

        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size_words, len(words))
            chunk_slice = " ".join(words[start:end])
            chunks.append(chunk_slice)
            if end == len(words):
                break
            start += (chunk_size_words - overlap_words)

        return chunks

    def create_chunks(self, document_id: uuid.UUID, content: str) -> List[DocumentChunk]:
        """
        Chunk document text and generate dense vector embeddings using EmbeddingService.
        """
        if not content:
            return []

        text_chunks = self.chunk_text(content)
        if not text_chunks:
            return []

        # Batch embed all passages
        embeddings = embedding_service.embed_documents(text_chunks)

        chunk_objects = []
        for idx, (chunk_text, embedding) in enumerate(zip(text_chunks, embeddings)):
            chunk_obj = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                text=chunk_text,
                embedding=embedding
            )
            chunk_objects.append(chunk_obj)

        return chunk_objects

    @abstractmethod
    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """Transform raw source payload into canonical KnowledgeDocument model."""
        pass
