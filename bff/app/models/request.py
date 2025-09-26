from pydantic import BaseModel
from typing import Any, Optional, Dict

class StandardRequest(BaseModel):
    """標準リクエスト形式"""
    data: Any
    metadata: Optional[Dict[str, Any]] = None

class LoginRequest(StandardRequest):
    """ログインリクエスト"""
    data: Dict[str, str]  # {"username": "...", "password": "..."}

class RefreshTokenRequest(StandardRequest):
    """リフレッシュトークンリクエスト"""
    data: Dict[str, str]  # {"refresh_token": "..."}

class UserProfileUpdateRequest(StandardRequest):
    """ユーザープロフィール更新リクエスト"""
    data: Dict[str, Any]

class UserCreateRequest(StandardRequest):
    """ユーザー作成リクエスト（管理者用）"""
    data: Dict[str, Any]