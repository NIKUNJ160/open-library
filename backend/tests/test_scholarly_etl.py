import pytest
from datetime import datetime, timezone
from app.etl.openalex import OpenAlexCollector
from app.etl.crossref import CrossrefCollector
from app.etl.europepmc import EuropePMCCollector

def test_openalex_abstract_unrolling():
    collector = OpenAlexCollector()
    inverted = {
        "Attention": [0],
        "is": [1],
        "all": [2],
        "you": [3],
        "need": [4]
    }
    unrolled = collector.unroll_abstract(inverted)
    assert unrolled == "Attention is all you need"

    # Empty or None inverted index
    assert collector.unroll_abstract(None) == ""
    assert collector.unroll_abstract({}) == ""

def test_openalex_transformation():
    collector = OpenAlexCollector()
    raw = {
        "id": "https://openalex.org/W2741809807",
        "title": "Attention Is All You Need",
        "publication_year": 2017,
        "doi": "https://doi.org/10.48550/arxiv.1706.03762",
        "type": "article",
        "abstract_inverted_index": {
            "We": [0],
            "propose": [1],
            "the": [2],
            "Transformer.": [3]
        },
        "authorships": [
            {
                "author": {"id": "A1", "display_name": "Ashish Vaswani", "orcid": "https://orcid.org/0000-0001-9266-5647"},
                "institutions": [{"display_name": "Google Brain"}]
            }
        ],
        "primary_location": {
            "source": {"display_name": "NeurIPS"},
            "license": "CC-BY-4.0"
        },
        "open_access": {"is_oa": True},
        "cited_by_count": 120000,
        "concepts": [{"display_name": "Transformer", "score": 0.9}]
    }

    doc = collector.transform_record(raw)
    assert doc is not None
    assert doc.source == "openalex"
    assert doc.source_id == "W2741809807"
    assert doc.title == "Attention Is All You Need"
    assert doc.doc_type == "paper"
    assert "We propose the Transformer." in doc.content
    assert doc.published_at == datetime(2017, 1, 1, tzinfo=timezone.utc)
    assert doc.license == "CC-BY-4.0"
    assert doc.metadata_json["doi"] == "10.48550/arxiv.1706.03762"
    assert doc.metadata_json["venue"] == "NeurIPS"
    assert len(doc.metadata_json["authors"]) == 1
    assert doc.metadata_json["authors"][0]["name"] == "Ashish Vaswani"
    assert doc.metadata_json["authors"][0]["orcid"] == "https://orcid.org/0000-0001-9266-5647"

def test_crossref_xml_cleaning_and_transformation():
    collector = CrossrefCollector()
    raw_xml = "<jats:p>We report the <jats:italic>crystal</jats:italic> structure of DNA.</jats:p>"
    clean = collector.strip_xml_tags(raw_xml)
    assert clean == "We report the crystal structure of DNA."

    raw = {
        "DOI": "10.1038/171737a0",
        "title": ["Molecular Structure of Nucleic Acids"],
        "container-title": ["Nature"],
        "publisher": "Springer Nature",
        "created": {"date-parts": [[1953, 4, 25]]},
        "abstract": raw_xml,
        "author": [
            {"given": "J. D.", "family": "Watson", "sequence": "first"},
            {"given": "F. H. C.", "family": "Crick", "sequence": "additional"}
        ],
        "volume": "171",
        "is-referenced-by-count": 15000
    }

    doc = collector.transform_record(raw)
    assert doc is not None
    assert doc.source == "crossref"
    assert doc.source_id == "10.1038/171737a0"
    assert doc.title == "Molecular Structure of Nucleic Acids"
    assert doc.published_at == datetime(1953, 4, 25, tzinfo=timezone.utc)
    assert doc.metadata_json["venue"] == "Nature"
    assert len(doc.metadata_json["authors"]) == 2
    assert doc.metadata_json["authors"][0]["name"] == "J. D. Watson"
    assert doc.metadata_json["volume"] == "171"

def test_europepmc_transformation():
    collector = EuropePMCCollector()
    raw = {
        "id": "22906801",
        "pmid": "22906801",
        "pmcid": "PMC6541524",
        "doi": "10.1126/science.1225829",
        "title": "A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity.",
        "abstractText": "CRISPR/Cas9 genome editing mechanisms.",
        "journalTitle": "Science",
        "pubYear": "2012",
        "isOpenAccess": "Y",
        "authorList": {
            "author": [
                {"fullName": "Martin Jinek", "firstName": "Martin", "lastName": "Jinek"},
                {"fullName": "Jennifer A Doudna", "firstName": "Jennifer A", "lastName": "Doudna", "authorId": {"type": "ORCID", "value": "0000-0001-9161-999X"}}
            ]
        }
    }

    doc = collector.transform_record(raw)
    assert doc is not None
    assert doc.source == "europepmc"
    assert doc.source_id == "PMC6541524"
    # Trailing period removed
    assert doc.title == "A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity"
    assert doc.published_at == datetime(2012, 1, 1, tzinfo=timezone.utc)
    assert doc.metadata_json["pmid"] == "22906801"
    assert doc.metadata_json["venue"] == "Science"
    assert len(doc.metadata_json["authors"]) == 2
    assert doc.metadata_json["authors"][1]["orcid"] == "0000-0001-9161-999X"
