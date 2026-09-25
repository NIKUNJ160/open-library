import pytest
from app.etl.openlibrary import OpenLibraryCollector
from app.etl.wikipedia import WikipediaCollector

def test_openlibrary_transform():
    collector = OpenLibraryCollector()
    raw = {
        "key": "/works/OL12345W",
        "title": "A Journey to the Center of the Earth",
        "author_name": ["Jules Verne"],
        "description": "A classic science fiction novel by Jules Verne.",
        "subjects": ["Science Fiction", "Adventure"],
        "first_publish_year": 1864
    }

    doc = collector.transform_record(raw)
    assert doc is not None
    assert doc.source == "openlibrary"
    assert doc.source_id == "OL12345W"
    assert doc.title == "A Journey to the Center of the Earth"
    assert doc.doc_type == "book"
    assert "Jules Verne" in doc.metadata_json["authors"]
    assert "Science Fiction" in doc.metadata_json["subjects"]
    assert doc.published_at is not None
    assert doc.published_at.year == 1864

def test_wikipedia_transform():
    collector = WikipediaCollector()
    raw = {
        "pageid": 9999,
        "title": "General Relativity",
        "extract": "General relativity is a geometric theory of gravitation.",
        "canonicalurl": "https://en.wikipedia.org/wiki/General_relativity",
        "wikibase_item": "Q11452"
    }

    doc = collector.transform_record(raw)
    assert doc is not None
    assert doc.source == "wikipedia"
    assert doc.source_id == "9999"
    assert doc.title == "General Relativity"
    assert doc.doc_type == "article"
    assert doc.license == "CC BY-SA 3.0"
    assert "geometric theory" in doc.content

def test_chunking_sliding_window():
    collector = OpenLibraryCollector()
    long_text = "word " * 600 # 600 words
    chunks = collector.chunk_text(long_text, chunk_size_words=200, overlap_words=20)
    assert len(chunks) >= 3
    # Verify each chunk is roughly 200 words
    assert len(chunks[0].split()) == 200
