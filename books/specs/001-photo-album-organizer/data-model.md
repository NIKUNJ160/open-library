# Data Model: Photo Album & Open Source Knowledge Library

**Feature**: `001-photo-album-organizer` | **Date**: 2026-08-18

## Key Entities

### 1. Album

Represents a top-level collection of media items (photos, books, research papers, government documents, blog posts, articles).

| Field | Type | Required | Description | Invariants & Constraints |
|-------|------|----------|-------------|--------------------------|
| `id` | `UUID` | Yes | Unique album identifier | Primary Key |
| `title` | `String` | Yes | Album / Collection title | 1-255 characters |
| `description` | `String` | No | Optional summary or notes | Max 2000 characters |
| `category` | `Enum` | Yes | Media type focus | `PHOTO`, `BOOK`, `RESEARCH_PAPER`, `GOVT_DOC`, `ARTICLE`, `MIXED` |
| `date` | `ISO-8601 Date` | Yes | Designated grouping date | Used for Year/Month date bucket grouping |
| `displayOrder` | `Integer` | Yes | Drag-and-drop sequence index | Non-negative integer for custom sorting |
| `coverMediaId` | `UUID` | No | Reference to cover photo/document tile | Foreign key to `MediaItem.id` |
| `createdAt` | `ISO-8601 Timestamp` | Yes | Creation timestamp | Auto-generated |
| `updatedAt` | `ISO-8601 Timestamp` | Yes | Last modification timestamp | Auto-updated |

**Flat Hierarchy Invariant**: Albums cannot contain sub-albums. There is no `parentAlbumId` field.

---

### 2. MediaItem

Represents an individual photo, document, paper, or article tile within an album.

| Field | Type | Required | Description | Invariants & Constraints |
|-------|------|----------|-------------|--------------------------|
| `id` | `UUID` | Yes | Unique item identifier | Primary Key |
| `albumId` | `UUID` | Yes | Parent album reference | Foreign key to `Album.id` |
| `title` | `String` | Yes | Item title or filename | 1-255 characters |
| `mediaType` | `Enum` | Yes | Specific content format | `IMAGE_JPEG`, `IMAGE_PNG`, `PDF_DOCUMENT`, `MARKDOWN_ARTICLE` |
| `url` | `URI` | Yes | Full asset URL/path | Valid absolute or storage URI |
| `thumbnailUrl` | `URI` | Yes | Low-res tile preview image URL | Required for grid rendering |
| `tilePosition` | `Integer` | Yes | Position in album tile grid | Non-negative integer |
| `fileSizeBytes` | `Integer` | Yes | File size | Positive integer |
| `metadata` | `JSON` | No | Technical EXIF / Document metadata | Optional key-value pairs (e.g., author, page count, camera info) |
| `createdAt` | `ISO-8601 Timestamp` | Yes | Item creation date | Auto-generated |

---

### 3. DateGroup (Derived View Entity)

Represents a visual date section container on the main page.

| Field | Type | Description |
|-------|------|-------------|
| `groupKey` | `String` | Grouping key formatted as `YYYY-MM` (e.g., `2026-08`) |
| `groupTitle` | `String` | Human-readable label (e.g., `August 2026`) |
| `albums` | `Array<Album>` | Sorted list of albums belonging to this date group |

---

## State Transitions & Validation Rules

### Album Reordering (Drag & Drop)
1. User initiates drag of `Album(A)` to slot adjacent to `Album(B)`.
2. UI validates that target slot is within a valid date group or at top/bottom of main page.
3. System recalculates `displayOrder` indices for affected albums.
4. `Album(A).displayOrder` is updated; state change is persisted.
5. Invariant check verifies zero nesting occurred.
