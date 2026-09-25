import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from app.models.document import KnowledgeDocument
from app.etl.base import BaseCollector

logger = logging.getLogger(__name__)

class CrossrefCollector(BaseCollector):
    """
    Collector and parser for Crossref DOI registry records.
    Normalizes bibliographic metadata, cleans JATS XML abstracts, maps container venues, and references.
    """

    BASE_URL = "https://api.crossref.org"

    def strip_xml_tags(self, text: Optional[str]) -> str:
        """Strip JATS XML tags (e.g., <jats:p>, <jats:title>, <jats:italic>) from abstracts."""
        if not text:
            return ""
        clean = re.sub(r'<[^>]+>', ' ', text)
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    def extract_published_date(self, raw_data: Dict[str, Any]) -> Optional[datetime]:
        """Extract publication datetime from published-print, published-online, or created date-parts."""
        for field in ("published-print", "published-online", "issued", "created"):
            date_info = raw_data.get(field)
            if date_info and isinstance(date_info, dict):
                date_parts = date_info.get("date-parts")
                if date_parts and isinstance(date_parts, list) and len(date_parts) > 0:
                    parts = date_parts[0]
                    if len(parts) >= 1 and isinstance(parts[0], int):
                        year = parts[0]
                        month = parts[1] if len(parts) >= 2 and isinstance(parts[1], int) else 1
                        day = parts[2] if len(parts) >= 3 and isinstance(parts[2], int) else 1
                        try:
                            return datetime(year, month, day, tzinfo=timezone.utc)
                        except (ValueError, TypeError):
                            pass
        return None

    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """
        Transforms a Crossref work item JSON object into a canonical KnowledgeDocument.
        """
        doi = raw_data.get("DOI")
        if not doi:
            return None
        doi = doi.strip()

        # Extract title
        titles = raw_data.get("title")
        if isinstance(titles, list) and len(titles) > 0:
            title = titles[0]
        elif isinstance(titles, str):
            title = titles
        else:
            title = "Untitled Scholarly Work"
        title = title.strip()

        # Extract & clean abstract
        raw_abstract = raw_data.get("abstract")
        abstract = self.strip_xml_tags(raw_abstract)

        # Build content for indexing
        content_parts = [title]
        if abstract:
            content_parts.append(f"Abstract:\n{abstract}")
        content = "\n\n".join(content_parts)

        published_at = self.extract_published_date(raw_data)

        # Extract authors
        authors_meta: List[Dict[str, Any]] = []
        for a in raw_data.get("author", []):
            family = a.get("family", "")
            given = a.get("given", "")
            name = f"{given} {family}".strip() if (given or family) else a.get("name")
            if not name:
                continue
            
            orcid = a.get("ORCID")
            affils = [
                aff.get("name") for aff in a.get("affiliation", [])
                if isinstance(aff, dict) and aff.get("name")
            ]
            
            authors_meta.append({
                "name": name,
                "family": family,
                "given": given,
                "orcid": orcid,
                "sequence": a.get("sequence", "additional"),
                "institutions": affils
            })

        # Venue / Journal / Container
        containers = raw_data.get("container-title")
        venue_name = None
        if isinstance(containers, list) and len(containers) > 0:
            venue_name = containers[0]
        elif isinstance(containers, str):
            venue_name = containers

        publisher = raw_data.get("publisher")
        url = raw_data.get("URL") or f"https://doi.org/{doi}"

        # License detection
        license_str = "Scholarly Publication"
        for lic in raw_data.get("license", []):
            lic_url = lic.get("URL", "")
            if "creativecommons.org" in lic_url:
                license_str = "Creative Commons"
                break

        metadata = {
            "doi": doi,
            "venue": venue_name,
            "publisher": publisher,
            "authors": authors_meta,
            "cited_by_count": raw_data.get("is-referenced-by-count", 0),
            "reference_count": raw_data.get("reference-count", 0),
            "volume": raw_data.get("volume"),
            "issue": raw_data.get("issue"),
            "page": raw_data.get("page"),
            "work_type": raw_data.get("type", "journal-article")
        }

        return KnowledgeDocument(
            source="crossref",
            source_id=doi,
            title=title[:500],
            content=content,
            doc_type="paper",
            url=url,
            published_at=published_at,
            language="en",
            license=license_str[:100],
            metadata_json=metadata
        )

    async def fetch_works(self, query: str, limit: int = 10, mailto: str = "openlibrary@antigravity.local") -> List[Dict[str, Any]]:
        """
        Query Crossref works API using polite mailto headers.
        """
        headers = {
            "User-Agent": f"OpenLibraryEngine/0.2.0 (mailto:{mailto})"
        }
        params = {
            "query": query,
            "rows": min(limit, 50)
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{self.BASE_URL}/works", params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data.get("message", {}).get("items", [])
        except Exception as e:
            logger.error(f"Failed to fetch Crossref works for query '{query}': {e}")
            return []
