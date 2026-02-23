# Research: User Authentication (008-user-auth)

**Date**: 2026-02-23

---

## Decision 1: JWT Library

**Decision**: Use **PyJWT** (package: `pyjwt`)

**Rationale**: python-jose is largely unmaintained (last significant updates 2018-2020). PyJWT is actively maintained, minimal dependencies, and is the de facto community standard for FastAPI JWT auth in 2025/2026.

**Alternatives considered**: python-jose (rejected: abandoned), authlib (rejected: overkill for demo).

**Action**: Add `pyjwt>=2.9.0` to `requirements.txt`.

---

## Decision 2: Password Hashing

**Decision**: Use **bcrypt directly** (no passlib)

**Rationale**: passlib is deprecated. bcrypt v5.0.0 (already installed as a transitive dep of chromadb) works natively with Python 3.12 and can be used directly with `bcrypt.hashpw` / `bcrypt.checkpw`.

**Alternatives considered**: passlib (rejected: deprecated), argon2 (rejected: not installed, overkill for demo).

---

## Decision 3: Login Endpoint Format

**Decision**: `POST /api/v1/auth/login` with **JSON body** `{username, password}` → `{access_token, token_type: "bearer"}`

**Rationale**: Angular's HttpClient sends JSON natively. FastAPI's `OAuth2PasswordRequestForm` requires `application/x-www-form-urlencoded`, which requires special handling on the Angular side. Using JSON is simpler and consistent with the existing API pattern.

`OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` is set for Swagger UI autodiscovery only.

**Alternatives considered**: OAuth2 form endpoint (rejected: Angular clients don't naturally send form-encoded bodies).

---

## Decision 4: User Credential Storage

**Decision**: **Settings/env vars** for demo — one pre-configured admin user (`DEMO_USERNAME`, `DEMO_PASSWORD_HASH` in `.env`).

**Rationale**: No self-registration is required (per spec). A DB users table adds migration complexity for zero additional demo value. The `Settings` class (pydantic-settings) already reads from `.env` — natural extension.

**Alternatives considered**: SQLAlchemy User table (rejected: unnecessary complexity for demo), hardcoded in code (rejected: inflexible, can't change without code change).

---

## Decision 5: JWT Token Config

**Decision**: HS256 algorithm, 8-hour expiry (configurable), claims: `sub` (username), `exp`, `iat`.

**Rationale**: HS256 is symmetric and sufficient for a local demo. RS256 would require key pair management. 8h expiry aligns with a working day; no refresh tokens (per spec).

**Secret key**: added to `.env` as `JWT_SECRET_KEY` (strong random string).

---

## Decision 6: Route Protection Strategy

**Decision**: Add `Depends(get_current_user)` to **all existing API routers** by passing it as a router-level dependency in `api/__init__.py`. The `/auth/login` and `/health` endpoints remain public.

**Rationale**: Router-level dependency is cleaner than annotating each individual endpoint. Centralizes the auth concern without modifying existing endpoint signatures.

---

## Decision 7: Angular Guard/Interceptor Pattern

**Decision**: Functional `CanActivateFn` guard + `HttpInterceptorFn` interceptor (Angular 21 functional style).

**Rationale**: Class-based guards/interceptors are discouraged in Angular 14+ and removed in Angular 17+. Functional style integrates cleanly with signals.

**Token persistence**: `localStorage` via `effect()` on the token signal.

---

## Decision 8: SSE streamQuery Auth

**Decision**: Pass `Authorization: Bearer <token>` header explicitly in the `fetch()` call inside `streamQuery`, reading the token from `AuthService`.

**Rationale**: Angular's HttpClient interceptor does NOT intercept native `fetch()` calls. `streamQuery` uses `fetch` for SSE support, so it must be manually patched to inject the auth header.

---

## Unresolved / Out of Scope

- Token refresh: out of scope (spec says re-authenticate after expiry)
- Account lockout: out of scope
- Multiple users: single demo admin; extending to full user table requires DB migration (documented in DECISIONS.md)
