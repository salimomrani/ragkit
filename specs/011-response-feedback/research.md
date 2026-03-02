# Research: Response Feedback

## Decision 1: Feedback storage strategy

**Decision**: Add a dedicated `ResponseFeedback` table linked to `QueryLog` via foreign key, rather than adding columns directly to `query_logs`.

**Rationale**: Keeps the `QueryLog` model focused on traceability (constitution Principle II). Feedback is optional and not always present, so nulling 3 columns on every row is wasteful. A separate table allows querying feedback independently and extending it (multiple ratings, reply threads) without touching the core log schema.

**Alternatives considered**:
- Add `feedback_rating`, `feedback_comment`, `feedback_at` columns to `query_logs` → rejected: pollutes core traceability model, many nulls, harder to query aggregates.
- Store feedback as JSONB in an existing column → rejected: unstructured, not queryable.

---

## Decision 2: API design

**Decision**: Two endpoints:
- `POST /api/v1/feedback` — create or update feedback for a given `log_id`. Upsert semantics (idempotent on `log_id`).
- Extend `GET /api/v1/logs` response to include embedded `feedback` object per log entry.

**Rationale**: A single upsert endpoint simplifies the frontend (no need to track whether feedback exists). Embedding feedback in the logs response avoids an N+1 pattern (one JOIN instead of N calls).

**Alternatives considered**:
- Separate `POST` and `PATCH` endpoints → rejected: forces client to track feedback existence state.
- `GET /feedback/{log_id}` for separate fetching → rejected: adds round-trip; logs view would need N extra calls.

---

## Decision 3: Rating representation

**Decision**: Boolean field `is_positive: bool` — `True` = 👍, `False` = 👎.

**Rationale**: Binary rating matches the spec (thumbs up / thumbs down). Simple to store, query, and filter. Avoids score-inflation problems of numeric ratings.

**Alternatives considered**:
- Integer score (1–5 stars) → rejected: overengineered for the stated need; spec is explicit about binary.
- String enum (`positive`/`negative`) → rejected: boolean is smaller, faster to index, equally expressive.

---

## Decision 4: Feedback button placement in chat

**Decision**: Feedback buttons appear inline beneath each assistant message bubble, visible after the streaming is complete (`done` event received).

**Rationale**: Matches the spec requirement "after a successful answer is displayed". Avoids showing buttons mid-stream which would confuse users.

**Alternatives considered**:
- Floating action bar → rejected: poor UX for multi-turn conversations.
- Separate feedback panel → rejected: adds navigation friction; inline is standard (ChatGPT, Claude, etc.).

---

## Decision 5: Comment submission flow

**Decision**: When 👎 is clicked, a textarea appears inline with a "Submit" button. Submitting without a comment sends the negative rating immediately. The textarea is hidden when 👍 is selected.

**Rationale**: Matches FR-004 (comment is optional). Separating the 👎 click from the comment submission prevents forcing users to type before the rating is recorded.

**Alternatives considered**:
- Modal dialog for comment → rejected: disruptive UX.
- Auto-submit negative rating after delay → rejected: no opportunity to add comment.
