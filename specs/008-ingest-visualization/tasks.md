# Tasks — Ingest Visualization (008)

## Phase 1 — Spec & Plan
- [x] Write spec.md
- [x] Write plan.md

## Phase 2 — Implementation (TDD)

### T001 — Stats computed signal
- [x] Add `stats = computed(...)` in `ingest.ts`
- [x] Tests: `stats.totalDocs`, `stats.totalChunks`

### T002 — Filter signal + computed filtered list
- [x] Add `searchQuery = signal<string>('')` in `ingest.ts`
- [x] Add `filteredDocuments = computed(...)` in `ingest.ts`
- [x] Tests: empty query returns all, partial match, case-insensitive, no match

### T003 — Date formatter helper
- [x] Add `formatDate(isoString: string): string` in `ingest.ts`
- [x] Tests: valid ISO, recent (relative), very recent ("à l'instant")

### T004 — Template updates
- [x] Stats bar in `ingest.html`
- [x] Search input in toolbar
- [x] `ingested_at` column calling `formatDate()`
- [x] Empty-filter message

### T005 — Styles
- [x] `.stats-bar`, `.stat-card`, `.search-input`, `.doc-date` in `ingest.scss`

## Phase 3 — Completion
- [x] `npm test -- --watch=false` — 43/43 pass
- [x] `npm run lint` — 0 errors
- [ ] Commit on feature branch `feat/008-ingest-visualization`
- [ ] Open PR
