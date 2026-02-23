# Data Model: User Authentication (008-user-auth)

**Date**: 2026-02-23

---

## Entities

### User (demo — env-based, no DB table)

For this demo, a single user is stored in application settings (env vars). No migration required.

| Field             | Type   | Constraints                | Notes                            |
|-------------------|--------|----------------------------|----------------------------------|
| `username`        | string | unique, non-empty          | Loaded from `DEMO_USERNAME` env  |
| `password_hash`   | string | bcrypt hash                | Loaded from `DEMO_PASSWORD_HASH` |
| `is_active`       | bool   | default `true`             | Always true for demo user        |

> **Scaling path**: When multi-user is needed, introduce a `users` SQLAlchemy table using the existing `Base` and `get_engine()` infrastructure — no architectural change required.

---

### JWT Token (stateless, no DB storage)

Tokens are self-contained and validated on each request. No server-side session store needed.

| Claim  | Value                        | Notes                              |
|--------|------------------------------|------------------------------------|
| `sub`  | `username` (string)          | Subject — identifies the user      |
| `exp`  | `iat + JWT_EXPIRE_HOURS`     | Expiration timestamp (UTC epoch)   |
| `iat`  | current UTC timestamp        | Issued-at timestamp                |

Algorithm: **HS256** | Secret: `JWT_SECRET_KEY` (env var)

---

## New Settings (added to `core/config.py`)

| Setting               | Env Var               | Default             | Notes                              |
|-----------------------|-----------------------|---------------------|------------------------------------|
| `jwt_secret_key`      | `JWT_SECRET_KEY`      | (required)          | Strong random string, min 32 chars |
| `jwt_algorithm`       | `JWT_ALGORITHM`       | `"HS256"`           | Symmetric signing algorithm        |
| `jwt_expire_hours`    | `JWT_EXPIRE_HOURS`    | `8`                 | Token lifetime in hours            |
| `demo_username`       | `DEMO_USERNAME`       | `"admin"`           | Demo login username                |
| `demo_password_hash`  | `DEMO_PASSWORD_HASH`  | (required)          | bcrypt hash of demo password       |

---

## New Backend Files

```
backend/
└── auth/
    ├── __init__.py        # empty
    ├── service.py         # verify_password(), create_token(), decode_token()
    ├── router.py          # POST /auth/login
    └── dependencies.py    # get_current_user FastAPI dependency
```

---

## Modified Backend Files

| File                      | Change                                                      |
|---------------------------|-------------------------------------------------------------|
| `requirements.txt`        | Add `pyjwt>=2.9.0`                                          |
| `core/config.py`          | Add 5 new settings (jwt_secret_key, etc.)                   |
| `api/__init__.py`         | Include auth_router; add `get_current_user` dependency to existing routers |
| `main.py`                 | Add `Authorization` to CORS `allow_headers`                 |

---

## New Frontend Files

```
frontend/src/app/
├── guards/
│   └── auth.guard.ts          # CanActivateFn — redirect to /login if not authenticated
├── interceptors/
│   └── auth.interceptor.ts    # HttpInterceptorFn — inject Bearer, handle 401
├── services/
│   └── auth.service.ts        # Signals: isAuthenticated, token; login/logout
└── components/
    └── login/
        ├── login.ts           # Standalone, OnPush, PrimeNG
        ├── login.html
        └── login.scss
```

---

## Modified Frontend Files

| File                              | Change                                                       |
|-----------------------------------|--------------------------------------------------------------|
| `app.routes.ts`                   | Add `/login` route; add `canActivate: [authGuard]` to all routes |
| `app.config.ts`                   | Add `withInterceptors([authInterceptor])`                    |
| `app.ts` / `app.html`             | Add logout button + import AuthService                       |
| `services/rag-api.service.ts`     | Inject AuthService; add Bearer header to `fetch()` in `streamQuery` |
