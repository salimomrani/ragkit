---
description: Backend conventions for FastAPI/Python modules
globs:
  - "backend/**/*.py"
---

# Backend Rules

- Always use `backend/.venv/bin/python` — never bare `python` (Anaconda conflict).
- Tests: `cd backend && .venv/bin/pytest tests/ -v`
- Lint: `cd backend && .venv/bin/ruff check .`
- Run dev: `cd backend && .venv/bin/uvicorn main:app --reload --port 8000`
- If `backend/.env` is missing, copy from `backend/.env.example`.
- AIProvider protocol in `backend/rag/provider.py` — never bypass the abstraction.
- PII masking is mandatory before any log write or DB insert.
