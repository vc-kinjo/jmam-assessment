from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import Optional, Dict, Any
from app.models.request import LoginRequest, RefreshTokenRequest
from app.models.response import StandardResponse
from app.services.auth_service import AuthService

# Type alias for user session
UserSession = Dict[str, Any]

router = APIRouter()

def get_session_id(x_session_id: Optional[str] = Header(None)) -> str:
    """セッションID取得"""
    if not x_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID required"
        )
    return x_session_id

@router.post("/login", response_model=StandardResponse)
async def login(request: LoginRequest):
    """ログイン"""
    # 一時的にsimple-loginと同じロジックを使用
    from app.api.auth_simple import simple_login
    return await simple_login(request)

@router.post("/logout", response_model=StandardResponse)
async def logout(session_id: str = Depends(get_session_id)):
    """ログアウト"""
    auth_service = AuthService()
    return await auth_service.logout(session_id)

@router.post("/refresh", response_model=StandardResponse)
async def refresh_token(session_id: str = Depends(get_session_id)):
    """トークンリフレッシュ"""
    auth_service = AuthService()
    return await auth_service.refresh_token(session_id)

@router.post("/me", response_model=StandardResponse)
async def get_current_user(session_id: str = Depends(get_session_id)):
    """現在のユーザー情報取得"""
    auth_service = AuthService()
    user = auth_service.get_session_user(session_id)
    
    if not user:
        return StandardResponse.error_response(
            code="INVALID_SESSION",
            message="Invalid session"
        )
    
    return StandardResponse.success_response(user)

# 認証が必要なエンドポイントの依存関数
async def get_current_user_dependency(session_id: str = Depends(get_session_id)):
    """現在のユーザー取得（依存関数）"""
    auth_service = AuthService()
    user = auth_service.get_session_user(session_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    return user

async def get_admin_user_dependency(current_user = Depends(get_current_user_dependency)):
    """管理者権限チェック（依存関数）"""
    if current_user.get("role_level") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user

async def get_backend_token(session_id: str = Depends(get_session_id)) -> str:
    """Backend API用トークン取得"""
    auth_service = AuthService()
    token = auth_service.get_session_token(session_id)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session or token expired"
        )
    
    return token

# Alias for compatibility
async def get_current_user_session(session_id: str = Depends(get_session_id)) -> UserSession:
    """現在のユーザーセッション取得（依存関数）"""
    auth_service = AuthService()
    user = auth_service.get_session_user(session_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    return user