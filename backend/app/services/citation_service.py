import re
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from app.models.document import KnowledgeDocument

class CitationService:
    """
    Academic citation formatting service generating standards-compliant
    BibTeX, APA (7th ed), MLA (9th ed), and Chicago (Author-Date) citations
    across all ingested document types (papers, books, articles).
    """

    def parse_authors(self, doc: KnowledgeDocument) -> List[Tuple[str, str]]:
        """
        Extracts and normalizes author names into [(first_name, last_name), ...].
        Handles string lists, structured dicts, and single author fields.
        """
        meta = doc.metadata_json or {}
        raw_authors = meta.get("authors") or []
        parsed: List[Tuple[str, str]] = []

        if isinstance(raw_authors, list):
            for item in raw_authors:
                if isinstance(item, dict):
                    family = item.get("family") or ""
                    given = item.get("given") or ""
                    if family or given:
                        parsed.append((given.strip(), family.strip()))
                    elif item.get("name"):
                        parsed.append(self._split_name(item["name"]))
                elif isinstance(item, str) and item.strip():
                    parsed.append(self._split_name(item))

        # Check for authorString in metadata (e.g. from biomedical papers)
        if not parsed and meta.get("author_string"):
            parts = [p.strip() for p in meta["author_string"].split(",") if p.strip()]
            for p in parts:
                parsed.append(self._split_name(p))

        return parsed

    def _split_name(self, full_name: str) -> Tuple[str, str]:
        """Splits full name into (first_name, last_name)."""
        name = full_name.strip()
        if "," in name:
            # Format: "Smith, John"
            parts = name.split(",", 1)
            return (parts[1].strip(), parts[0].strip())
        parts = name.split()
        if len(parts) == 1:
            return ("", parts[0])
        return (" ".join(parts[:-1]), parts[-1])

    def _get_year(self, doc: KnowledgeDocument) -> Optional[int]:
        """Extract year from published_at datetime or metadata."""
        if doc.published_at:
            return doc.published_at.year
        meta = doc.metadata_json or {}
        for y_key in ("publication_year", "year", "pubYear"):
            val = meta.get(y_key)
            if val:
                try:
                    return int(val)
                except (ValueError, TypeError):
                    pass
        return None

    def _generate_cite_key(self, doc: KnowledgeDocument, authors: List[Tuple[str, str]], year: Optional[int]) -> str:
        """Generate clean citation key e.g. 'vaswani2017attention'."""
        first_author_last = authors[0][1].lower() if authors and authors[0][1] else doc.source.lower()
        first_author_last = re.sub(r'[^a-z0-9]', '', first_author_last)
        year_str = str(year) if year else "nd"
        title_word = re.sub(r'[^a-z0-9]', '', doc.title.split()[0].lower()) if doc.title else "item"
        return f"{first_author_last}{year_str}{title_word}"

    def to_bibtex(self, doc: KnowledgeDocument) -> str:
        """Generate formatted BibTeX entry."""
        authors = self.parse_authors(doc)
        year = self._get_year(doc)
        cite_key = self._generate_cite_key(doc, authors, year)
        meta = doc.metadata_json or {}

        entry_type = "article"
        if doc.doc_type == "book":
            entry_type = "book"
        elif doc.source == "wikipedia":
            entry_type = "misc"

        # Format authors as "Last, First and Last, First"
        if authors:
            author_str = " and ".join(
                f"{last}, {first}".strip(", ") for first, last in authors
            )
        elif doc.source == "wikipedia":
            author_str = "{Wikipedia Contributors}"
        else:
            author_str = "{Anonymous}"

        lines = [f"@{entry_type}{{{cite_key},"]
        lines.append(f"  title = {{{doc.title}}},")
        lines.append(f"  author = {{{author_str}}},")

        venue = meta.get("venue") or meta.get("journal")
        if venue:
            lines.append(f"  journal = {{{venue}}},")
        elif meta.get("publisher"):
            lines.append(f"  publisher = {{{meta['publisher']}}},")
        elif doc.source == "wikipedia":
            lines.append(f"  howpublished = {{{doc.url}}},")

        if year:
            lines.append(f"  year = {{{year}}},")

        doi = meta.get("doi")
        if doi:
            lines.append(f"  doi = {{{doi}}},")

        if doc.url:
            lines.append(f"  url = {{{doc.url}}},")

        if meta.get("volume"):
            lines.append(f"  volume = {{{meta['volume']}}},")
        if meta.get("issue"):
            lines.append(f"  number = {{{meta['issue']}}},")
        if meta.get("page"):
            lines.append(f"  pages = {{{meta['page']}}},")

        # Strip trailing comma from last field
        lines[-1] = lines[-1].rstrip(",")
        lines.append("}")
        return "\n".join(lines)

    def to_apa(self, doc: KnowledgeDocument) -> str:
        """Generate APA 7th edition citation string."""
        authors = self.parse_authors(doc)
        year = self._get_year(doc)
        year_str = f"({year})" if year else "(n.d.)"
        meta = doc.metadata_json or {}

        # Author formatting: "Smith, J. A., & Doe, J."
        if authors:
            formatted_authors = []
            for first, last in authors:
                initials = " ".join(f"{part[0]}." for part in first.split() if part) if first else ""
                formatted_authors.append(f"{last}, {initials}".strip(", "))
            
            if len(formatted_authors) == 1:
                author_str = formatted_authors[0]
            elif len(formatted_authors) == 2:
                author_str = f"{formatted_authors[0]}, & {formatted_authors[1]}"
            elif len(formatted_authors) <= 20:
                author_str = ", ".join(formatted_authors[:-1]) + f", & {formatted_authors[-1]}"
            else:
                author_str = ", ".join(formatted_authors[:19]) + ", ... " + formatted_authors[-1]
        elif doc.source == "wikipedia":
            author_str = "Wikipedia contributors"
        else:
            author_str = "Anonymous"

        title = doc.title.rstrip(".")
        venue = meta.get("venue") or meta.get("journal")
        doi = meta.get("doi")

        parts = [f"{author_str} {year_str}. {title}."]
        if venue:
            parts.append(f"*{venue}*.")
        elif meta.get("publisher"):
            parts.append(f"{meta['publisher']}.")
        elif doc.source == "wikipedia":
            parts.append("In *Wikipedia, The Free Encyclopedia*.")

        if doi:
            parts.append(f"https://doi.org/{doi}")
        elif doc.url:
            parts.append(doc.url)

        return " ".join(parts)

    def to_mla(self, doc: KnowledgeDocument) -> str:
        """Generate MLA 9th edition citation string."""
        authors = self.parse_authors(doc)
        year = self._get_year(doc)
        meta = doc.metadata_json or {}

        # MLA author formatting: "Smith, John, and Jane Doe."
        if authors:
            if len(authors) == 1:
                first, last = authors[0]
                author_str = f"{last}, {first}".strip(", ") + "."
            elif len(authors) == 2:
                f1, l1 = authors[0]
                f2, l2 = authors[1]
                author_str = f"{l1}, {f1}, and {f2} {l2}."
            else:
                f1, l1 = authors[0]
                author_str = f"{l1}, {f1}, et al."
        elif doc.source == "wikipedia":
            author_str = '"' + doc.title.rstrip(".") + '."'
        else:
            author_str = "Anonymous."

        title_clause = f'"{doc.title.rstrip(".")}."' if doc.source != "wikipedia" else ""
        venue = meta.get("venue") or meta.get("journal")
        venue_str = f"*{venue}*," if venue else ""
        pub_str = f"{meta['publisher']}," if meta.get("publisher") and not venue else ""
        year_str = f"{year}," if year else ""
        
        doi = meta.get("doi")
        doi_str = f"doi:{doi}." if doi else (f"{doc.url}." if doc.url else "")

        parts = [p for p in [author_str, title_clause, venue_str, pub_str, year_str, doi_str] if p]
        return " ".join(parts)

    def to_chicago(self, doc: KnowledgeDocument) -> str:
        """Generate Chicago (Author-Date) style citation."""
        authors = self.parse_authors(doc)
        year = self._get_year(doc)
        year_str = str(year) if year else "n.d."
        meta = doc.metadata_json or {}

        if authors:
            if len(authors) == 1:
                first, last = authors[0]
                author_str = f"{last}, {first}".strip(", ")
            elif len(authors) <= 3:
                first_str = f"{authors[0][1]}, {authors[0][0]}".strip(", ")
                others = [f"{f} {l}".strip() for f, l in authors[1:]]
                author_str = f"{first_str}, and {', and '.join(others)}"
            else:
                first, last = authors[0]
                author_str = f"{last}, {first} et al.".strip(", ")
        elif doc.source == "wikipedia":
            author_str = "Wikipedia contributors"
        else:
            author_str = "Anonymous"

        title = doc.title.rstrip(".")
        venue = meta.get("venue") or meta.get("journal")
        doi = meta.get("doi")

        parts = [f"{author_str}. {year_str}. \"{title}.\""]
        if venue:
            parts.append(f"*{venue}*.")
        elif meta.get("publisher"):
            parts.append(f"{meta['publisher']}.")

        if doi:
            parts.append(f"https://doi.org/{doi}.")
        elif doc.url:
            parts.append(f"{doc.url}.")

        return " ".join(parts)

    def generate_all(self, doc: KnowledgeDocument) -> Dict[str, str]:
        """Returns citations in all 4 supported formats."""
        return {
            "bibtex": self.to_bibtex(doc),
            "apa": self.to_apa(doc),
            "mla": self.to_mla(doc),
            "chicago": self.to_chicago(doc)
        }

citation_service = CitationService()
