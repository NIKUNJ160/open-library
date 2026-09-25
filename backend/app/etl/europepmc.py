import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx
from app.models.document import KnowledgeDocument
from app.etl.base import BaseCollector

logger = logging.getLogger(__name__)

class EuropePMCCollector(BaseCollector):
    """
    Collector and parser for Europe PMC biomedical and life sciences literature.
    Indexes PubMed IDs (PMID), PubMed Central IDs (PMCID), DOIs, structured abstracts, and OA full-texts.
    """

    BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest"

    def parse_authors(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract authors from authorList structure or fallback to authorString."""
        authors: List[Dict[str, Any]] = []
        
        # Check structured authorList first
        author_list = raw_data.get("authorList", {}).get("author", [])
        if isinstance(author_list, list) and author_list:
            for a in author_list:
                full_name = a.get("fullName") or f"{a.get('firstName', '')} {a.get('lastName', '')}".strip()
                if not full_name:
                    continue
                
                # Check for ORCID
                orcid = None
                author_id = a.get("authorId")
                if isinstance(author_id, dict) and author_id.get("type", "").upper() == "ORCID":
                    orcid = author_id.get("value")
                
                authors.append({
                    "name": full_name,
                    "family": a.get("lastName"),
                    "given": a.get("firstName"),
                    "orcid": orcid,
                    "affiliation": a.get("affiliation")
                })
            if authors:
                return authors

        # Fallback to parsing comma-separated authorString
        author_str = raw_data.get("authorString")
        if author_str and isinstance(author_str, str):
            names = [n.strip() for n in author_str.split(",") if n.strip()]
            for n in names:
                authors.append({"name": n})

        return authors

    def transform_record(self, raw_data: Dict[str, Any]) -> Optional[KnowledgeDocument]:
        """
        Transforms a Europe PMC search result JSON item into a canonical KnowledgeDocument.
        """
        # Unique identifier hierarchy: PMCID > PMID > ID > DOI
        pmcid = raw_data.get("pmcid")
        pmid = raw_data.get("pmid")
        raw_id = raw_data.get("id")
        doi = raw_data.get("doi")

        source_id = pmcid or (f"PMID:{pmid}" if pmid else (raw_id or doi))
        if not source_id:
            return None

        title = raw_data.get("title") or "Untitled Biomedical Article"
        # Europe PMC titles sometimes end with trailing period
        title = title.strip().rstrip(".")

        abstract = raw_data.get("abstractText") or ""
        # Strip any embedded XML or HTML tags
        abstract = re.sub(r'<[^>]+>', ' ', abstract)
        abstract = re.sub(r'\s+', ' ', abstract).strip()

        content_parts = [title]
        if abstract:
            content_parts.append(f"Abstract:\n{abstract}")
        content = "\n\n".join(content_parts)

        # Parse publication date
        published_at = None
        pub_year = raw_data.get("pubYear")
        if pub_year:
            try:
                published_at = datetime(int(pub_year), 1, 1, tzinfo=timezone.utc)
            except (ValueError, TypeError):
                pass

        authors = self.parse_authors(raw_data)
        journal = raw_data.get("journalTitle") or raw_data.get("journalInfo", {}).get("journal", {}).get("title")

        # Resolve primary article URL
        if pmcid:
            url = f"https://europepmc.org/article/PMC/{pmcid}"
        elif pmid:
            url = f"https://europepmc.org/article/MED/{pmid}"
        elif doi:
            url = f"https://doi.org/{doi}"
        else:
            url = f"https://europepmc.org/abstract/MED/{source_id}"

        is_oa = raw_data.get("isOpenAccess", "N") == "Y"
        license_str = "CC-BY / Open Access" if is_oa else "Biomedical Literature"

        # Extract full-text URLs
        full_text_links = []
        for ft in raw_data.get("fullTextUrlList", {}).get("fullTextUrl", []):
            if isinstance(ft, dict) and ft.get("url"):
                full_text_links.append({
                    "url": ft.get("url"),
                    "style": ft.get("documentStyle")
                })

        metadata = {
            "doi": doi,
            "pmid": pmid,
            "pmcid": pmcid,
            "venue": journal,
            "authors": authors,
            "cited_by_count": raw_data.get("citedByCount", 0),
            "is_oa": is_oa,
            "full_text_links": full_text_links,
            "journal_volume": raw_data.get("journalVolume"),
            "journal_issue": raw_data.get("issue"),
            "page_info": raw_data.get("pageInfo")
        }

        return KnowledgeDocument(
            source="europepmc",
            source_id=source_id,
            title=title[:500],
            content=content,
            doc_type="paper",
            url=url,
            published_at=published_at,
            language="en",
            license=license_str[:100],
            metadata_json=metadata
        )

    async def fetch_articles(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Query Europe PMC REST search API with core metadata and JSON format.
        """
        headers = {
            "User-Agent": "OpenLibraryEngine/0.2.0 (openlibrary@antigravity.local)"
        }
        params = {
            "query": query,
            "format": "json",
            "resultType": "core",
            "pageSize": min(limit, 50)
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{self.BASE_URL}/search", params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data.get("resultList", {}).get("result", [])
        except Exception as e:
            logger.error(f"Failed to fetch Europe PMC articles for query '{query}': {e}")
            return []
