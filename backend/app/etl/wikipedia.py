import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import httpx
import logging
from app.etl.base import BaseCollector
from app.models.document import KnowledgeDocument

logger = logging.getLogger(__name__)

class WikipediaCollector(BaseCollector):
    """
    Collector and parser for Wikipedia encyclopedic articles.
    """

    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """
        Transform Wikipedia page payload into canonical KnowledgeDocument.
        """
        page_id = str(raw_data.get("pageid") or raw_data.get("id") or "")
        title = raw_data.get("title", "")
        if not title:
            return None

        content = raw_data.get("extract") or raw_data.get("snippet") or raw_data.get("description") or ""
        # Strip simple HTML markup if present
        import re
        content = re.sub(r'<[^>]+>', '', content).strip()

        url = (
            raw_data.get("content_urls", {}).get("desktop", {}).get("page")
            or raw_data.get("canonicalurl")
            or f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
        )

        doc_id = uuid.uuid4()
        metadata = {
            "pageid": page_id,
            "wikidata_qid": raw_data.get("wikibase_item"),
            "description": raw_data.get("description"),
            "attribution": "Text is available under Creative Commons Attribution-ShareAlike 3.0"
        }

        return KnowledgeDocument(
            id=doc_id,
            source="wikipedia",
            source_id=page_id or title.replace(" ", "_"),
            title=title,
            content=content,
            doc_type="article",
            url=url,
            published_at=datetime.now(timezone.utc),
            language=raw_data.get("lang", "en"),
            license="CC BY-SA 3.0",
            metadata_json=metadata
        )

    async def fetch_samples(self, titles: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Fetch vital Wikipedia articles summaries using Wikipedia REST API.
        """
        if not titles:
            titles = [
                "Quantum_mechanics",
                "Theory_of_relativity",
                "Charles_Darwin",
                "DNA",
                "Artificial_intelligence",
                "Renewable_energy",
                "Computer_science",
                "Photosynthesis"
            ]

        results = []
        async with httpx.AsyncClient(headers={"User-Agent": "OpenLibraryKnowledgeEngine/1.0"}, timeout=15.0) as client:
            for t in titles:
                url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{t}"
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        results.append(res.json())
                except Exception as e:
                    logger.warning(f"Failed to fetch Wikipedia summary for '{t}': {e}")

        logger.info(f"Fetched {len(results)} Wikipedia articles.")
        return results
