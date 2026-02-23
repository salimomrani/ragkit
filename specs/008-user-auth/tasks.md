# Tasks: User Authentication (username/password)

**Input**: Design documents from `/specs/008-user-auth/`
**Prerequisites**: plan.md ✓ spec.md ✓ research.md ✓ data-model.md ✓ contracts/ ✓ quickstart.md ✓

**TDD**: Mandatory (project iron law — RED → GREEN → REFACTOR). Test tasks precede all implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1 = Login, US2 = Protected Routes, US3 = Logout)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, configuration, and env vars — required before any story begins.

- [x] T001 Add `pyjwt>=2.9.0` to `backend/requirements.txt`; install with `.venv/bin/pip install "pyjwt>=2.9.0"`
- [x] T002 [P] Add 5 auth settings to `backend/core/config.py`: `jwt_secret_key` (str, required), `jwt_algorithm` (str, default "HS256"), `jwt_expire_hours` (int, default 8), `demo_username` (str, default "admin"), `demo_password_hash` (str, required)
- [x] T003 [P] Add `"Authorization"` to `allow_headers` list in CORS middleware in `backend/main.py`
- [x] T004 [P] Create `backend/.env.example` (if missing) or add entries: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_HOURS`, `DEMO_USERNAME`, `DEMO_PASSWORD_HASH` with placeholder values
- [x] T005 [P] Add auth scope deviation entry to `DECISIONS.md`: "Authentication added (was Out of Scope in constitution) — explicit product requirement, all 5 Core Principles respected"

**Checkpoint**: Requirements installed, settings declared, CORS headers updated.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend auth module core — required before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Create `backend/auth/__init__.py` (empty file to declare auth as a Python package)
- [x] T007 [P] Write **RED** tests for AuthService functions in `backend/tests/test_auth.py`: `test_verify_password_correct`, `test_verify_password_wrong`, `test_create_token_contains_sub`, `test_decode_token_valid`, `test_decode_token_expired`, `test_decode_token_invalid` — confirm all 6 tests FAIL before implementation
- [x] T008 Implement `backend/auth/service.py`: `verify_password(plain: str, hashed: str) -> bool` (bcrypt.checkpw), `create_token(username: str) -> str` (jwt.encode HS256, exp from settings), `decode_token(token: str) -> str` (jwt.decode, raises HTTPException 401 on invalid/expired) — TDD GREEN for T007
- [x] T009 Write **RED** tests for `get_current_user` dependency in `backend/tests/test_auth.py`: `test_get_current_user_valid_token`, `test_get_current_user_missing_token`, `test_get_current_user_expired_token` — confirm tests FAIL
- [x] T010 Implement `backend/auth/dependencies.py`: `get_current_user` FastAPI dependency using `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` + `decode_token()` from service.py — TDD GREEN for T009

**Checkpoint**: Auth service + dependency functional. Existing API still unprotected (intentional — protection applied in US2).

---

## Phase 3: User Story 1 — User Login (Priority: P1) 🎯 MVP

**Goal**: User submits credentials on `/login`, receives JWT, and is redirected to `/chat`.

**Independent Test**: Navigate to `http://localhost:4200` → see login page. Submit `admin/changeme` → redirected to `/chat`. Submit wrong password → error message shown.

### Backend — Login Endpoint (RED → GREEN → REFACTOR)

- [x] T011 [US1] Write **RED** tests for login endpoint in `backend/tests/test_auth.py`: `test_login_success_returns_token`, `test_login_wrong_password_returns_401`, `test_login_unknown_user_returns_401`, `test_auth_me_returns_username` — confirm tests FAIL
- [x] T012 [US1] Implement `backend/auth/router.py`: `POST /auth/login` (JSON `{username, password}` → `{access_token, token_type: "bearer"}`), `GET /auth/me` (returns `{username}`) — TDD GREEN for T011
- [x] T013 [US1] Update `backend/api/__init__.py`: include `auth_router` (no auth dependency); add `dependencies=[Depends(get_current_user)]` to all 4 existing routers (query, ingest, logs, evaluation)

### Frontend — AuthService + Login Component (RED → GREEN → REFACTOR)

- [x] T014 [P] [US1] Write **RED** tests for AuthService in `frontend/src/app/services/auth.service.spec.ts`: `should initialize from localStorage`, `should set isAuthenticated on login`, `should persist token to localStorage`, `should clear token on logout` — confirm tests FAIL
- [x] T015 [US1] Implement `frontend/src/app/services/auth.service.ts`: signals `isAuthenticated = signal(false)`, `token = signal<string|null>(null)`; constructor restores from localStorage; `login(username, password)` calls `POST /api/v1/auth/login`; `logout()` clears signals; `effect()` syncs token to/from localStorage — TDD GREEN for T014
- [x] T016 [P] [US1] Write **RED** tests for Login component in `frontend/src/app/components/login/login.spec.ts`: `should render username and password fields`, `should show error on invalid credentials`, `should call authService.login on submit`, `should navigate to /chat on success` — confirm tests FAIL
- [x] T017 [US1] Implement `frontend/src/app/components/login/login.ts`: standalone, `ChangeDetectionStrategy.OnPush`, inject `AuthService` + `Router`; signals: `username`, `password`, `isLoading`, `error`; `onSubmit()` calls `authService.login()` then navigates to stored `redirectUrl` or `/chat` — TDD GREEN for T016
- [x] T018 [US1] Create `frontend/src/app/components/login/login.html`: centered `p-card` with `p-floatLabel` + `pInputText` for username/password, `p-button` (submit, `[loading]="isLoading()"`), `p-message` for errors (`@if (error())`)
- [x] T019 [US1] Create `frontend/src/app/components/login/login.scss`: full-height centered flex container (`.login-wrapper { display: flex; align-items: center; justify-content: center; height: 100vh; }`)
- [x] T020 [US1] Add `/login` route (lazy-loaded) to `frontend/src/app/app.routes.ts` as first route; keep `{ path: '', redirectTo: 'chat', pathMatch: 'full' }`

**Checkpoint**: `POST /api/v1/auth/login` works end-to-end. Angular login page functional. Run: `pytest tests/test_auth.py -v` + `npm test -- --watch=false`.

---

## Phase 4: User Story 2 — Protected Routes (Priority: P2)

**Goal**: Unauthenticated users are redirected from any route to `/login`; API returns 401 without token.

**Independent Test**: Without a token, `curl http://localhost:8000/api/v1/logs` returns 401. Navigate to `http://localhost:4200/chat` without login → redirected to `/login`.

### Backend — Route Protection Verification

- [x] T021 [US2] Write **RED** integration tests in `backend/tests/test_auth.py`: `test_query_without_token_returns_401`, `test_logs_without_token_returns_401`, `test_documents_without_token_returns_401`, `test_query_with_valid_token_returns_200` — these test that T013 wired up correctly; confirm FAIL before T013 was done (if not already done), then GREEN

### Frontend — Guard + Interceptor (RED → GREEN → REFACTOR)

- [x] T022 [P] [US2] Write **RED** tests for authGuard in `frontend/src/app/guards/auth.guard.spec.ts`: `should allow navigation when authenticated`, `should redirect to /login when not authenticated`, `should store redirectUrl in sessionStorage` — confirm FAIL
- [x] T023 [P] [US2] Write **RED** tests for authInterceptor in `frontend/src/app/interceptors/auth.interceptor.spec.ts`: `should add Authorization header when token present`, `should not add header when no token`, `should logout and redirect on 401 response` — confirm FAIL
- [x] T024 [US2] Implement `frontend/src/app/guards/auth.guard.ts`: `export const authGuard: CanActivateFn` — inject `AuthService` + `Router`; if `isAuthenticated()` return true; else store `state.url` in `sessionStorage` as `redirectUrl`, navigate to `/login`, return false — TDD GREEN for T022
- [x] T025 [US2] Implement `frontend/src/app/interceptors/auth.interceptor.ts`: `export const authInterceptor: HttpInterceptorFn` — inject `AuthService` + `Router`; if `token()` exists, clone request with `Authorization: Bearer <token>`; `catchError` on 401 → call `authService.logout()` + navigate to `/login` — TDD GREEN for T023
- [x] T026 [US2] Update `frontend/src/app/app.config.ts`: change `provideHttpClient()` to `provideHttpClient(withInterceptors([authInterceptor]))`; add `withInterceptors` import from `@angular/common/http`
- [x] T027 [US2] Update `frontend/src/app/app.routes.ts`: add `canActivate: [authGuard]` to chat, ingest, logs, and eval routes
- [x] T028 [US2] Update `frontend/src/app/services/rag-api.service.ts`: inject `AuthService`; in `streamQuery()` fetch call, add `Authorization: Bearer ${this.authService.token()}` to the `headers` object (native fetch is not intercepted by Angular)

**Checkpoint**: All 4 protected Angular routes redirect unauthenticated users. All API endpoints return 401 without token. Run: `pytest tests/test_auth.py -v` + `npm test -- --watch=false`.

---

## Phase 5: User Story 3 — Logout (Priority: P3)

**Goal**: Authenticated user clicks logout → session cleared → redirected to `/login`.

**Independent Test**: Login, click logout button in navbar → redirected to `/login`. Press back → still on `/login` (guard blocks access).

- [x] T029 [US3] Write **RED** tests for logout in `frontend/src/app/app.spec.ts`: `should show logout button when authenticated`, `should call authService.logout on button click`, `should navigate to /login after logout` — confirm FAIL
- [x] T030 [US3] Update `frontend/src/app/app.ts`: inject `AuthService` + `Router`; expose `isAuthenticated = this.authService.isAuthenticated`; add `logout()` method: `this.authService.logout(); this.router.navigate(['/login'])` — TDD GREEN for T029
- [x] T031 [US3] Update `frontend/src/app/app.html`: add `@if (isAuthenticated())` block in `.nav-links` showing a logout button (`<button (click)="logout()" class="logout-btn">Logout</button>`) after nav links

**Checkpoint**: Logout button appears only when authenticated. Clicking it clears session and redirects to `/login`.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T032 [P] Run full backend test suite: `cd backend && .venv/bin/pytest tests/ -v` — all 40+ existing tests + new auth tests must pass; fix any failures
- [x] T033 [P] Run backend lint: `cd backend && .venv/bin/ruff check .` — fix all violations before commit
- [x] T034 [P] Run frontend tests: `cd frontend && npm test -- --watch=false` — all tests must pass; fix any failures
- [x] T035 [P] Run frontend lint: `cd frontend && npm run lint` — fix all violations before commit
- [x] T036 Update `DECISIONS.md` with final wording for auth scope deviation (if not done in T005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 — **blocks all user stories**
- **Phase 3 (US1)**: Requires Phase 2 — backend and frontend tracks can run in parallel within this phase
- **Phase 4 (US2)**: Requires Phase 2; depends on T013 (router wiring) and T015 (AuthService) from Phase 3
- **Phase 5 (US3)**: Requires T015 (AuthService) from Phase 3
- **Phase 6 (Polish)**: Requires all prior phases

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|-----------|-----------------|
| US1 (Login) | Phase 2 complete | T010 done |
| US2 (Protected Routes) | T013 (backend wiring) + T015 (AuthService) + T024-T025 (guard/interceptor) | T015 done |
| US3 (Logout) | T015 (AuthService) | T015 done |

### Within Each Phase

1. **TDD**: Write test (RED) → confirm FAIL → implement (GREEN) → refactor
2. **Backend** T007 → T008 → T009 → T010 (sequential: each depends on previous)
3. **Phase 3 backend** (T011-T013) and **Phase 3 frontend** (T014-T020) can proceed in parallel
4. **Phase 4 tests** T022 and T023 can run in parallel; T024 and T025 can run in parallel
5. **Phase 6** T032-T035 can all run in parallel

---

## Parallel Example: Phase 3 (US1)

```text
# Once Phase 2 is complete, launch both tracks simultaneously:

Track A — Backend:
  T011: Write RED tests for login endpoint
  T012: Implement auth/router.py
  T013: Wire auth into api/__init__.py

Track B — Frontend:
  T014: Write RED tests for AuthService
  T015: Implement auth.service.ts
  T016: Write RED tests for Login component
  T017-T020: Implement Login component + route
```

## Parallel Example: Phase 4 (US2)

```text
# Run test writing in parallel:
  T022: Write RED tests for authGuard
  T023: Write RED tests for authInterceptor

# Then implement in parallel:
  T024: Implement auth.guard.ts
  T025: Implement auth.interceptor.ts

# Then wire (sequential — both T024+T025 must be done):
  T026: Update app.config.ts
  T027: Update app.routes.ts
  T028: Patch rag-api.service.ts streamQuery
```

---

## Implementation Strategy

### MVP (User Story 1 only — minimum for demo)

1. Complete **Phase 1** (Setup)
2. Complete **Phase 2** (Foundational)
3. Complete **Phase 3** (US1 — Login)
4. **STOP and VALIDATE**: Login form works, token returned, `/chat` accessible after login
5. Ship as MVP

### Full Delivery (all 3 stories)

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
2. Each phase = independently testable checkpoint
3. Demo-ready after Phase 3; security-complete after Phase 4

---

## Summary

| Phase | Tasks | Story | Parallel? |
|-------|-------|-------|-----------|
| Setup | T001-T005 | — | T002-T005 |
| Foundational | T006-T010 | — | T007 |
| US1 Login | T011-T020 | US1 | T014, T016 (vs backend track) |
| US2 Protected | T021-T028 | US2 | T022-T023, T024-T025 |
| US3 Logout | T029-T031 | US3 | — |
| Polish | T032-T036 | — | T032-T035 |
| **Total** | **36** | | |
