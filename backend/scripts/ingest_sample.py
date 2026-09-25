import asyncio
import argparse
import logging
from typing import List, Dict, Any
from app.db.session import async_engine, AsyncSessionLocal
from app.db.base import Base
from app.etl.openlibrary import OpenLibraryCollector
from app.etl.wikipedia import WikipediaCollector
from app.etl.openalex import OpenAlexCollector
from app.etl.crossref import CrossrefCollector
from app.etl.europepmc import EuropePMCCollector
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

OFFLINE_SAMPLE_OPENALEX = [
    {
        "id": "https://openalex.org/W2741809807",
        "title": "Attention Is All You Need",
        "publication_year": 2017,
        "publication_date": "2017-06-12",
        "doi": "https://doi.org/10.48550/arxiv.1706.03762",
        "type": "article",
        "abstract_inverted_index": {
            "The": [0, 20],
            "dominant": [1],
            "sequence": [2, 11],
            "transduction": [3],
            "models": [4],
            "are": [5],
            "based": [6],
            "on": [7],
            "complex": [8],
            "recurrent": [9],
            "or": [10],
            "convolutional": [12],
            "neural": [13],
            "networks.": [14],
            "We": [15],
            "propose": [16],
            "the": [17],
            "Transformer,": [18],
            "a": [19],
            "model": [21],
            "architecture": [22],
            "eschewing": [23],
            "recurrence": [24],
            "and": [25],
            "instead": [26],
            "relying": [27],
            "entirely": [28],
            "on": [29],
            "an": [30],
            "attention": [31],
            "mechanism": [32],
            "to": [33],
            "draw": [34],
            "global": [35],
            "dependencies": [36],
            "between": [37],
            "input": [38],
            "and": [39],
            "output.": [40]
        },
        "authorships": [
            {
                "author_position": "first",
                "author": {"id": "https://openalex.org/A5023880391", "display_name": "Ashish Vaswani", "orcid": "https://orcid.org/0000-0001-9266-5647"},
                "institutions": [{"display_name": "Google Brain"}]
            },
            {
                "author_position": "middle",
                "author": {"id": "https://openalex.org/A5003442464", "display_name": "Noam Shazeer", "orcid": None},
                "institutions": [{"display_name": "Google Brain"}]
            },
            {
                "author_position": "last",
                "author": {"id": "https://openalex.org/A5046294828", "display_name": "Illia Polosukhin", "orcid": None},
                "institutions": [{"display_name": "Google Research"}]
            }
        ],
        "primary_location": {
            "source": {"display_name": "Advances in Neural Information Processing Systems (NeurIPS)"},
            "landing_page_url": "https://arxiv.org/abs/1706.03762",
            "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
            "license": "CC-BY-4.0"
        },
        "open_access": {"is_oa": True, "oa_status": "gold"},
        "cited_by_count": 125000,
        "concepts": [{"display_name": "Transformer", "score": 0.95}, {"display_name": "Natural language processing", "score": 0.88}]
    },
    {
        "id": "https://openalex.org/W2107466710",
        "title": "Deep Residual Learning for Image Recognition",
        "publication_year": 2016,
        "publication_date": "2016-06-27",
        "doi": "https://doi.org/10.1109/cvpr.2016.90",
        "type": "article",
        "abstract_inverted_index": {
            "Deeper": [0],
            "neural": [1],
            "networks": [2],
            "are": [3],
            "more": [4],
            "difficult": [5],
            "to": [6],
            "train.": [7],
            "We": [8],
            "present": [9],
            "a": [10],
            "residual": [11],
            "learning": [12],
            "framework": [13],
            "to": [14],
            "ease": [15],
            "the": [16],
            "training": [17],
            "of": [18],
            "networks": [19],
            "that": [20],
            "are": [21],
            "substantially": [22],
            "deeper": [23],
            "than": [24],
            "those": [25],
            "used": [26],
            "previously.": [27]
        },
        "authorships": [
            {
                "author_position": "first",
                "author": {"id": "https://openalex.org/A5046200000", "display_name": "Kaiming He", "orcid": "https://orcid.org/0000-0002-3904-5853"},
                "institutions": [{"display_name": "Microsoft Research"}]
            },
            {
                "author_position": "last",
                "author": {"id": "https://openalex.org/A5046200001", "display_name": "Jian Sun", "orcid": None},
                "institutions": [{"display_name": "Microsoft Research"}]
            }
        ],
        "primary_location": {
            "source": {"display_name": "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)"},
            "landing_page_url": "https://ieeexplore.ieee.org/document/7780459",
            "license": "Open Access"
        },
        "open_access": {"is_oa": True, "oa_status": "gold"},
        "cited_by_count": 185000,
        "concepts": [{"display_name": "Computer vision", "score": 0.94}, {"display_name": "Residual neural network", "score": 0.96}]
    }
]

OFFLINE_SAMPLE_CROSSREF = [
    {
        "DOI": "10.1038/171737a0",
        "title": ["Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid"],
        "container-title": ["Nature"],
        "publisher": "Springer Science and Business Media LLC",
        "created": {"date-parts": [[1953, 4, 25]]},
        "abstract": "<jats:p>We wish to suggest a structure for the salt of deoxyribose nucleic acid (D.N.A.). This structure has novel features which are of considerable biological interest.</jats:p>",
        "URL": "https://doi.org/10.1038/171737a0",
        "author": [
            {"given": "J. D.", "family": "Watson", "sequence": "first"},
            {"given": "F. H. C.", "family": "Crick", "sequence": "additional"}
        ],
        "volume": "171",
        "issue": "4356",
        "page": "737-738",
        "is-referenced-by-count": 14200,
        "reference-count": 6,
        "type": "journal-article"
    },
    {
        "DOI": "10.1002/andp.19163540702",
        "title": ["Die Grundlage der allgemeinen Relativitätstheorie"],
        "container-title": ["Annalen der Physik"],
        "publisher": "Wiley",
        "created": {"date-parts": [[1916, 3, 20]]},
        "abstract": "<jats:p>The foundation of the general theory of relativity establishes the principle of general covariance and explains gravitational physics through Riemannian geometry.</jats:p>",
        "URL": "https://doi.org/10.1002/andp.19163540702",
        "author": [
            {"given": "Albert", "family": "Einstein", "sequence": "first"}
        ],
        "volume": "354",
        "issue": "7",
        "page": "769-822",
        "is-referenced-by-count": 8900,
        "type": "journal-article"
    }
]

OFFLINE_SAMPLE_EUROPEPMC = [
    {
        "id": "22906801",
        "pmid": "22906801",
        "pmcid": "PMC6541524",
        "doi": "10.1126/science.1225829",
        "title": "A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity",
        "abstractText": "Bacteria and archaea have evolved RNA-mediated adaptive defense systems called CRISPR (clustered regularly interspaced short palindromic repeats)/CRISPR-associated (Cas) that protect organisms from invading viruses and plasmids. Here, we show that the Cas9 endonuclease is guided by dual-RNA structures to direct site-specific cleavage of target double-stranded DNA.",
        "authorString": "Jinek M, Chylinski K, Fonfara I, Hauer M, Doudna JA, Charpentier E",
        "journalTitle": "Science",
        "pubYear": "2012",
        "isOpenAccess": "Y",
        "citedByCount": 16500,
        "authorList": {
            "author": [
                {"fullName": "Martin Jinek", "firstName": "Martin", "lastName": "Jinek"},
                {"fullName": "Jennifer A Doudna", "firstName": "Jennifer A", "lastName": "Doudna", "authorId": {"type": "ORCID", "value": "0000-0001-9161-999X"}},
                {"fullName": "Emmanuelle Charpentier", "firstName": "Emmanuelle", "lastName": "Charpentier"}
            ]
        },
        "fullTextUrlList": {
            "fullTextUrl": [
                {"url": "https://europepmc.org/articles/PMC6541524", "documentStyle": "html"}
            ]
        }
    },
    {
        "id": "21376230",
        "pmid": "21376230",
        "doi": "10.1016/j.cell.2011.02.013",
        "title": "Hallmarks of cancer: the next generation",
        "abstractText": "The hallmarks of cancer comprise six biological capabilities acquired during the multistep development of human tumors. The hallmarks constitute an organizing principle for rationalizing the complexities of neoplastic disease. They include sustaining proliferative signaling, evading growth suppressors, resisting cell death, enabling replicative immortality, inducing angiogenesis, and activating invasion and metastasis.",
        "authorString": "Hanahan D, Weinberg RA",
        "journalTitle": "Cell",
        "pubYear": "2011",
        "isOpenAccess": "Y",
        "citedByCount": 54000,
        "authorList": {
            "author": [
                {"fullName": "Douglas Hanahan", "firstName": "Douglas", "lastName": "Hanahan"},
                {"fullName": "Robert A Weinberg", "firstName": "Robert A", "lastName": "Weinberg"}
            ]
        }
    }
]

async def seed_data(source: str = "all", limit: int = 5):
    logger.info("Initializing database tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ol_collector = OpenLibraryCollector()
    wiki_collector = WikipediaCollector()
    oa_collector = OpenAlexCollector()
    cr_collector = CrossrefCollector()
    epmc_collector = EuropePMCCollector()

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

                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing Open Library work: {doc.title}")
                    continue

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

        # Ingest OpenAlex
        if source in ["openalex", "scholarly", "all"]:
            logger.info("Collecting OpenAlex scholarly works...")
            raw_works = await oa_collector.fetch_works(query="deep learning genomics", limit=limit)
            if not raw_works:
                logger.info("Using offline curated OpenAlex sample dataset.")
                raw_works = OFFLINE_SAMPLE_OPENALEX

            for item in raw_works:
                doc = oa_collector.transform_record(item)
                if not doc:
                    continue

                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing OpenAlex work: {doc.title}")
                    continue

                chunks = oa_collector.create_chunks(doc.id, doc.content or doc.title)
                session.add(doc)
                for chunk in chunks:
                    session.add(chunk)

                logger.info(f"Ingested OpenAlex paper: '{doc.title}' with {len(chunks)} chunks.")

        # Ingest Crossref
        if source in ["crossref", "scholarly", "all"]:
            logger.info("Collecting Crossref records...")
            raw_cr = await cr_collector.fetch_works(query="quantum physics dna structure", limit=limit)
            if not raw_cr:
                logger.info("Using offline curated Crossref sample dataset.")
                raw_cr = OFFLINE_SAMPLE_CROSSREF

            for item in raw_cr:
                doc = cr_collector.transform_record(item)
                if not doc:
                    continue

                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing Crossref record: {doc.title}")
                    continue

                chunks = cr_collector.create_chunks(doc.id, doc.content or doc.title)
                session.add(doc)
                for chunk in chunks:
                    session.add(chunk)

                logger.info(f"Ingested Crossref record: '{doc.title}' with {len(chunks)} chunks.")

        # Ingest Europe PMC
        if source in ["europepmc", "scholarly", "all"]:
            logger.info("Collecting Europe PMC biomedical articles...")
            raw_epmc = await epmc_collector.fetch_articles(query="CRISPR Cas9 cancer", limit=limit)
            if not raw_epmc:
                logger.info("Using offline curated Europe PMC sample dataset.")
                raw_epmc = OFFLINE_SAMPLE_EUROPEPMC

            for item in raw_epmc:
                doc = epmc_collector.transform_record(item)
                if not doc:
                    continue

                existing = await session.execute(
                    select(KnowledgeDocument).where(
                        KnowledgeDocument.source == doc.source,
                        KnowledgeDocument.source_id == doc.source_id
                    )
                )
                if existing.scalar_one_or_none():
                    logger.info(f"Skipping existing Europe PMC article: {doc.title}")
                    continue

                chunks = epmc_collector.create_chunks(doc.id, doc.content or doc.title)
                session.add(doc)
                for chunk in chunks:
                    session.add(chunk)

                logger.info(f"Ingested Europe PMC paper: '{doc.title}' with {len(chunks)} chunks.")

        await session.commit()
        logger.info("Database ingestion commit completed successfully.")

def main():
    parser = argparse.ArgumentParser(description="Ingest sample public knowledge documents into database")
    parser.add_argument(
        "--source",
        choices=["openlibrary", "wikipedia", "openalex", "crossref", "europepmc", "scholarly", "all"],
        default="all",
        help="Source to ingest"
    )
    parser.add_argument("--limit", type=int, default=5, help="Number of items to fetch per source")
    args = parser.parse_args()

    asyncio.run(seed_data(source=args.source, limit=args.limit))

if __name__ == "__main__":
    main()
