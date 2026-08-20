# Search Features

## Full‑text Search
- **Support:** titles, subtitles, abstracts, authors, ISBN, DOI, journal names, keywords, tags, descriptions.

## Semantic Search
- Implement embedding‑based search.
- Use vector similarity to match query semantics.

## Autocomplete
- Provide intelligent suggestions while typing.
- Example: typing `artif` suggests `Artificial Intelligence` and related terms.

## Spell Correction
- Detect misspellings and suggest corrected queries.
- Example: `machin learnng` → `machine learning`.

## Synonym Expansion
- Expand query with synonyms.
- Example: `car` expands to `automobile`, `vehicle`, `transport`.

## Search Operators (Advanced)
- **author:** filter by author name, e.g., `author:Andrew Ng`
- **year:** filter by publication year, e.g., `year:2025`
- **after / before:** date ranges, e.g., `after:2023`, `before:2020`
- **isbn:** specific ISBN, e.g., `isbn:9780132350884`
- **doi:** specific DOI, e.g., `doi:10.xxxx`
- **journal:** filter by journal name, e.g., `journal:Nature`
- **publisher:** filter by publisher, e.g., `publisher:MIT`
- **language:** filter by language, e.g., `language:English`
- **license:** filter by license type, e.g., `license:CC-BY`
- **type:** filter by content type (book, paper, journal, dataset, government, biography, etc.)
- **free / pdf / open‑access / peer‑reviewed:** boolean flags.

These operators can be combined for precise queries.
