## 2026-08-02T00:58:11Z

You are an Explorer for Milestone 2: Unified Schema & 7 Category Connectors of the Universal Open Knowledge Search Engine.
Working directory: d:\books\universal_search_engine\.agents\explorer_m2_1\

Tasks:
1. Review the requirements in `d:\books\universal_search_engine\ORIGINAL_REQUEST.md` and `d:\books\universal_search_engine\.agents\orchestrator\PROJECT.md`.
2. Design the unified search result schema DTOs and query DTOs (`SearchResultDto`, `AuthorDto`, `SearchQueryDto`, `SearchResponseDto`, `WarningDto`).
3. For each of the 7 source categories and their connectors:
   - Books: Open Library (`openlibrary`), Project Gutenberg (`gutenberg`), Google Books API (`googlebooks`), Internet Archive (`internetarchive`)
   - Research Papers: OpenAlex (`openalex`), CORE (`core`), Semantic Scholar (`semanticscholar`), arXiv (`arxiv`), PubMed (`pubmed`), Europe PMC (`europepmc`), DOAJ (`doaj`)
   - Datasets: Kaggle metadata (`kaggle`), Hugging Face Datasets (`huggingface`), Data.gov (`datagov`), Zenodo (`zenodo`)
   - Patents: Google Patents (`googlepatents`), USPTO (`uspto`), WIPO (`wipo`)
   - Open-Source Repos: GitHub (`github`)
   - Government Publications: NASA Technical Reports (`nasa`), World Bank Open Data (`worldbank`)
   - Documentation: MDN Web Docs (`mdn`)
   Detail for each connector: API endpoint URL structure, query parameter mapping, normalization logic to common schema fields (`id`, `title`, `authors`, `description`, `url`, `publishedDate`, `contentType`, `sourceName`), timeout handling (5s limit), and mock/fallback response handling for API failures or missing API keys.
4. Design `SearchAggregatorService` to execute connector calls in parallel with `Promise.allSettled`, aggregate normalized results, and capture warnings for failed sources.
5. Plan unit tests for schema normalization and connector failure resilience (`search-aggregator.service.spec.ts`, `connectors.spec.ts`).
6. Write your detailed technical specification report to `d:\books\universal_search_engine\.agents\explorer_m2_1\analysis.md` and deliver handoff.
