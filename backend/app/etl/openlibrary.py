import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx
import logging
from app.etl.base import BaseCollector
from app.models.document import KnowledgeDocument

logger = logging.getLogger(__name__)

class OpenLibraryCollector(BaseCollector):
    """
    Collector and parser for Open Library books and works records.
    """

    def parse_description(self, raw_desc: Any) -> str:
        """Open Library descriptions can be raw strings or dicts with {'value': '...'}."""
        if not raw_desc:
            return ""
        if isinstance(raw_desc, str):
            return raw_desc.strip()
        if isinstance(raw_desc, dict) and "value" in raw_desc:
            return str(raw_desc["value"]).strip()
        return ""

    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """
        Transform Open Library work / book record into canonical KnowledgeDocument.
        """
        # Extract ID (e.g. '/works/OL45804W' or 'OL45804W')
        key = raw_data.get("key", "")
        olid = key.split("/")[-1] if "/" in key else key
        if not olid:
            return None

        title = raw_data.get("title", "Untitled Work")
        description = self.parse_description(raw_data.get("description"))

        # Extract authors
        authors = []
        raw_authors = raw_data.get("authors", []) or raw_data.get("author_name", [])
        for a in raw_authors:
            if isinstance(a, str):
                authors.append(a)
            elif isinstance(a, dict):
                author_obj = a.get("author", {})
                if isinstance(author_obj, dict) and "key" in author_obj:
                    authors.append(author_obj["key"].split("/")[-1])
                elif "name" in a:
                    authors.append(a["name"])

        # Extract subjects
        subjects = raw_data.get("subjects", []) or raw_data.get("subject", [])
        if not isinstance(subjects, list):
            subjects = [str(subjects)]

        # Extract publication year
        pub_year = raw_data.get("first_publish_date") or raw_data.get("first_publish_year")
        published_at = None
        if pub_year:
            try:
                # Extract 4-digit year
                import re
                year_match = re.search(r'\b(1\d{3}|20\d{2})\b', str(pub_year))
                if year_match:
                    published_at = datetime(int(year_match.group(1)), 1, 1)
            except Exception:
                published_at = None

        doc_id = uuid.uuid4()
        content = description or f"{title}. Subjects: {', '.join(subjects[:10])}."

        metadata = {
            "authors": authors,
            "subjects": subjects[:15],
            "olid": olid,
            "first_publish_date": str(pub_year) if pub_year else None
        }

        doc = KnowledgeDocument(
            id=doc_id,
            source="openlibrary",
            source_id=olid,
            title=title,
            content=content,
            doc_type="book",
            url=f"https://openlibrary.org/works/{olid}",
            published_at=published_at,
            language="en",
            license="CC0 / Public Domain",
            metadata_json=metadata
        )

        return doc

    async def fetch_samples(self, query: str = "science", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch sample works from Open Library Search API for initial seeding.
        """
        url = f"https://openlibrary.org/search.json?q={query}&limit={limit}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url)
                res.raise_for_status()
                data = res.json()
                docs = data.get("docs", [])
                logger.info(f"Fetched {len(docs)} sample works from Open Library API.")
                return docs
        except Exception as e:
            logger.warning(f"Could not fetch online Open Library samples: {e}")
            return []
