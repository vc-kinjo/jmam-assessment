import redis
import json
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.config import settings

class SessionManager:
    """Redis セッション管理"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=True
        )

    def create_session(self, user_data: Dict[str, Any], expires_in: int = 86400) -> str:
        """セッション作成"""
        session_id = str(uuid.uuid4())
        session_data = {
            **user_data,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        }
        
        self.redis_client.setex(
            f"session:{session_id}",
            expires_in,
            json.dumps(session_data)
        )
        
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション取得"""
        session_data = self.redis_client.get(f"session:{session_id}")
        if session_data:
            return json.loads(session_data)
        return None

    def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """セッション更新"""
        session_data = self.get_session(session_id)
        if session_data:
            session_data.update(data)
            # 既存のTTLを保持
            ttl = self.redis_client.ttl(f"session:{session_id}")
            if ttl > 0:
                self.redis_client.setex(
                    f"session:{session_id}",
                    ttl,
                    json.dumps(session_data)
                )
                return True
        return False

    def delete_session(self, session_id: str) -> bool:
        """セッション削除"""
        return self.redis_client.delete(f"session:{session_id}") > 0

    def extend_session(self, session_id: str, expires_in: int = 86400) -> bool:
        """セッション期限延長"""
        return self.redis_client.expire(f"session:{session_id}", expires_in)

# シングルトンインスタンス
session_manager = SessionManager()

# FastAPI依存関数
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel

class UserSession(BaseModel):
    """ユーザーセッション情報"""
    user_id: int
    username: str
    full_name: str
    email: str
    role_level: str
    access_token: Optional[str] = None
    session_id: str

def get_session_id(x_session_id: str = Header(None, alias="X-Session-ID")) -> str:
    """リクエストヘッダーからセッションIDを取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    return x_session_id

def get_current_session(session_id: str = Header(None, alias="X-Session-ID")) -> Dict[str, Any]:
    """現在のセッション情報を取得"""
    if not session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="無効なセッションです")
    
    # セッション期限チェック
    expires_at = datetime.fromisoformat(session_data.get("expires_at", ""))
    if datetime.utcnow() > expires_at:
        session_manager.delete_session(session_id)
        raise HTTPException(status_code=401, detail="セッションが期限切れです")
    
    return session_data

def get_current_user_session(session_id: str = Header(None, alias="X-Session-ID")) -> UserSession:
    """現在のユーザーセッション情報を取得"""
    session_data = get_current_session(session_id)
    
    return UserSession(
        user_id=session_data.get("id", 0),
        username=session_data.get("username", ""),
        full_name=session_data.get("full_name", ""),
        email=session_data.get("email", ""),
        role_level=session_data.get("role_level", "member"),
        access_token=session_data.get("access_token"),
        session_id=session_id
    )