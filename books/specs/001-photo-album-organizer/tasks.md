# Tasks: Photo Album & Open Source Knowledge Library

**Feature**: `001-photo-album-organizer` | **Date**: 2026-08-18 | **Spec**: [spec.md](file:///d:/books/books/specs/001-photo-album-organizer/spec.md) | **Plan**: [plan.md](file:///d:/books/books/specs/001-photo-album-organizer/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial repository layout, project initialization, and dependency configuration

- [x] T001 Create frontend and backend directory structures per implementation plan in `frontend/` and `backend/`
- [x] T002 Initialize Node.js TypeScript project dependencies in `backend/package.json` and `frontend/package.json`
- [x] T003 [P] Configure TypeScript, ESLint, and Prettier rules in `frontend/tsconfig.json` and `backend/tsconfig.json`
- [x] T004 [P] Setup Tailwind CSS configuration and theme styling in `frontend/tailwind.config.js` and `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be completed before ANY user story can be implemented

- [x] T005 [P] Define TypeScript interfaces for Album, MediaItem, and DateGroup in `shared/types/library.ts`
- [x] T006 [P] Scaffolding Express REST API server with CORS and error handling middleware in `backend/src/index.ts` and `backend/src/middleware/errorHandler.ts`
- [x] T007 Initialize SQLite database schema and connection manager in `backend/src/db/schema.sql` and `backend/src/db/connection.ts`
- [x] T008 [P] Implement IndexedDB storage adapter for local offline caching in `frontend/src/services/storageAdapter.ts`
- [x] T009 [P] Implement HTTP API client for frontend backend communication in `frontend/src/services/apiClient.ts`

**Checkpoint**: Core foundation ready — User story implementation can now begin

---

## Phase 3: User Story 1 - Viewing & Date-Grouped Album Display (Priority: P1) 🌟 MVP

**Goal**: Users can view all photo albums and knowledge collections grouped chronologically by date in a flat layout on the main page.

**Independent Test**: Seed albums with various dates and verify they render under date headers without nested structures.

- [x] T010 [P] [US1] Implement backend Album database model and query service in `backend/src/models/albumModel.ts` and `backend/src/services/albumService.ts`
- [x] T011 [US1] Implement GET `/api/albums` date-grouping endpoint in `backend/src/api/albumRoutes.ts`
- [x] T012 [P] [US1] Create AlbumCard component displaying album title, date, and cover preview in `frontend/src/components/AlbumCard.tsx`
- [x] T013 [P] [US1] Create DateGroupSection component for chronological group headers in `frontend/src/components/DateGroupSection.tsx`
- [x] T014 [US1] Create MainLibraryView page component rendering date-grouped album sections in `frontend/src/pages/MainLibraryView.tsx`
- [x] T015 [US1] Implement album data fetching and state management hook in `frontend/src/hooks/useAlbums.ts`

**Checkpoint**: User Story 1 fully functional and independently testable (MVP complete)

---

## Phase 4: User Story 2 - Drag-and-Drop Album Re-organization (Priority: P1)

**Goal**: Users can re-organize albums on the main page by dragging and dropping them, updating order instantly while preserving flat hierarchy.

**Independent Test**: Drag an album card to a new position, release, and verify sequence updates and persists across browser refreshes.

- [x] T016 [P] [US2] Implement PUT `/api/albums/reorder` API endpoint to persist order index in `backend/src/api/reorderRoutes.ts` and `backend/src/services/albumService.ts`
- [x] T017 [P] [US2] Setup `@dnd-kit` DndContext, PointerSensor, and KeyboardSensor in `frontend/src/components/DndProvider.tsx`
- [x] T018 [US2] Create SortableAlbumCard wrapper component using `useSortable` in `frontend/src/components/SortableAlbumCard.tsx`
- [x] T019 [US2] Implement optimistic drag-and-drop state hook `useDragReorder` in `frontend/src/hooks/useDragReorder.ts`
- [x] T020 [US2] Enforce flat hierarchy boundary rules (prevent nested drops) in `frontend/src/utils/dndInvariants.ts`

**Checkpoint**: User Story 1 and 2 work independently and seamlessly together

---

## Phase 5: User Story 3 - Tile Grid Photo & Document Preview Within Albums (Priority: P2)

**Goal**: Users can click an album to view contained photos, research papers, and documents in a responsive tile grid interface.

**Independent Test**: Open an album containing media items and verify tile previews render with lazy loading and full lightbox preview upon click.

- [x] T021 [P] [US3] Implement MediaItem query service and GET `/api/albums/:id/items` route in `backend/src/services/mediaService.ts` and `backend/src/api/mediaRoutes.ts`
- [x] T022 [P] [US3] Create MediaTile component for photo/document thumbnail previews in `frontend/src/components/MediaTile.tsx`
- [x] T023 [US3] Create TilePreviewGrid component with lazy image loading in `frontend/src/components/TilePreviewGrid.tsx`
- [x] T024 [P] [US3] Create LightboxModal component for full-resolution inspection in `frontend/src/components/LightboxModal.tsx`
- [x] T025 [US3] Create AlbumDetailView page component in `frontend/src/pages/AlbumDetailView.tsx`

**Checkpoint**: User Stories 1, 2, and 3 fully operational

---

## Phase 6: User Story 4 - Photo & Album Management (Priority: P3)

**Goal**: Users can create new photo albums or document collections and add items to existing albums.

**Independent Test**: Create a new album, upload/assign photos, and observe its appearance in the date-grouped main page.

- [x] T026 [P] [US4] Implement POST `/api/albums` endpoint in `backend/src/api/albumRoutes.ts`
- [x] T027 [P] [US4] Implement file upload and media creation API endpoints in `backend/src/api/mediaRoutes.ts`
- [x] T028 [US4] Create CreateAlbumModal form component in `frontend/src/components/CreateAlbumModal.tsx`
- [x] T029 [US4] Create AddMediaModal upload component in `frontend/src/components/AddMediaModal.tsx`
- [x] T030 [US4] Integrate creation modals into `frontend/src/pages/MainLibraryView.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, automated testing, and validation

- [x] T031 [P] Add WCAG accessibility ARIA roles, labels, and focus styling across UI components in `frontend/src/components/`
- [x] T032 [P] Write Vitest unit tests for date grouping and drag invariant utilities in `frontend/src/tests/unit/dndInvariants.test.ts`
- [x] T033 [P] Write Playwright E2E test suite for drag-and-drop album reordering in `frontend/src/tests/e2e/dragReorder.spec.ts`
- [x] T034 Run quickstart validation scenarios defined in `specs/001-photo-album-organizer/quickstart.md`
