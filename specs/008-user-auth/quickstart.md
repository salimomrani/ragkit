# Quickstart: User Authentication (008-user-auth)

## Prerequisites

- Backend venv active, PostgreSQL running (`docker-compose up -d`)
- Existing stack working (`/health` returns `{"status":"ok"}`)

---

## 1. Install PyJWT

```bash
cd backend
.venv/bin/pip install "pyjwt>=2.9.0"
# Freeze after implementation
.venv/bin/pip freeze | grep pyjwt >> requirements.txt
```

---

## 2. Generate demo password hash

Run once to get the bcrypt hash for your demo password:

```bash
cd backend
.venv/bin/python -c "
import bcrypt
pw = b'changeme'
print(bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12)).decode())
"
```

Copy the output (starts with `$2b$12$...`).

---

## 3. Configure `.env`

Add to `backend/.env`:

```env
# Auth
JWT_SECRET_KEY=<generate-a-32+-char-random-string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=8
DEMO_USERNAME=admin
DEMO_PASSWORD_HASH=<output-from-step-2>
```

Generate a secret key:
```bash
.venv/bin/python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 4. Run backend

```bash
cd backend
.venv/bin/uvicorn main:app --reload --port 8000
```

---

## 5. Test login (curl)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'
# → {"access_token":"eyJ...","token_type":"bearer"}
```

---

## 6. Test protected route

```bash
TOKEN="<paste-token-here>"
curl http://localhost:8000/api/v1/logs \
  -H "Authorization: Bearer $TOKEN"
# → [...] (array of log entries)
```

---

## 7. Test unauthenticated access (should return 401)

```bash
curl http://localhost:8000/api/v1/logs
# → {"detail":"Not authenticated"}
```

---

## 8. Run frontend

```bash
cd frontend
npm start
# Navigate to http://localhost:4200 → redirected to /login
```

Login with `admin` / your configured password → redirected to `/chat`.

---

## 9. Run tests

```bash
cd backend
.venv/bin/pytest tests/ -v
# All existing tests + new test_auth.py must pass
```
