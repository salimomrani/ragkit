"""Tests for auth module (AuthService, dependency, router)."""

import time

import bcrypt
import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from dependencies import get_engine, get_provider, get_vectorstore
from models.db import Base

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

HASHED_PASSWORD = bcrypt.hashpw(b"secret", bcrypt.gensalt()).decode()


# ---------------------------------------------------------------------------
# T007 — AuthService tests (RED before service.py exists)
# ---------------------------------------------------------------------------


def test_verify_password_correct():
    from auth.service import verify_password

    assert verify_password("secret", HASHED_PASSWORD) is True


def test_verify_password_wrong():
    from auth.service import verify_password

    assert verify_password("wrong", HASHED_PASSWORD) is False


def test_create_token_contains_sub():
    from auth.service import create_token

    token = create_token("alice")
    payload = jwt.decode(token, options={"verify_signature": False})
    assert payload["sub"] == "alice"


def test_decode_token_valid():
    from auth.service import create_token, decode_token

    token = create_token("bob")
    username = decode_token(token)
    assert username == "bob"


def test_decode_token_expired():
    from auth.service import decode_token
    from core.config import settings

    expired_payload = {
        "sub": "charlie",
        "exp": int(time.time()) - 10,
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(HTTPException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == 401


def test_decode_token_invalid():
    from auth.service import decode_token

    with pytest.raises(HTTPException) as exc_info:
        decode_token("not.a.valid.token")
    assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# T009 — get_current_user dependency tests (RED before dependencies.py)
# ---------------------------------------------------------------------------


def test_get_current_user_valid_token():
    from auth.dependencies import get_current_user
    from auth.service import create_token

    token = create_token("dave")
    username = get_current_user(token=token)
    assert username == "dave"


def test_get_current_user_missing_token():
    from auth.dependencies import get_current_user

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=None)
    assert exc_info.value.status_code == 401


def test_get_current_user_expired_token():
    from auth.dependencies import get_current_user
    from core.config import settings

    expired_payload = {
        "sub": "eve",
        "exp": int(time.time()) - 10,
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=expired_token)
    assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# Shared fixture for T011 / T021 (router tests)
# ---------------------------------------------------------------------------


@pytest.fixture
def auth_client():
    """TestClient with auth-protected routes (no token by default)."""
    mock_provider = __import__("unittest.mock", fromlist=["MagicMock"]).MagicMock()
    mock_provider.generate.return_value = "Réponse générée."

    mock_doc = __import__("unittest.mock", fromlist=["MagicMock"]).MagicMock()
    mock_doc.page_content = "Contenu test"
    mock_doc.metadata = {"source": "test.md", "chunk_index": 0}
    mock_vs = __import__("unittest.mock", fromlist=["MagicMock"]).MagicMock()
    mock_vs.similarity_search_with_relevance_scores.return_value = [(mock_doc, 0.85)]
    mock_vs.add_documents.return_value = ["id1"]

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    from main import app

    app.dependency_overrides[get_provider] = lambda: mock_provider
    app.dependency_overrides[get_vectorstore] = lambda: mock_vs
    app.dependency_overrides[get_engine] = lambda: engine

    yield TestClient(app)

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# T011 — Login endpoint tests
# ---------------------------------------------------------------------------


def test_login_success_returns_token(auth_client):
    from core.config import settings

    settings.demo_username = "admin"
    settings.demo_password_hash = bcrypt.hashpw(b"changeme", bcrypt.gensalt()).decode()

    resp = auth_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "changeme"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_returns_401(auth_client):
    from core.config import settings

    settings.demo_password_hash = bcrypt.hashpw(b"changeme", bcrypt.gensalt()).decode()

    resp = auth_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_login_unknown_user_returns_401(auth_client):
    resp = auth_client.post(
        "/api/v1/auth/login",
        json={"username": "unknown", "password": "whatever"},
    )
    assert resp.status_code == 401


def test_auth_me_returns_username(auth_client):
    from auth.service import create_token

    token = create_token("admin")
    resp = auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


# ---------------------------------------------------------------------------
# T021 — Protected route integration tests
# ---------------------------------------------------------------------------


def test_query_without_token_returns_401(auth_client):
    resp = auth_client.post("/api/v1/query", json={"question": "test"})
    assert resp.status_code == 401


def test_logs_without_token_returns_401(auth_client):
    resp = auth_client.get("/api/v1/logs")
    assert resp.status_code == 401


def test_documents_without_token_returns_401(auth_client):
    resp = auth_client.get("/api/v1/documents")
    assert resp.status_code == 401


def test_query_with_valid_token_returns_200(auth_client):
    from auth.service import create_token

    token = create_token("admin")
    resp = auth_client.post(
        "/api/v1/query",
        json={"question": "What is PALO?", "history": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
