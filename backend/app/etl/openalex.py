import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from app.models.document import KnowledgeDocument
from app.etl.base import BaseCollector

logger = logging.getLogger(__name__)

class OpenAlexCollector(BaseCollector):
    """
    Collector and parser for OpenAlex scholarly works (articles, preprints, conference papers).
    Extracts bibliographic metadata, unrolls inverted abstract indices, maps ORCIDs, and links DOIs.
    """

    BASE_URL = "https://api.openalex.org"

    def unroll_abstract(self, inverted_index: Optional[Dict[str, List[int]]]) -> str:
        """
        Unrolls OpenAlex's abstract_inverted_index into linear text.
        OpenAlex stores abstracts as { token: [pos0, pos1, ...] }.
        """
        if not inverted_index or not isinstance(inverted_index, dict):
            return ""

        word_positions: List[tuple[int, str]] = []
        for word, positions in inverted_index.items():
            if isinstance(positions, list):
                for pos in positions:
                    word_positions.append((pos, word))

        if not word_positions:
            return ""

        word_positions.sort(key=lambda x: x[0])
        return " ".join(word for _, word in word_positions)

    def extract_doi(self, raw_doi: Optional[str]) -> Optional[str]:
        """Normalize DOI by stripping https://doi.org/ prefix if present."""
        if not raw_doi:
            return None
        doi = raw_doi.strip()
        doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.IGNORECASE)
        return doi.strip()

    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """
        Transforms an OpenAlex work JSON object into a canonical KnowledgeDocument.
        """
        raw_id = raw_data.get("id", "")
        if not raw_id:
            return None

        # Clean source_id, e.g. "https://openalex.org/W2741809807" -> "W2741809807"
        source_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id

        title = raw_data.get("title") or "Untitled Scholarly Work"
        title = title.strip()

        # Unroll inverted abstract
        abstract = self.unroll_abstract(raw_data.get("abstract_inverted_index"))
        
        # Build coherent text content for indexing & vector embedding
        content_parts = [title]
        if abstract:
            content_parts.append(f"Abstract:\n{abstract}")
        content = "\n\n".join(content_parts)

        # Extract publication date
        published_at = None
        pub_date_str = raw_data.get("publication_date")
        if pub_date_str:
            try:
                published_at = datetime.fromisoformat(pub_date_str).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        
        if not published_at and raw_data.get("publication_year"):
            try:
                published_at = datetime(int(raw_data["publication_year"]), 1, 1, tzinfo=timezone.utc)
            except (ValueError, TypeError):
                pass

        # Extract authors and affiliations
        authors_meta: List[Dict[str, Any]] = []
        for authorship in raw_data.get("authorships", []):
            author_obj = authorship.get("author", {})
            name = author_obj.get("display_name")
            if not name:
                continue
            
            orcid = author_obj.get("orcid")
            institutions = [
                inst.get("display_name") for inst in authorship.get("institutions", [])
                if inst.get("display_name")
            ]
            
            authors_meta.append({
                "name": name,
                "orcid": orcid,
                "institutions": institutions,
                "raw_affiliation": authorship.get("raw_affiliation_strings", [])
            })

        # Primary location / Journal
        primary_loc = raw_data.get("primary_location") or {}
        source_obj = primary_loc.get("source") or {}
        venue_name = source_obj.get("display_name") or raw_data.get("host_venue", {}).get("name")
        landing_url = primary_loc.get("landing_page_url") or raw_data.get("doi") or raw_id
        pdf_url = primary_loc.get("pdf_url")

        # Open Access & License
        oa_info = raw_data.get("open_access", {})
        license_str = primary_loc.get("license") or ("Open Access" if oa_info.get("is_oa") else "Scholarly Article")

        # Concepts / Topics
        topics = [
            concept.get("display_name")
            for concept in raw_data.get("concepts", [])
            if concept.get("display_name") and concept.get("score", 0) > 0.3
        ]

        doi = self.extract_doi(raw_data.get("doi"))

        metadata = {
            "doi": doi,
            "venue": venue_name,
            "authors": authors_meta,
            "topics": topics,
            "cited_by_count": raw_data.get("cited_by_count", 0),
            "pdf_url": pdf_url,
            "is_oa": oa_info.get("is_oa", False),
            "openalex_id": raw_id,
            "work_type": raw_data.get("type", "article")
        }

        return KnowledgeDocument(
            source="openalex",
            source_id=source_id,
            title=title[:500],
            content=content,
            doc_type="paper",
            url=landing_url,
            published_at=published_at,
            language=raw_data.get("language") or "en",
            license=license_str[:100],
            metadata_json=metadata
        )

    async def fetch_works(self, query: str, limit: int = 10, email: str = "openlibrary@antigravity.local") -> List[Dict[str, Any]]:
        """
        Fetch scholarly works from OpenAlex API using polite headers.
        """
        headers = {
            "User-Agent": f"OpenLibraryEngine/0.2.0 (mailto:{email})"
        }
        params = {
            "search": query,
            "per-page": min(limit, 50)
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{self.BASE_URL}/works", params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data.get("results", [])
        except Exception as e:
            logger.error(f"Failed to fetch OpenAlex works for query '{query}': {e}")
            return []
