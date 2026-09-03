# Search Dashboard React Error #31 & Warning Rendering Fix Orchestration Plan

## 1. Objective
Fix the React rendering crash (Minified React Error #31) on the search dashboard page (`frontend-dashboard/src/app/search/page.tsx`) when warning payloads are returned from the backend API:
- R1: Update `SearchResponse` TypeScript interface in `frontend-dashboard/src/app/search/page.tsx` to correctly map `warnings` as an array of objects `{ sourceName: string; message: string }` (or compatible shape returned by backend).
- R2: Safely render warning objects in the React JSX so that objects are not rendered directly as React children, cleanly rendering `sourceName` and `message` in the warnings UI banner.

## 2. Acceptance Criteria
- Running `npm run build` inside `frontend-dashboard` must compile successfully with zero TypeScript or Next.js build errors.
- When search response contains warnings, the UI does not crash with React Error #31 and cleanly displays each warning's source name and message.

## 3. Orchestration Workflow
1. **Phase 1: Exploration**:
   - Spawn `teamwork_preview_explorer` to inspect `frontend-dashboard/src/app/search/page.tsx`, backend search response shapes/DTOs, warning structures, build scripts in `frontend-dashboard`, and pinpoint exact crash points and recommended fixes.
2. **Phase 2: Implementation**:
   - Spawn `teamwork_preview_worker` to update `SearchResponse` interface and the JSX rendering logic in `frontend-dashboard/src/app/search/page.tsx`, then run `npm run build` (and lint/typecheck/tests) in `frontend-dashboard`.
3. **Phase 3: Verification & Review**:
   - Spawn `teamwork_preview_reviewer` (reviewer 1 and reviewer 2) to independently verify the changes, review the code diff, test cases, and execute build/test verification.
4. **Phase 4: Gate Check & Synthesis**:
   - Evaluate all reviewer reports in `GATE_STATUS.md`.
   - Update `progress.md` and `BRIEFING.md`.
   - Output structured completion report to user and parent.

