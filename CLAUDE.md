# PALO RAG — Core Rules

## Workflow Routing (mandatory)

- **Feature / non-trivial change** → use `/speckit.workflow`
- **Small fix** (typo, wording, label, 1-2 lines, docs-only, or explicitly called a small fix) → direct edit, no spec
- **Frontend implementation conventions** → `~/.claude/skills/angular-conventions.md`
- **Python/backend conventions** → `~/.claude/skills/python-conventions.md`

## TDD (mandatory)

**Iron law: no production code without a failing test first.** RED → GREEN → REFACTOR

- Use `superpowers:test-driven-development` for features/bugfixes.
- Tests and lint must pass before any commit.
- Use the stack-specific commands from the repo and skill files (`angular-conventions.md`, `python-conventions.md`).

## Git

- Even if explicitly asked to "push", do not push to `master`; create/use a branch and open/update a PR instead
- Update `specs/<feature>/tasks.md` after each completed task during Speckit execution

## Architecture Constraints

Read `.specify/memory/constitution.md` before any architectural decision.

1. Local-first — Ollama only, no data leaves the machine
2. Traceability — every query logged (PII-masked)
3. Transparent failure — no hallucinated answers
4. Separation of concerns — RAG / guardrails / eval = independent modules

## Environment

- Backend needs `backend/.env` — copy from `backend/.env.example` if missing
- DB: `docker-compose up -d` (PostgreSQL 16, port 5444)
- Ports: 8000 (backend), 4200 (frontend)

## Run / Dev Commands

- Backend (dev): `cd backend && .venv/bin/uvicorn main:app --reload --port 8000`
- Frontend (dev): `cd frontend && npm start`
- Backend health check: `curl http://127.0.0.1:8000/health`

## Source of Truth

- **Code > plan.md > tasks.md** — code wins on divergence
- Deviations from spec → document in `DECISIONS.md`

