# Spec 008 — Ingest Visualization

## Summary

Enrich the `/ingest` page so users can immediately see the state of their knowledge base at a glance and quickly locate documents by name.

## Problem

The existing ingest page shows a plain list of documents (name + chunk count only). It lacks:
- Any aggregate indication of the knowledge base size (document count, total chunks)
- The ingestion timestamp — users cannot tell when a document was ingested
- Any way to search/filter the list when many documents are present

## Solution

Three additive UI improvements on the Angular `Ingest` component (frontend only, no backend changes):

1. **Stats bar** — a full-width row of two cards above the main columns showing:
   - Total document count
   - Total chunk count
2. **Date column** — an "Ingéré le" column in the document table displaying a formatted timestamp with a French relative label (e.g. "24 fév. 2026 · il y a 2 j")
3. **Search/filter input** — a text input in the toolbar area that filters the document table in real time by document name (case-insensitive)

## Scope

- Frontend only: `ingest.ts`, `ingest.html`, `ingest.scss`, `ingest.spec.ts`
- No backend changes required (`ingested_at` already returned by `GET /documents`)

## Acceptance Criteria

- [ ] Stats bar visible at the top of the page with correct totals
- [ ] `ingested_at` displayed in the table with relative time
- [ ] Filter input filters the list in real time
- [ ] No-results message when filter matches nothing but documents exist
- [ ] All existing tests pass; new tests added for `filteredDocuments`, `stats`, `formatDate`
- [ ] `npm run lint` passes with 0 errors
