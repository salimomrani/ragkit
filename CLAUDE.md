# PALO RAG — Project Instructions

## Stack

- **Backend**: Python 3.12, FastAPI, LangChain 0.3, ChromaDB (embedded), SQLAlchemy 2, PostgreSQL 16
- **AI**: Ollama local (`qwen2.5:7b` + `mxbai-embed-large`) — `AIProvider` interface swappable
- **Frontend**: Angular 21, PrimeNG v21

## Workflow (mandatory)

- **Feature or large change** → use `/speckit.workflow` (see `.claude/commands/speckit.workflow.md`)
- **Frontend work** → see `.claude/skills/angular-conventions.md`
- **Python/backend** → see `.claude/skills/python-conventions.md`
- **Small fix** (typo, label, 1-2 lines) → direct edit, no spec

### Workflow routing (auto)

When my instruction indicates a **feature / composant / module / workflow complet / implémentation non triviale**, Claude should automatically route to `/speckit.workflow` first, then follow the speckit + superpowers pipeline.

If I explicitly indicate a **small fix** (typo, wording, label, 1-2 lignes, doc-only), Claude should skip `/speckit.workflow` and edit directly.

## TDD (mandatory)

**Iron law: no production code without a failing test first.** RED → GREEN → REFACTOR

- Backend: `cd backend && .venv/bin/pytest tests/ -v`
- Backend lint: `cd backend && .venv/bin/ruff check .`
- Frontend: `cd frontend && npm test -- --watch=false`
- Frontend lint: `cd frontend && npm run lint`
- Lint must pass before any commit
- Skill: `superpowers:test-driven-development`

## Git

- Never push directly to `master` — always open a PR
- Tests must pass before any commit
- Update `specs/<feature>/tasks.md` after each task

## Architecture (read `.specify/memory/constitution.md` before any architectural decision)

1. Local-first — Ollama only, no data leaves the machine
2. Traceability — every query logged (PII-masked)
3. Transparent failure — no hallucinated answers
4. Separation of concerns — RAG / guardrails / eval = independent modules

## Environment

- Backend needs `backend/.env` — copy from `backend/.env.example` if missing
- DB: `docker-compose up -d` (PostgreSQL 16, port 5444)
- Ports: 8000 (backend), 4200 (frontend)

## Source of Truth

- **Code > plan.md > tasks.md** — code wins on divergence
- Deviations from spec → document in `DECISIONS.md`
- Context7 for library docs (FastAPI, LangChain, Angular, SQLAlchemy, ChromaDB)
