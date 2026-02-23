from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import HTTPException, status

from core.config import settings


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(username: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": username,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise credentials_exc from exc
    except jwt.InvalidTokenError as exc:
        raise credentials_exc from exc

    username = payload.get("sub")
    if not isinstance(username, str) or not username:
        raise credentials_exc
    return username
