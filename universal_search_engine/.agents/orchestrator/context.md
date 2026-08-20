# Project Context — Universal Open Knowledge Search Engine

## Overview
Universal Open Knowledge Search Engine is a NestJS backend application that aggregates metadata and links from 30+ open-access sources across 7 categories into a unified search API.

## Requirements Summary
1. **7 Source Categories & Connectors**:
   - Books: Open Library, Project Gutenberg, Google Books API, Internet Archive
   - Research Papers: OpenAlex, CORE, Semantic Scholar, arXiv, PubMed, Europe PMC, DOAJ
   - Datasets: Kaggle (metadata), Hugging Face Datasets, Data.gov, Zenodo
   - Patents: Google Patents, USPTO, WIPO
   - Repos: GitHub
   - Gov Publications: NASA Technical Reports, World Bank Open Data
   - Documentation: MDN Web Docs
2. **Unified Result Schema**:
   - `title`, `authors`, `description`, `url`, `publishedDate`, `contentType`, `sourceName`
   - Graceful partial failure handling with `warnings` array on source errors.
3. **API Gateway & Auth & Cache**:
   - `/api/v1` routes
   - API key auth (`x-api-key`)
   - Redis caching with TTL per category + in-memory fallback
   - Request validation & consistent error response format
   - Health check (`/api/v1/health`)
4. **AI Stubs**:
   - `/api/v1/ai/summarize`
   - `/api/v1/ai/eli5`
   - `/api/v1/ai/cite`
   - `/api/v1/ai/ask`
   - `/api/v1/ai/recommendations`
5. **Observability & Docs**:
   - Correlation logging (`correlationId`)
   - Swagger UI (`/api/docs`)
   - `README.md` with setup/run instructions
6. **Testing & Quality**:
   - `npm install`, `npm start`, `npm test` functional.
