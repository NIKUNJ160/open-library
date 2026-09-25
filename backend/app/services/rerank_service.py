import math
import asyncio
import logging
from typing import List, Tuple, Any, Callable, Optional, Sequence

logger = logging.getLogger(__name__)

class RerankService:
    """
    Second-stage neural cross-encoder reranking service.
    Uses Xenova/ms-marco-MiniLM-L-6-v2 running locally via FastEmbed ONNX runtime.
    Scores joint query-document interactions and applies sigmoid normalization
    for calibrated relevance probabilities [0.0, 1.0].
    """

    def __init__(self, model_name: str = "Xenova/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
        self._load_error: Optional[str] = None

    def _get_model(self):
        """Lazy model loader."""
        if self._model is None and not self._load_error:
            try:
                from fastembed.rerank.cross_encoder import TextCrossEncoder
                self._model = TextCrossEncoder(model_name=self.model_name)
                logger.info(f"Loaded neural cross-encoder: {self.model_name}")
            except Exception as e:
                self._load_error = str(e)
                logger.error(f"Failed to load neural cross-encoder {self.model_name}: {e}")
        return self._model

    @staticmethod
    def sigmoid(logit: float) -> float:
        """Numerically stable sigmoid function mapping raw cross-encoder logits to [0.0, 1.0]."""
        if logit < -50.0:
            return 0.0
        if logit > 50.0:
            return 1.0
        return 1.0 / (1.0 + math.exp(-logit))

    def rerank_sync(
        self,
        query: str,
        items: Sequence[Any],
        text_extractor: Callable[[Any], str]
    ) -> List[Tuple[Any, float]]:
        """
        Synchronously reranks a list of candidate items against a query string.
        Returns a list of (item, normalized_score) tuples sorted in descending order of relevance.
        """
        if not items or not query:
            return []

        model = self._get_model()
        if model is None:
            # Fallback: preserve original order with default normalized score 0.5
            return [(item, 0.5) for item in items]

        # Extract text representations for cross-attention evaluation
        docs = [text_extractor(item) for item in items]

        try:
            raw_scores = list(model.rerank(query, docs))
            scored_items = []
            for item, raw_score in zip(items, raw_scores):
                norm_score = round(self.sigmoid(float(raw_score)), 4)
                scored_items.append((item, norm_score))

            # Sort descending by cross-encoder score
            scored_items.sort(key=lambda x: x[1], reverse=True)
            return scored_items
        except Exception as e:
            logger.error(f"Cross-encoder reranking error: {e}. Falling back to input order.")
            return [(item, 0.5) for item in items]

    async def rerank(
        self,
        query: str,
        items: Sequence[Any],
        text_extractor: Callable[[Any], str]
    ) -> List[Tuple[Any, float]]:
        """
        Asynchronously reranks items in a separate thread pool so the FastAPI event loop is never blocked.
        """
        if not items:
            return []
        return await asyncio.to_thread(self.rerank_sync, query, items, text_extractor)

rerank_service = RerankService()
