# Quickstart & Validation Guide: Photo Album & Open Source Knowledge Library

**Feature**: `001-photo-album-organizer` | **Date**: 2026-08-18

This guide describes how to validate the Photo Album & Open Source Knowledge Library implementation end-to-end.

## Prerequisites

- Node.js 20 LTS or higher installed
- npm / pnpm / yarn package manager

## Setup Commands

```bash
# Navigate to project directory
cd D:/books/books

# Install dependencies (once backend and frontend packages are created)
npm install
```

## Validation Scenarios

### Scenario 1: Date-Grouped Main Page Display
1. Start the application (`npm run dev`).
2. Load the main page in a browser (`http://localhost:3000`).
3. Verify that albums appear grouped under chronological date headers (e.g., "August 2026", "July 2026").
4. Confirm that all albums are rendered at the root grid level and no albums are nested inside other albums.

### Scenario 2: Drag-and-Drop Album Reordering
1. Click and hold an album card on the main page.
2. Drag the album to a different slot within the date group or across date groups.
3. Drop the album card.
4. Verify immediate visual rearrangement without screen flicker or layout corruption.
5. Refresh the browser page (`F5`) and confirm that the customized album order is preserved.

### Scenario 3: Tile Grid Photo & Document Preview
1. Click on any album to open its detail view.
2. Confirm photos/documents are displayed in a responsive, tile-like grid.
3. Click on any tile preview to view a full-sized preview lightbox.
4. Verify smooth tile grid rendering with no cumulative layout shifts.

## Automated Verification

```bash
# Run unit & component tests
npm run test

# Run Playwright E2E drag-and-drop & tile grid tests
npm run test:e2e
```
