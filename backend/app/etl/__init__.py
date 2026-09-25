from app.etl.base import BaseCollector
from app.etl.openlibrary import OpenLibraryCollector
from app.etl.wikipedia import WikipediaCollector
from app.etl.openalex import OpenAlexCollector
from app.etl.crossref import CrossrefCollector
from app.etl.europepmc import EuropePMCCollector

__all__ = [
    "BaseCollector",
    "OpenLibraryCollector",
    "WikipediaCollector",
    "OpenAlexCollector",
    "CrossrefCollector",
    "EuropePMCCollector",
]
