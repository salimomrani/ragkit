# Plan — Ingest Visualization (008)

## Architecture

Frontend-only change. No new routes, services, or backend endpoints.
All data is already available from `GET /documents` (returns `id`, `name`, `chunk_count`, `ingested_at`).

## Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Filter state | `signal<string>('')` | Local UI state → `signal()` per Angular conventions |
| Filtered list | `computed()` derived from `documents` + `searchQuery` | Reactive, no manual subscription |
| Stats | `computed()` derived from `documents` | Single source of truth, auto-updates after ingest/delete |
| Date formatting | Native `Date.toLocaleDateString('fr-FR')` + custom relative logic | Zero dependencies |
| Search binding | `[value]` + `(input)` event | Compatible with `OnPush` + signals without FormsModule |

## Component Changes

### `ingest.ts`
- Add `searchQuery = signal<string>('')`
- Add `filteredDocuments = computed(...)` filtering by `searchQuery`
- Add `stats = computed(...)` aggregating `totalDocs` + `totalChunks`
- Add `formatDate(isoString): string` helper

### `ingest.html`
- `<div class="stats-bar">` above the two columns (full grid span)
- `<input class="search-input">` in the toolbar
- New `<th>Ingéré le</th>` column; `@for` iterates `filteredDocuments()`
- `@else if (filteredDocuments().length === 0)` state for empty filter

### `ingest.scss`
- `.stats-bar` — `grid-column: 1 / -1`, 2-card grid
- `.stat-card` — surface/border tokens, large mono value
- `.search-input` — small, expands on focus, uses CSS `transition`
- `.doc-date` — muted, `white-space: nowrap`

## No-regression Surface

All existing `ingest.spec.ts` tests must continue to pass.
New specs added: `filteredDocuments`, `stats`, `formatDate`.
