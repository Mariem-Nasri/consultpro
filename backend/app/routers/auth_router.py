from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])
_bearer = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=6, max_length=254)
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=6, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    user: dict
    token: str


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(401, "Connexion requise.", headers={"WWW-Authenticate": "Bearer"})
    user = auth_service.get_user_for_token(credentials.credentials)
    if user is None:
        raise HTTPException(401, "Session expirée ou invalide.", headers={"WWW-Authenticate": "Bearer"})
    return user


@router.post("/register", response_model=AuthResponse, status_code=201)
def register_user(payload: RegisterRequest):
    try:
        user, token = auth_service.register(payload.name, payload.email, payload.password)
    except ValueError as error:
        message = str(error)
        status_code = 409 if "existe déjà" in message else 400
        raise HTTPException(status_code, message) from error
    return {"user": user, "token": token}


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    try:
        user, token = auth_service.login(payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(401, str(error), headers={"WWW-Authenticate": "Bearer"}) from error
    return {"user": user, "token": token}


@router.get("/me")
def current_user(user: dict = Depends(require_user)):
    return {"user": user}


@router.post("/logout", status_code=204)
def logout_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    _user: dict = Depends(require_user),
):
    auth_service.revoke_token(credentials.credentials)
    return Response(status_code=204)
