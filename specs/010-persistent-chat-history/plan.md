# Implementation Plan: Persistent Chat History

**Branch**: `010-persistent-chat-history` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-persistent-chat-history/spec.md`

---

## Summary

Add persistent, multi-session chat history to the RagKit application. Each browser session is tagged with a client-generated UUID (`session_id`) sent with every query. The backend persists the `session_id` alongside existing `query_log` entries (minimal schema change: one new nullable column). Three new API endpoints expose conversation list, detail, and delete. The Angular frontend adds a slide-in history panel within the Chat view, backed by a new `ConversationService`.

---

## Technical Context

**Language/Version**: Python 3.12 (backend) / TypeScript + Angular 21 (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, PostgreSQL 16 (backend) / Angular HttpClient, Signals (frontend)
**Storage**: PostgreSQL 16 — extend `query_logs` with `session_id VARCHAR` (nullable, indexed)
**Testing**: pytest + ruff (backend) / Karma + Jasmine + ESLint (frontend)
**Target Platform**: Local dev — Docker PostgreSQL, Uvicorn, Angular CLI
**Project Type**: Web application (separate backend + frontend)
**Performance Goals**: History panel loads within 1 second for 50 conversations
**Constraints**: No new top-level dependencies; no Alembic; backward compatible; no data leaves the machine (Principle I)
**Scale/Scope**: Single-user local demo — 50 conversations cap, ~200 total exchanges maximum

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Local-First | ✅ Pass | All data stays in local PostgreSQL; `session_id` is a client UUID with no PII |
| II. Traceability | ✅ Pass | Extends existing query log with `session_id`; no traceability fields removed |
| III. Fail Transparently | ✅ Pass | 404 returned for unknown sessions; empty array for no history |
| IV. Separation of Concerns | ✅ Pass | New `history.py` router + `ConversationService` are independent modules; query flow unchanged |
| V. Demo Reproducibility | ✅ Pass | Startup DDL migration is idempotent; no manual DB setup step added |

No violations — no complexity justification table needed.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-persistent-chat-history/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Phase 1 — schema, types, file map
├── quickstart.md        # Phase 1 — manual verification steps
├── contracts/
│   └── history-api.md   # Phase 1 — API contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 — /speckit.tasks output
```

### Source Code — Affected Files

```text
backend/
├── models/
│   └── db.py                        # Add session_id field to QueryLog
├── dependencies.py                  # Add startup DDL migration
├── logging_service/
│   └── store.py                     # Add session_id param to save()
├── api/
│   ├── __init__.py                  # Register history router
│   └── v1/
│       ├── query.py                 # Add session_id to QueryRequest + pass to save()
│       └── history.py               # NEW — 3 endpoints: list, detail, delete
└── tests/
    ├── test_api.py                  # New history endpoint tests
    └── test_models.py               # Optional: session_id field test

frontend/src/app/
├── services/
│   ├── rag-api.service.ts           # Add ConversationSummary/Detail types + 3 HTTP methods
│   └── conversation.service.ts      # NEW — sessionId lifecycle + history state signals
└── components/
    └── chat/
        ├── chat.ts                  # Inject ConversationService, pass session_id in sendMessage()
        ├── chat.html                # Add history toggle button + <app-history-panel>
        ├── chat.scss                # Panel overlay styles
        └── history-panel/
            ├── history-panel.ts     # NEW — standalone component
            ├── history-panel.html   # NEW — list + detail views
            └── history-panel.scss   # NEW — slide-in animation + layout
```

---

## Implementation Phases

### Phase 1 — Backend Schema & Data Layer

**Goal**: `session_id` travels from query request to DB. Existing behaviour unchanged.

**Tasks**:
1. Add `session_id: Mapped[str | None]` (nullable, indexed) to `QueryLog` in `backend/models/db.py`
2. Add startup DDL migration in `backend/dependencies.py` (`get_engine()`): run `ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR; CREATE INDEX IF NOT EXISTS ix_query_logs_session_id ON query_logs(session_id);`
3. Add `session_id: str | None = None` to `QueryRequest` in `backend/api/v1/query.py`
4. Add `session_id: str | None = None` param to `LogStore.save()` in `backend/logging_service/store.py` and pass to `QueryLog` constructor
5. Pass `session_id=request.session_id` in both `query()` and `query_stream()` handlers in `backend/api/v1/query.py`

### Phase 2 — Backend History API

**Goal**: Three new endpoints exposed and registered.

**Tasks**:
6. Create `backend/api/v1/history.py` with:
   - `GET /history` — group `query_logs` by `session_id`, return summaries (limit/offset)
   - `GET /history/{session_id}` — return all exchanges for a session, ordered by timestamp ASC
   - `DELETE /history/{session_id}` — delete all rows with matching `session_id`, return 204
7. Register `history_router` in `backend/api/__init__.py`

### Phase 3 — Frontend Session & Service

**Goal**: Angular app generates and manages `session_id`; history API calls wired up.

**Tasks**:
8. Add `ConversationSummary`, `ConversationDetail`, `ConversationExchange` types and three HTTP methods (`getHistory()`, `getConversation()`, `deleteConversation()`) to `RagApiService`
9. Create `ConversationService` with: `sessionId` (from `sessionStorage`, init at constructor), `conversations` signal, `selectedConversation` signal, `historyOpen` signal, and methods `loadHistory()`, `loadConversation()`, `deleteConversation()`, `toggleHistory()`
10. In `Chat.sendMessage()`, inject `ConversationService` and pass `session_id: this.conversationService.sessionId` to `api.streamQuery()`

### Phase 4 — Frontend History Panel UI

**Goal**: Slide-in history panel renders conversation list and detail.

**Tasks**:
11. Create `HistoryPanel` standalone component with `@Input() service: ConversationService` (or inject directly)
    - List view: show `ConversationSummary[]` from signal; click → load detail
    - Detail view: show `ConversationExchange[]` from selected conversation; back button
    - Delete: button per conversation with `window.confirm()` guard
12. Add history toggle button to `chat.html`, include `<app-history-panel>` with slide-in transition
13. Style the panel: left drawer, overlay backdrop, slide animation via CSS transform

---

## TDD Checkpoints

Each phase follows RED → GREEN → REFACTOR.

### Phase 1 Tests (backend)
- `test_query_endpoint_accepts_session_id` — POST with `session_id` returns 200
- `test_log_store_save_persists_session_id` — `save(session_id="x")` → DB row has `session_id == "x"`
- `test_query_without_session_id_still_works` — backward compatibility

### Phase 2 Tests (backend)
- `test_get_history_empty` — no sessions → returns `[]`
- `test_get_history_groups_by_session` — 3 logs same session → 1 conversation summary
- `test_get_history_ordered_most_recent_first`
- `test_get_conversation_detail` — returns exchanges ASC
- `test_get_conversation_not_found` — 404 for unknown session_id
- `test_delete_conversation` — 204, rows removed
- `test_delete_conversation_not_found` — 404

### Phase 3 & 4 Tests (frontend)
- `should generate sessionId at construction and persist in sessionStorage`
- `should reuse existing sessionId from sessionStorage on re-init`
- `should pass sessionId to streamQuery in sendMessage()`
- `should load history on toggleHistory()`
- `should delete conversation and remove from signal`
- `should show empty state when conversations is empty`

---

## Validation

```bash
# Backend
cd backend && .venv/bin/pytest tests/ -v && .venv/bin/ruff check .

# Frontend
cd frontend && npm test -- --watch=false && npm run lint

# Manual end-to-end
# See specs/010-persistent-chat-history/quickstart.md
```
