# Data Model: Response Feedback

## New Entity: ResponseFeedback

**Table**: `response_feedback`

| Field         | Type        | Constraints                          | Description                              |
|---------------|-------------|--------------------------------------|------------------------------------------|
| `id`          | String(UUID)| PK, default uuid4                    | Unique identifier                        |
| `log_id`      | String      | FK → query_logs.id, UNIQUE, NOT NULL | One-to-one link to the rated query       |
| `is_positive` | Boolean     | NOT NULL                             | True = 👍, False = 👎                    |
| `comment`     | Text        | Nullable, max 500 chars              | Optional user comment (negative only)    |
| `created_at`  | DateTime    | NOT NULL, default now(UTC)           | When the feedback was first submitted    |
| `updated_at`  | DateTime    | NOT NULL, default now(UTC)           | When the feedback was last changed       |

**Uniqueness**: `log_id` is UNIQUE — enforces one feedback record per query (upsert pattern).

**Relationship**: `ResponseFeedback.log_id` → `QueryLog.id` (many-to-one from DB perspective, effectively one-to-one due to UNIQUE constraint).

---

## Modified Entity: QueryLog (read-only extension)

No schema changes to `query_logs`. The existing table is joined at query time to attach feedback data to log responses.

**API response shape** (extended `LogEntry`):

```
feedback: {
  is_positive: boolean,
  comment: string | null,
  updated_at: string (ISO 8601)
} | null
```

`null` means no feedback has been submitted for that log entry.

---

## State Transitions

```
[No Feedback]
     │
     ├─ User clicks 👍 → POST /feedback {log_id, is_positive: true}
     │        └─→ [Positive Feedback]
     │
     └─ User clicks 👎 → POST /feedback {log_id, is_positive: false, comment?}
              └─→ [Negative Feedback]

[Positive Feedback]
     └─ User clicks 👎 → POST /feedback (upsert) → [Negative Feedback]

[Negative Feedback]
     └─ User clicks 👍 → POST /feedback (upsert) → [Positive Feedback]
```

Upsert is idempotent: clicking the same rating again is a no-op in the DB (updates `updated_at` only).

---

## Validation Rules

- `log_id` must reference an existing `QueryLog.id` (FK constraint + 404 on missing)
- `comment` max length: 500 characters (validated at API layer, rejected with 422)
- `comment` on positive feedback: accepted but ignored in UI (stored if sent)
