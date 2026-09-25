import asyncio
import argparse
import logging
from typing import List
from app.db.session import async_engine, AsyncSessionLocal
from app.db.base import Base
from app.etl.openlibrary import OpenLibraryCollector
from app.etl.wikipedia import WikipediaCollector
from app.models.document import KnowledgeDocument
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

OFFLINE_SAMPLE_WORKS = [
    {
        "key": "/works/OL45804W",
        "title": "On the Origin of Species",
        "author_name": ["Charles Darwin"],
        "description": "On the Origin of Species by Means of Natural Selection, published on 24 November 1859, is a work of scientific literature by Charles Darwin that is considered to be the foundation of evolutionary biology. Darwin introduced the scientific theory that populations evolve over generations through natural selection.",
        "subjects": ["Evolution", "Natural selection", "Biology", "Science"],
        "first_publish_year": 1859
    },
    {
        "key": "/works/OL27479W",
        "title": "Relativity: The Special and General Theory",
        "author_name": ["Albert Einstein"],
        "description": "Albert Einstein's clear explanation of the theory of relativity for the general reader. Discusses spacetime, gravitation, speed of light, and the curvature of space.",
        "subjects": ["Physics", "Relativity", "Cosmology", "Space-time"],
        "first_publish_year": 1916
    },
    {
        "key": "/works/OL102749W",
        "title": "Principia: Mathematical Principles of Natural Philosophy",
        "author_name": ["Isaac Newton"],
        "description": "Philosophiae Naturalis Principia Mathematica, often referred to as simply the Principia, is a work in three books by Isaac Newton, in which he states Newton's laws of motion, forming the foundation of classical mechanics.",
        "subjects": ["Physics", "Calculus", "Classical mechanics", "Gravitation"],
        "first_publish_year": 1687
    },
    {
        "key": "/works/OL847291W",
        "title": "A Brief History of Time",
        "author_name": ["Stephen Hawking"],
        "description": "A landmark book by Stephen Hawking that explores the origins and eventual fate of the universe, covering black holes, time travel, and the search for a unified theory of physics.",
        "subjects": ["Astrophysics", "Cosmology", "Black holes", "Quantum mechanics"],
        "first_publish_year": 1988
    }
]

OFFLINE_SAMPLE_ARTICLES = [
    {
        "pageid": "25251",
        "title": "Quantum mechanics",
        "extract": "Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.",
        "canonicalurl": "https://en.wikipedia.org/wiki/Quantum_mechanics",
        "wikibase_item": "Q944"
    },
    {
        "pageid": "31441",
        "title": "Theory of relativity",
        "extract": "The theory of relativity usually encompasses two interrelated physics theories by Albert Einstein: special relativity and general relativity, proposed and published in 1905 and 1915, respectively. Special relativity applies to all physical phenomena in the absence of gravity.",
        "canonicalurl": "https://en.wikipedia.org/wiki/Theory_of_relativity",
        "wikibase_item": "Q43514"
    },
    {
        "pageid": "1164",
        "title": "Artificial intelligence",
        "extract": "Artificial intelligence is the intelligence of machines or software, as opposed to the intelligence of living beings, primarily of humans. It is a field of study in computer science that develops and studies intelligent machines.",
        "canonicalurl": "https://en.wikipedia.org/wiki/Artificial_intelligence",
        "wikibase_item": "Q11660"
    }
]

async def seed_data(source: str = "all", limit: int = 10):
    logger.info("Initializing database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ol_collector = OpenLibraryCollector()
    wiki_collector = WikipediaCollector()

    async with AsyncSessionLocal() as session:
        # Ingest Open Library
        if source in ["openlibrary", "all"]:
            logger.info("Collecting Open Library records...")
            raw_books = await ol_collector.fetch_samples(query="physics biology", limit=limit)
            if not raw_books:
                logger.info("Using offline curated Open Library sample dataset.")
                raw_books = OFFLINE_SAMPLE_WORKS

            for item in raw_books:
                doc = ol_collector.transform_record(item)
                if not doc:
                    continue

                # Check if already exists
                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing Open Library work: {doc.title}")
                    continue

                # Generate chunks and embeddings
                chunks = ol_collector.create_chunks(doc.id, doc.content or doc.title)
                session.add(doc)
                for chunk in chunks:
                    session.add(chunk)

                logger.info(f"Ingested Open Library work: '{doc.title}' with {len(chunks)} chunks.")

        # Ingest Wikipedia
        if source in ["wikipedia", "all"]:
            logger.info("Collecting Wikipedia records...")
            raw_articles = await wiki_collector.fetch_samples()
            if not raw_articles:
                logger.info("Using offline curated Wikipedia sample dataset.")
                raw_articles = OFFLINE_SAMPLE_ARTICLES

            for item in raw_articles:
                doc = wiki_collector.transform_record(item)
                if not doc:
                    continue

                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing Wikipedia article: {doc.title}")
                    continue

                chunks = wiki_collector.create_chunks(doc.id, doc.content or doc.title)
                session.add(doc)
                for chunk in chunks:
                    session.add(chunk)

                logger.info(f"Ingested Wikipedia article: '{doc.title}' with {len(chunks)} chunks.")

        await session.commit()
        logger.info("Database ingestion commit completed successfully.")

def main():
    parser = argparse.ArgumentParser(description="Ingest sample public knowledge documents into database")
    parser.add_argument("--source", choices=["openlibrary", "wikipedia", "all"], default="all", help="Source to ingest")
    parser.add_argument("--limit", type=int, default=5, help="Number of items to fetch per source")
    args = parser.parse_args()

    asyncio.run(seed_data(source=args.source, limit=args.limit))

if __name__ == "__main__":
    main()
