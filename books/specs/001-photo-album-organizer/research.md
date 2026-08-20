# Technical Research & Architectural Decisions: Photo Album & Open Source Knowledge Library

**Feature**: `001-photo-album-organizer` | **Date**: 2026-08-18

## 1. Drag-and-Drop Reordering Engine

### Decision
Use `@dnd-kit/core` and `@dnd-kit/sortable` for main page album drag-and-drop reordering.

### Rationale
- **Accessibility & ARIA**: `@dnd-kit` provides out-of-the-box keyboard navigation, screen reader support, and customizable collision detection.
- **Performance**: High frame rate (60 FPS) drag animations using CSS transforms without triggering expensive DOM reflows.
- **Touch Support**: Native support for touch gestures on mobile/tablet devices.
- **Flat Hierarchy Constraint**: Customizable collision algorithms allow dropping items adjacent to other albums while strictly preventing nested drop targets.

### Alternatives Considered
- `HTML5 Drag-and-Drop API`: Fragile touch support, inconsistent browser implementation, difficult animation handling.
- `react-beautiful-dnd` / `@hello-pangea/dnd`: Good API, but less flexible for non-linear grid sortable layouts compared to `@dnd-kit`.

---

## 2. Tile Grid Rendering & Asset Performance

### Decision
Implement a responsive CSS Grid with `IntersectionObserver` lazy image loading and optional virtualized scrolling (`react-window`) for large albums (>100 items).

### Rationale
- **Fast Initial Render**: Renders thumbnail tile grid within 200ms by prioritizing visible items.
- **Low Memory Footprint**: Off-screen photo/document thumbnails are defer-loaded when scrolled into view.
- **Smooth Layout**: Standardized aspect ratio containers prevent cumulative layout shift (CLS).

### Alternatives Considered
- `Masonry.js`: Requires extra calculation overhead and causes dynamic layout shifts when loading asynchronous image dimensions.
- `Eager loading all images`: Causes severe bandwidth consumption and UI jank on large photo collections.

---

## 3. Date Grouping & Custom Sequence Persistence

### Decision
Store albums with both a `date` attribute (ISO 8601 string) and a `displayOrder` integer index. Group albums dynamically by date bucket (Year/Month), while maintaining relative `displayOrder` sorting within date groups.

### Rationale
- **Flexibility**: Enables natural chronological grouping while honoring custom user drag-and-drop placement within or across groups.
- **Instant Persistence**: Optimistic state updates reflect drag changes immediately on UI while asynchronously updating backend storage.

### Alternatives Considered
- `Strict Date Sorting Only`: Does not allow manual user re-ordering.
- `Unsorted Drag List`: Loses date-grouped visual context.

---

## 4. Flat Hierarchy Data Invariant

### Decision
Enforce flat album relationships at both application and database schema levels (`parent_id` is strictly non-existent or constrained to `NULL`).

### Rationale
- Completely eliminates nesting ambiguity and prevents nested sub-folder UX complexity as requested in feature requirements.
- Simplifies query performance and state management.

### Alternatives Considered
- `Self-referencing tree structure with validation rules`: Adds unnecessary model complexity for a strictly flat domain.
