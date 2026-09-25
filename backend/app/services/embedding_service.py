import logging
from typing import List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Embedding service providing dense vector representations using FastEmbed
    (local ONNX runtime) or OpenAI embeddings.
    """
    _instance: Optional["EmbeddingService"] = None
    _model = None

    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER.lower()
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_fastembed_model(self):
        if self._model is None:
            logger.info(f"Loading FastEmbed model: {self.model_name}...")
            try:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(model_name=self.model_name)
                logger.info("FastEmbed model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize FastEmbed: {e}")
                raise
        return self._model

    def embed_query(self, query: str) -> List[float]:
        """Generate embedding vector for a single search query."""
        if not query or not query.strip():
            return [0.0] * self.dimension

        if self.provider == "openai" and settings.OPENAI_API_KEY:
            return self._embed_openai([query])[0]

        # Default: FastEmbed
        try:
            model = self._get_fastembed_model()
            embeddings = list(model.embed([query.strip()]))
            return embeddings[0].tolist()
        except Exception as e:
            logger.warning(f"Error during FastEmbed query embedding: {e}. Falling back to zero-vector.")
            return [0.0] * self.dimension

    def embed_documents(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Generate embedding vectors for a list of document passages."""
        if not texts:
            return []

        if self.provider == "openai" and settings.OPENAI_API_KEY:
            return self._embed_openai(texts)

        try:
            model = self._get_fastembed_model()
            embeddings_gen = model.embed(texts, batch_size=batch_size)
            return [emb.tolist() for emb in embeddings_gen]
        except Exception as e:
            logger.warning(f"Error during FastEmbed batch embedding: {e}. Falling back to zero-vectors.")
            return [[0.0] * self.dimension for _ in texts]

    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Fallback to OpenAI embeddings API if configured."""
        import httpx
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "input": texts,
            "model": "text-embedding-3-small"
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

embedding_service = EmbeddingService.get_instance()
