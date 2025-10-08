import uuid
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.utils.http_client import backend_client
from app.utils.session import session_manager
from app.models.response import StandardResponse

class AuthService:
    """BFF認証サービス"""

    async def login(self, username: str, password: str) -> StandardResponse:
        """ログイン処理"""
        try:
            # Backend API にログイン要求
            response = await backend_client.post("/api/auth/login", {
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                token_data = response.json()
                
                # ユーザー情報を取得
                user_response = await backend_client.get("/api/auth/me", headers={
                    "Authorization": f"Bearer {token_data['access_token']}"
                })
                
                if user_response.status_code == 200:
                    user_info = user_response.json()
                    
                    # セッション作成
                    session_data = {
                        "user_id": user_info["id"],
                        "username": user_info["username"],
                        "email": user_info["email"],
                        "full_name": user_info["full_name"],
                        "role_level": user_info["role_level"],
                        "access_token": token_data["access_token"],
                        "refresh_token": token_data["refresh_token"]
                    }
                    
                    session_id = session_manager.create_session(
                        session_data, 
                        expires_in=token_data.get("expires_in", 1800)
                    )
                    
                    return StandardResponse.success_response({
                        "session_id": session_id,
                        "user": {
                            "id": user_info["id"],
                            "username": user_info["username"],
                            "email": user_info["email"],
                            "full_name": user_info["full_name"],
                            "role_level": user_info["role_level"]
                        }
                    })
                
            # ログイン失敗
            error_detail = response.json().get("detail", "Authentication failed")
            return StandardResponse.error_response(
                code="AUTH_FAILED",
                message=error_detail
            )
            
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Login failed: {str(e)}"
            )

    async def logout(self, session_id: str) -> StandardResponse:
        """ログアウト処理"""
        try:
            session_manager.delete_session(session_id)
            return StandardResponse.success_response({
                "message": "Successfully logged out"
            })
        except Exception as e:
            return StandardResponse.error_response(
                code="LOGOUT_ERROR",
                message=f"Logout failed: {str(e)}"
            )

    async def refresh_token(self, session_id: str) -> StandardResponse:
        """トークンリフレッシュ"""
        try:
            session_data = session_manager.get_session(session_id)
            if not session_data:
                return StandardResponse.error_response(
                    code="INVALID_SESSION",
                    message="Session not found"
                )

            refresh_token = session_data.get("refresh_token")
            if not refresh_token:
                return StandardResponse.error_response(
                    code="NO_REFRESH_TOKEN",
                    message="No refresh token found"
                )

            # Backend API にリフレッシュ要求
            response = await backend_client.post("/api/auth/refresh", {
                "refresh_token": refresh_token
            })
            
            if response.status_code == 200:
                token_data = response.json()
                
                # セッション更新
                session_manager.update_session(session_id, {
                    "access_token": token_data["access_token"],
                    "refresh_token": token_data["refresh_token"]
                })
                
                return StandardResponse.success_response({
                    "message": "Token refreshed successfully"
                })
            else:
                return StandardResponse.error_response(
                    code="REFRESH_FAILED",
                    message="Failed to refresh token"
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="REFRESH_ERROR",
                message=f"Token refresh failed: {str(e)}"
            )

    def get_session_user(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッションからユーザー情報取得"""
        session_data = session_manager.get_session(session_id)
        if session_data:
            return {
                "id": session_data.get("user_id"),
                "username": session_data.get("username"),
                "email": session_data.get("email"),
                "full_name": session_data.get("full_name"),
                "role_level": session_data.get("role_level")
            }
        return None

    def get_session_token(self, session_id: str) -> Optional[str]:
        """セッションからアクセストークン取得"""
        session_data = session_manager.get_session(session_id)
        if session_data:
            return session_data.get("access_token")
        return None