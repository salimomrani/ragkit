# Quickstart: Response Feedback

## Prerequisites

- Docker running: `docker-compose up -d` (PostgreSQL on port 5444)
- Backend venv active: `cd backend && .venv/bin/uvicorn main:app --reload --port 8000`
- Frontend running: `cd frontend && npm start`

## Backend changes at a glance

1. **New model** `ResponseFeedback` in `backend/models/db.py`
2. **New router** `backend/api/v1/feedback.py` — `POST /api/v1/feedback`
3. **Extend** `GET /logs` in `backend/api/v1/logs.py` — JOIN feedback
4. **Migration** via SQLAlchemy `create_all` (auto on startup) or Alembic if used

## Frontend changes at a glance

1. **New interface** `FeedbackEntry` + method `submitFeedback()` in `rag-api.service.ts`
2. **Feedback buttons** component embedded in the chat message bubble (after streaming done)
3. **Logs table** — new `Feedback` column displaying 👍 / 👎 / — and comment tooltip

## Running tests

```bash
# Backend unit tests
cd backend && .venv/bin/pytest tests/ -v -k feedback

# Frontend tests
cd frontend && npm test -- --watch=false
```

## Manual smoke test

1. Open `http://localhost:4200`
2. Ask a question, wait for the full answer
3. Click 👎, type "Test comment", click Submit
4. Click 👍 — rating updates, comment disappears
5. Navigate to `/logs` — verify the entry shows 👍

## Key files

| File | Change |
|------|--------|
| `backend/models/db.py` | Add `ResponseFeedback` model |
| `backend/api/v1/feedback.py` | New router: POST /feedback |
| `backend/api/v1/logs.py` | Extend response with feedback JOIN |
| `backend/api/__init__.py` | Register feedback router |
| `frontend/src/app/services/rag-api.service.ts` | Add `FeedbackEntry` interface + `submitFeedback()` |
| `frontend/src/app/components/chat/chat.ts` | Add feedback state + wiring |
| `frontend/src/app/components/chat/chat.html` | Feedback buttons under each message |
| `frontend/src/app/components/logs/logs.ts` | Extend `LogEntry` + feedback column |
| `frontend/src/app/components/logs/logs.html` | Feedback column in table |
