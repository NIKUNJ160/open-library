from app.etl.base import BaseCollector
from app.etl.openlibrary import OpenLibraryCollector
from app.etl.wikipedia import WikipediaCollector

__all__ = [
    "BaseCollector",
    "OpenLibraryCollector",
    "WikipediaCollector",
]
