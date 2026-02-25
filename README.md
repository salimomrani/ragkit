# PALO RAG — Enterprise Knowledge Assistant

[![CI](https://github.com/salimomrani/palo-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/salimomrani/palo-rag/actions/workflows/ci.yml)

RAG API + Angular UI for enterprise knowledge bases — answers questions from internal documents, refuses when confidence is too low.

**Stack**: Python 3.12 · FastAPI · LangChain 0.3 · ChromaDB · PostgreSQL 16 · Ollama · Angular 21

---

## Overview

This project demonstrates a production-minded RAG assistant built around three engineering constraints: **hallucination control**, **traceability**, and **answer quality evaluation**.

The assistant is intentionally constrained — it only answers using retrieved documents. If the information is absent from the corpus, it refuses rather than hallucinating. Reliability over creativity.

---

## Architecture

```
┌─────────────────────────────┐
│          Angular UI         │
│  Chat · Ingest · Logs · Eval│
└─────────────┬───────────────┘
              │  HTTP / SSE
              ▼
┌─────────────────────────────┐
│      FastAPI  /api/v1       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐          ┌────────────┐
│         Guardrails          │ ── ✗ ──▶ │  rejected  │
└─────────────┬───────────────┘          └────────────┘
              │  ✓
              ▼
┌─────────────────────────────┐
│      Embed  (Ollama)        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│         ChromaDB            │ ──▶  top-k chunks
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│       LLM  (Ollama)         │ ──▶  answer
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│        PostgreSQL           │  (audit log)
└─────────────────────────────┘
```

---

## How It Works

### 1. Ingestion
- Upload a `.md` file via the UI or API (`/ingest`)
- Backend splits text into chunks (500 chars, overlap 50)
- Chunks are embedded via Ollama and stored in ChromaDB
- Document metadata is persisted in PostgreSQL

### 2. Query (RAG)
- User submits a question (`/query` or `/query/stream`)
- Guardrails validate input: length, injection patterns, offensive content
- Top-4 chunks retrieved from ChromaDB by semantic similarity
- If retrieval score < `MIN_RETRIEVAL_SCORE` (default `0.3`), the system refuses
- Otherwise, Ollama generates the answer grounded in retrieved context

### 3. Traceability
- Every query is logged in PostgreSQL: masked question, retrieved sources, confidence score, latency, guardrail status
- Evaluation suite available at `/evaluation/run`

---

## Prerequisites

- [Ollama](https://ollama.ai) running locally
- Docker (for PostgreSQL)
- Python 3.12, Node.js 22

```bash
# Pull required models once
ollama pull qwen2.5:7b
ollama pull mxbai-embed-large
```

---

## Setup (3 steps)

```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Start backend
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # defaults: localhost:5444, palo/palo
.venv/bin/python scripts/ingest_corpus.py   # load 16 corpus docs
.venv/bin/uvicorn main:app --reload --port 8000

# 3. Start frontend (new terminal)
cd frontend
npm install
npm start
```

Open **http://localhost:4200** · API docs: **http://localhost:8000/docs**

### Runtime tuning (`backend/.env`)

```bash
LLM_TEMPERATURE=0.1           # [0.0–2.0]  lower = more deterministic
TOP_K=4                       # [1–20]     chunks retrieved per query
MIN_RETRIEVAL_SCORE=0.3       # [0.0–1.0]  below this = refusal
LOW_CONFIDENCE_THRESHOLD=0.5  # [0.0–1.0]  above MIN but uncertain = flagged
CHUNK_SIZE=500                # [100–2000] chars per chunk at ingestion
CHUNK_OVERLAP=50              # [0–500]    overlap between chunks
GUARDRAIL_MAX_LENGTH=500      # [50–5000]  max question length
DEFAULT_LOGS_LIMIT=100        # [1–1000]   max entries from GET /logs
CORS_ALLOW_ORIGINS=http://localhost:4200
```

---

## API

Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/query` | Ask a question (blocking) |
| `POST` | `/query/stream` | Ask a question (SSE streaming) |
| `POST` | `/ingest` | Ingest a document `{text, name}` |
| `GET` | `/documents` | List ingested documents |
| `DELETE` | `/documents/{id}` | Delete a document |
| `GET` | `/logs` | Audit log of all queries |
| `POST` | `/evaluation/run` | Run quality evaluation |
| `GET` | `/evaluation/report` | Get latest evaluation report |
| `GET` | `/health` | Health check |

### Example

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "PALO IT est une ESN fondée en 2009.", "name": "about.md"}'

curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Quand PALO IT a-t-il été fondé ?"}'
```

Sample log entry (`GET /api/v1/logs`):
```json
{
  "id": "24369911-0190-42bb-8b32-b069b192b3d3",
  "timestamp": "2026-02-20T14:23:33.856095",
  "question_masked": "Que dit smoke.md ?",
  "retrieved_sources": ["faq-onboarding.md", "spec-webhooks.md"],
  "similarity_scores": [0.455, 0.441],
  "answer": "Je n'ai pas d'information sur ce sujet dans la base de connaissance.",
  "faithfulness_score": 0.443,
  "latency_ms": 14263,
  "guardrail_triggered": null,
  "rejected": false
}
```

---

## Tests & Quality

```bash
# Backend tests (TDD — 48 tests)
cd backend && .venv/bin/pytest tests/ -v

# Backend lint (ruff)
cd backend && ruff check .

# Frontend tests (vitest)
cd frontend && npm test

# Frontend lint (ESLint / angular-eslint)
cd frontend && npm run lint
# Expected: 0 errors

# Quality evaluation
curl -X POST http://localhost:8000/api/v1/evaluation/run
# Report saved to reports/eval.md
```

### CI/CD (GitHub Actions)

Push or PR on any branch triggers path-filtered jobs:

| Changed path | Jobs triggered |
|---|---|
| `backend/**` | `backend-lint` (ruff) → `backend-test` (pytest + PostgreSQL) |
| `frontend/**` | `frontend-lint` (ESLint) → `frontend-test` (vitest) |
| Both | All four jobs in parallel |

Lint gates tests: tests only run when lint passes. No deployment.

---

## Security

Implemented:
- Input guardrails (length, prompt-injection patterns, offensive content)
- PII masking in logs (email, phone)
- CORS restricted to configured origins

Out of scope (production):
- Authentication / authorization on management endpoints
- Rate limiting, secrets rotation, data retention policy

---

## Project Structure

```
PALO/
├── .github/workflows/
│   └── ci.yml           # GitHub Actions: path-filtered lint + test jobs
├── backend/
│   ├── api/v1/          # FastAPI routers (query, ingest, logs, evaluation)
│   ├── rag/             # Pipeline, provider (Ollama), ingestion
│   ├── guardrails/      # Input validation
│   ├── logging_service/ # PII masking + audit log
│   ├── quality/         # Reference dataset, runner, report generator
│   ├── models/          # SQLAlchemy models
│   ├── ruff.toml        # Linter config (E/F/I rules, Python 3.12)
│   └── tests/           # 48 tests (TDD)
├── frontend/
│   └── src/app/
│       ├── components/  # Chat, Ingest, Logs, Eval (Angular 21 signals)
│       └── services/    # RagApiService
├── corpus/              # 16 synthetic Markdown knowledge base docs
├── reports/             # eval.md, costs.md
└── docker-compose.yml   # PostgreSQL 16
```

---

## Trade-offs & Decisions

See [DECISIONS.md](DECISIONS.md) — architectural decisions, known limitations, and production roadmap.
