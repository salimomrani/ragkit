from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from auth.service import create_token, verify_password
from core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    username: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest) -> LoginResponse:
    if request.username != settings.demo_username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(request.password, settings.demo_password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return LoginResponse(access_token=create_token(request.username))


@router.get("/me", response_model=MeResponse)
def me(current_user: str = Depends(get_current_user)) -> MeResponse:
    return MeResponse(username=current_user)
