# Skill: Python Conventions — PALO Project

## General

- Python 3.12, type hints everywhere
- Pydantic v2 for all schemas (no dataclasses for API models)
- Env vars via `.env` + `pydantic-settings` (`core/config.py`)
- Never use bare `python` — always `.venv/bin/python` or `.venv/bin/pytest`

## Linting

- `ruff` — config in `backend/ruff.toml`
- Rules: E, F, I (errors, pyflakes, isort)
- Run: `cd backend && .venv/bin/ruff check .` (fallback: `ruff check .` if `ruff` is not installed in `.venv`)

## Testing

- `pytest` + `pytest-asyncio`
- Run: `cd backend && .venv/bin/pytest tests/ -v`
- Mocks: Ollama calls should be mocked in unit tests / CI (Ollama not available in CI)
- DB: SQLite in-memory for unit tests; PostgreSQL service for integration

## Architecture modules

- `core/` — config, DB session
- `guardrails/input.py` — input validation (empty → min_len → max_len → injection → offensive)
- `rag/pipeline.py` — RAG chain (embed → retrieve → generate)
- `api/` — FastAPI routers
- `rag/provider.py` — AIProvider interface + provider selection (swappable: Ollama, future: OpenAI)

## Key constraints

- No answer hallucination — `no_info_message` if score < threshold
- PII masking on `question_masked` field only (not on `answer`)
- All deviations from spec → document in `DECISIONS.md`
