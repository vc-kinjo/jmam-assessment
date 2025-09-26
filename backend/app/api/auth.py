from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, UserInfo
from app.services.auth_service import AuthService

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint"""
    auth_service = AuthService(db)
    return auth_service.login(login_data)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh token endpoint"""
    auth_service = AuthService(db)
    return auth_service.refresh_token(refresh_data.refresh_token)

@router.get("/me", response_model=UserInfo)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user info endpoint"""
    auth_service = AuthService(db)
    return auth_service.get_current_user(credentials.credentials)

# Dependency for protected routes
async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserInfo:
    """Dependency to get current active user"""
    auth_service = AuthService(db)
    return auth_service.get_current_user(credentials.credentials)