# API Contract: Feedback

Base URL: `http://localhost:8000/api/v1`

---

## POST /feedback

Submit or update feedback for a query log entry. Upsert semantics — if feedback already exists for `log_id`, it is updated.

### Request

```http
POST /api/v1/feedback
Content-Type: application/json
```

```json
{
  "log_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "is_positive": false,
  "comment": "La réponse ne mentionne pas les tarifs."
}
```

| Field         | Type    | Required | Constraints           |
|---------------|---------|----------|-----------------------|
| `log_id`      | string  | ✅       | Valid UUID, must exist in query_logs |
| `is_positive` | boolean | ✅       | true = 👍, false = 👎  |
| `comment`     | string  | ❌       | Max 500 chars; null if omitted |

### Response — 200 OK (created or updated)

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "log_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "is_positive": false,
  "comment": "La réponse ne mentionne pas les tarifs.",
  "created_at": "2026-03-02T10:00:00Z",
  "updated_at": "2026-03-02T10:00:00Z"
}
```

### Error Responses

| Status | Condition                            | Body example                                      |
|--------|--------------------------------------|---------------------------------------------------|
| 404    | `log_id` not found in query_logs     | `{"detail": "Query log not found"}`               |
| 422    | `comment` exceeds 500 chars          | `{"detail": "Comment must not exceed 500 characters"}` |
| 422    | Missing required field               | Standard FastAPI validation error                 |

---

## GET /logs (extended)

Existing endpoint extended to include embedded feedback per log entry. No breaking change — `feedback` field added, all existing fields preserved.

### Response — 200 OK

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp": "2026-03-02T09:55:00Z",
    "question_masked": "Quels sont les produits ?",
    "retrieved_sources": ["doc-1", "doc-2"],
    "similarity_scores": [0.91, 0.87],
    "answer": "Palo IT propose...",
    "faithfulness_score": 0.95,
    "latency_ms": 1240,
    "guardrail_triggered": null,
    "rejected": false,
    "rejection_reason": null,
    "feedback": {
      "is_positive": false,
      "comment": "La réponse ne mentionne pas les tarifs.",
      "updated_at": "2026-03-02T10:00:00Z"
    }
  },
  {
    "id": "...",
    ...
    "feedback": null
  }
]
```

The `feedback` field is `null` when no feedback has been submitted for that entry.
