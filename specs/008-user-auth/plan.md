# Implementation Plan: User Authentication (username/password)

**Branch**: `008-user-auth` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-user-auth/spec.md`

## Summary

Add username/password authentication to PALO RAG using JWT Bearer tokens. The backend exposes a `POST /api/v1/auth/login` endpoint that validates credentials (bcrypt) and returns a signed JWT. All existing API endpoints require a valid Bearer token (401 otherwise). The Angular frontend gains a `/login` page, an `AuthService` (signals + localStorage), a functional route guard, and a functional HTTP interceptor that injects the token and handles 401s.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.9 / Angular 21 (frontend)
**Primary Dependencies**: FastAPI 0.115, PyJWT (new), bcrypt 5.0.0 (existing transitive dep); Angular 21, PrimeNG v21
**Storage**: No new storage — credentials in env vars, tokens are stateless JWT
**Testing**: pytest (backend), Jest/Karma (frontend)
**Target Platform**: Local dev (macOS), served on localhost:8000 / localhost:4200
**Project Type**: Web application (backend/ + frontend/)
**Performance Goals**: Login response < 500ms (bcrypt rounds=12 ~100ms)
**Constraints**: No cloud calls, no session store, single demo user for MVP
**Scale/Scope**: Single admin user for demo; architecture scales to multi-user without refactoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First & Privacy | PASS | JWT generated/validated locally; no data leaves machine |
| II. Traceability | PASS | Login events are explicitly handled; existing query traceability unaffected |
| III. Fail Transparently | PASS | 401 on invalid/missing token; no silent fallback |
| IV. Separation of Concerns | PASS | `auth/` is a standalone module; existing RAG modules untouched |
| V. Demo-Ready Reproducibility | PASS | Env vars + quickstart.md; demo runs in <5 min |

**Scope deviation**: Authentication was listed as "Out of Scope" in the constitution. This extension is **justified** (explicit product decision) and will be documented in `DECISIONS.md`.

## Project Structure

### Documentation (this feature)

```text
specs/008-user-auth/
├── plan.md              <- this file
├── research.md          <- Phase 0 output
├── data-model.md        <- Phase 1 output
├── quickstart.md        <- Phase 1 output
├── contracts/
│   └── auth-api.yaml    <- Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             <- Phase 2 output (/speckit.tasks)
```

### Source Code

```text
backend/
├── auth/
│   ├── __init__.py           # NEW — empty
│   ├── service.py            # NEW — verify_password, create_token, decode_token
│   ├── router.py             # NEW — POST /auth/login, GET /auth/me
│   └── dependencies.py       # NEW — get_current_user FastAPI dependency
├── core/
│   └── config.py             # MODIFIED — add jwt_secret_key, jwt_algorithm,
│                             #            jwt_expire_hours, demo_username, demo_password_hash
├── api/
│   └── __init__.py           # MODIFIED — include auth_router, protect existing routers
├── main.py                   # MODIFIED — add Authorization to CORS allow_headers
├── requirements.txt          # MODIFIED — add pyjwt>=2.9.0
└── tests/
    └── test_auth.py          # NEW — unit + integration tests for auth

frontend/src/app/
├── guards/
│   └── auth.guard.ts         # NEW — CanActivateFn
├── interceptors/
│   └── auth.interceptor.ts   # NEW — HttpInterceptorFn (Bearer + 401 handling)
├── services/
│   └── auth.service.ts       # NEW — signals: isAuthenticated, token; login/logout
├── components/
│   └── login/
│       ├── login.ts          # NEW — Standalone, OnPush, PrimeNG
│       ├── login.html        # NEW
│       └── login.scss        # NEW
├── app.routes.ts             # MODIFIED — add /login; canActivate on all routes
├── app.config.ts             # MODIFIED — withInterceptors([authInterceptor])
├── app.ts                    # MODIFIED — inject AuthService, add logout
├── app.html                  # MODIFIED — add logout button to nav
└── services/
    └── rag-api.service.ts    # MODIFIED — inject AuthService, add Bearer to fetch()
```

**Structure Decision**: Web application layout (backend/ + frontend/). Auth module added as a peer of existing modules (`rag/`, `guardrails/`) following the established separation of concerns pattern.

---

## Phase 0: Research (complete)

See [research.md](./research.md)

Key decisions:
1. **PyJWT** over python-jose (python-jose abandoned)
2. **bcrypt direct** over passlib (passlib deprecated; bcrypt 5.0.0 already installed)
3. **JSON login endpoint** over OAuth2 form (Angular sends JSON natively)
4. **Env var credentials** — no DB table for demo (scales to DB without refactoring)
5. **Router-level dependency** for protecting existing routes (clean, no per-endpoint changes)
6. **Manual fetch() patching** for streamQuery SSE (interceptor does not cover native fetch)

---

## Phase 1: Design

See [data-model.md](./data-model.md) | [contracts/auth-api.yaml](./contracts/auth-api.yaml)

### Backend call flow

```
POST /api/v1/auth/login
  └── AuthRouter
      └── AuthService.verify_password(username, password)  <- bcrypt.checkpw
          └── Settings.demo_username / Settings.demo_password_hash
      └── AuthService.create_token(username)               <- jwt.encode(HS256)
      └── -> {access_token, token_type: "bearer"}

All protected routes
  └── Depends(get_current_user)
      └── AuthService.decode_token(token)                  <- jwt.decode
          └── 401 on expired / invalid / missing
```

### Frontend call flow

```
App boot
  └── AuthService init: read localStorage -> set signals

Route navigation
  └── authGuard (CanActivateFn)
      └── authService.isAuthenticated()? -> proceed : navigate('/login')

HTTP request (HttpClient)
  └── authInterceptor (HttpInterceptorFn)
      └── clone req + Authorization: Bearer <token>
      └── catchError 401 -> authService.logout() + navigate('/login')

Native fetch (streamQuery only)
  └── rag-api.service.ts
      └── inject AuthService -> read token() -> add header manually

Login form submit
  └── authService.login(username, password)
      └── POST /api/v1/auth/login
      └── token.set(res.access_token) + isAuthenticated.set(true)
      └── localStorage sync via effect()
      └── navigate(redirectUrl || '/chat')

Logout (nav bar)
  └── authService.logout()
      └── token.set(null) + isAuthenticated.set(false)
      └── localStorage cleared via effect()
      └── navigate('/login')
```

### Constitution Check Post-Design

Re-evaluated after design — all 5 principles pass (same as pre-design check). The auth module is fully local, transparent on failure, and isolated from RAG/guardrail logic.

---

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Auth was out of scope per constitution | Explicit product requirement | Deliberate scope extension, not an accidental violation |
| Manual fetch() patching in rag-api.service | SSE requires native fetch; HttpClient interceptors don't apply | Rewriting streamQuery with EventSource/HttpClient would break SSE streaming |
