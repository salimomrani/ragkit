# Tasks: Response Feedback

**Input**: Design documents from `/specs/011-response-feedback/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project structure needed — feature extends the existing backend and frontend.

- [x] T001 Verify PostgreSQL is running (`docker-compose up -d`) and backend starts cleanly (`cd backend && .venv/bin/uvicorn main:app --reload --port 8000`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New `ResponseFeedback` DB model and feedback router — MUST be complete before any user story UI work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `ResponseFeedback` SQLAlchemy model to `backend/models/db.py` (fields: `id`, `log_id` FK+UNIQUE, `is_positive`, `comment`, `created_at`, `updated_at`)
- [x] T003 Create `backend/api/v1/feedback.py` with `POST /api/v1/feedback` — upsert semantics (create or update), validate `log_id` exists (404), `comment` ≤ 500 chars (422)
- [x] T004 Register feedback router in `backend/api/__init__.py`

**Checkpoint**: Backend ready — `POST /api/v1/feedback` returns 200 for valid payloads, 404 for unknown log_id, 422 for long comments.

---

## Phase 3: User Story 1 — Rate a Response (Priority: P1) 🎯 MVP

**Goal**: Users can click 👍 or 👎 beneath any RAG answer; rating is saved and visually confirmed.

**Independent Test**: Send a question, receive a full answer, click 👍 — verify button is highlighted and `GET /api/v1/logs` shows `feedback.is_positive: true` for that entry.

- [x] T005 [US1] Write backend tests for `POST /api/v1/feedback` in `backend/tests/test_api.py`: create feedback, upsert (change rating), 404 on unknown log_id, 422 on comment > 500 chars
- [x] T006 [P] [US1] Add `FeedbackEntry` interface (`is_positive`, `comment`, `updated_at`) and `submitFeedback(logId, isPositive, comment?)` method to `frontend/src/app/services/rag-api.service.ts`
- [x] T007 [P] [US1] Add per-message feedback state to `frontend/src/app/components/chat/chat.ts`: track `{ logId, isPositive: boolean | null, submitting, error }` per message; expose `submitRating(msgIndex, isPositive)` handler; set `feedbackEnabled = false` when `meta` SSE event contains `guardrail_triggered: true` (FR-008)
- [x] T008 [US1] Add 👍/👎 buttons to `frontend/src/app/components/chat/chat.html` beneath assistant messages — visible only after `type === 'done'` SSE event; active button highlighted; calls `submitRating()`
- [x] T009 [P] [US1] Add feedback button styles (highlighted state, disabled during submit, error state) to `frontend/src/app/components/chat/chat.scss`
- [x] T010 [US1] Write chat feedback button tests in `frontend/src/app/components/chat/chat.spec.ts`: buttons appear after done event, 👍 call triggers service, rating state updates

**Checkpoint**: User Story 1 fully functional — rating works end-to-end, buttons reflect selection.

---

## Phase 4: User Story 2 — Comment on Negative Feedback (Priority: P2)

**Goal**: Clicking 👎 reveals an optional comment textarea; submitting stores the comment with the rating.

**Independent Test**: Click 👎, type "Test comment", click Submit — verify `GET /api/v1/logs` shows `feedback.is_positive: false, feedback.comment: "Test comment"`.

- [x] T011 [US2] Extend feedback state in `frontend/src/app/components/chat/chat.ts` with `comment` string and `showComment` boolean; add `submitWithComment(msgIndex)` handler; hide comment when 👍 is selected
- [x] T012 [US2] Add comment textarea + Submit button to `frontend/src/app/components/chat/chat.html`: shown when `showComment` is true (after 👎); hidden on 👍 click; max 500 chars enforced with inline counter
- [x] T013 [US2] Write comment interaction tests in `frontend/src/app/components/chat/chat.spec.ts`: 👎 shows textarea, 👍 hides it, submit calls service with comment, empty comment submits without comment

**Checkpoint**: User Story 2 fully functional — comment flow works, toggling ratings hides/shows textarea correctly.

---

## Phase 5: User Story 3 — View Feedback in Logs (Priority: P3)

**Goal**: The `/logs` view shows a Feedback column with 👍, 👎, or — for each query, plus the comment.

**Independent Test**: After submitting feedback, navigate to `/logs` — verify the corresponding row shows the correct rating icon and comment.

- [x] T014 [US3] Extend `GET /logs` in `backend/api/v1/logs.py` to LEFT JOIN `response_feedback` on `log_id` and include `feedback: { is_positive, comment, updated_at } | null` in each response item
- [x] T015 [US3] Write backend test for extended `GET /logs` response in `backend/tests/test_api.py`: entry without feedback has `feedback: null`, entry with feedback has correct fields
- [x] T016 [US3] Extend `LogEntry` interface in `frontend/src/app/services/rag-api.service.ts` with `feedback: FeedbackEntry | null` (depends on T006)
- [x] T017 [US3] Add Feedback column to `frontend/src/app/components/logs/logs.html`: display 👍 / 👎 / — based on `log.feedback`; show comment in tooltip or expanded row
- [x] T018 [US3] Extend `frontend/src/app/components/logs/logs.ts` to support comment display: add `expandedFeedbackId` signal and `toggleFeedback(id)` handler for comment tooltip/expansion
- [x] T019 [US3] Write logs feedback display tests in `frontend/src/app/components/logs/logs.spec.ts`: renders 👍 for positive, 👎 for negative, — for null, comment visible on expand

**Checkpoint**: All three user stories functional — feedback submitted in chat is visible in logs.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 Run quickstart.md smoke test end-to-end: ask question → rate 👎 with comment → navigate to /logs → verify feedback appears
- [x] T021 Run full test suite: `cd backend && .venv/bin/pytest tests/ -v` and `cd frontend && npm test -- --watch=false` — all tests must pass
- [x] T022 Run linters: `cd backend && .venv/bin/ruff check .` and `cd frontend && npm run lint` — zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies — start immediately
- **Phase 2** (Foundational): Depends on Phase 1 — BLOCKS all user stories
- **Phase 3** (US1): Depends on Phase 2 completion
- **Phase 4** (US2): Depends on Phase 3 (comment extends rating state from US1)
- **Phase 5** (US3): Depends on Phase 2 backend; can overlap with Phase 3/4 frontend work
- **Phase 6** (Polish, T020–T022): Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — pure new feature
- **US2 (P2)**: Depends on US1 (extends chat feedback state)
- **US3 (P3)**: Backend part (T014–T015) can run in parallel with US1/US2; frontend part (T016–T018) independent

### Parallel Opportunities within Phases

- **Phase 3**: T006 (service), T007 (component TS), T009 (styles) can run in parallel
- **Phase 5**: T014 (backend) and T016 (frontend interface) can run in parallel

---

## Parallel Example: Phase 3 (US1)

```bash
# Write tests first (TDD):
Task T005: backend tests for POST /feedback

# Then implement in parallel:
Task T006: RagApiService.submitFeedback()
Task T007: chat.ts feedback state
Task T009: chat.scss button styles

# Then integrate (depends on T006, T007):
Task T008: chat.html 👍/👎 buttons

# Then verify:
Task T010: chat.spec.ts tests
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify environment
2. Complete Phase 2: DB model + API router (CRITICAL)
3. Complete Phase 3: Rating buttons in chat + backend tests
4. **STOP and VALIDATE**: End-to-end rating test
5. Demo-ready at this point

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 → 👍/👎 buttons working (MVP)
3. Phase 4 → Comment textarea added
4. Phase 5 → Logs view shows feedback
5. Phase 6 → Full test pass, lint clean

---

## Notes

- [P] tasks = different files, no state dependencies — safe to parallelize
- [US*] label maps each task to its user story for traceability
- Write backend tests (T005, T015) before implementing the features they cover (TDD)
- Commit after each phase checkpoint
- `feedback.comment` is always null for 👍 ratings — no need to display in logs
