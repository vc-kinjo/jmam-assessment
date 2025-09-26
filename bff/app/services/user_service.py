from typing import Dict, Any
from app.utils.http_client import backend_client
from app.models.response import StandardResponse

class UserService:
    """BFFユーザーサービス"""

    async def get_users(self, skip: int = 0, limit: int = 100, backend_token: str = "") -> StandardResponse:
        """ユーザー一覧取得"""
        try:
            response = await backend_client.get(
                f"/api/users/?skip={skip}&limit={limit}",
                headers={"Authorization": f"Bearer {backend_token}"}
            )
            
            if response.status_code == 200:
                users = response.json()
                return StandardResponse.success_response({
                    "users": users,
                    "total": len(users),
                    "skip": skip,
                    "limit": limit
                })
            else:
                error_detail = response.json().get("detail", "Failed to fetch users")
                return StandardResponse.error_response(
                    code="FETCH_USERS_FAILED",
                    message=error_detail
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Failed to fetch users: {str(e)}"
            )

    async def create_user(self, user_data: Dict[str, Any], backend_token: str) -> StandardResponse:
        """ユーザー作成"""
        try:
            response = await backend_client.post(
                "/api/users/",
                user_data,
                headers={"Authorization": f"Bearer {backend_token}"}
            )
            
            if response.status_code == 200:
                user = response.json()
                return StandardResponse.success_response({
                    "user": user,
                    "message": "User created successfully"
                })
            else:
                error_detail = response.json().get("detail", "Failed to create user")
                return StandardResponse.error_response(
                    code="CREATE_USER_FAILED",
                    message=error_detail
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Failed to create user: {str(e)}"
            )

    async def get_profile(self, backend_token: str) -> StandardResponse:
        """プロフィール取得"""
        try:
            response = await backend_client.get(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {backend_token}"}
            )
            
            if response.status_code == 200:
                profile = response.json()
                return StandardResponse.success_response(profile)
            else:
                error_detail = response.json().get("detail", "Failed to fetch profile")
                return StandardResponse.error_response(
                    code="FETCH_PROFILE_FAILED",
                    message=error_detail
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Failed to fetch profile: {str(e)}"
            )

    async def update_profile(self, profile_data: Dict[str, Any], backend_token: str) -> StandardResponse:
        """プロフィール更新"""
        try:
            response = await backend_client.put(
                "/api/users/profile",
                profile_data,
                headers={"Authorization": f"Bearer {backend_token}"}
            )
            
            if response.status_code == 200:
                profile = response.json()
                return StandardResponse.success_response({
                    "user": profile,
                    "message": "Profile updated successfully"
                })
            else:
                error_detail = response.json().get("detail", "Failed to update profile")
                return StandardResponse.error_response(
                    code="UPDATE_PROFILE_FAILED",
                    message=error_detail
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Failed to update profile: {str(e)}"
            )

    async def update_password(self, password_data: Dict[str, Any], backend_token: str) -> StandardResponse:
        """パスワード更新"""
        try:
            response = await backend_client.put(
                "/api/users/profile/password",
                password_data,
                headers={"Authorization": f"Bearer {backend_token}"}
            )
            
            if response.status_code == 200:
                result = response.json()
                return StandardResponse.success_response({
                    "message": result.get("message", "Password updated successfully")
                })
            else:
                error_detail = response.json().get("detail", "Failed to update password")
                return StandardResponse.error_response(
                    code="UPDATE_PASSWORD_FAILED",
                    message=error_detail
                )
                
        except Exception as e:
            return StandardResponse.error_response(
                code="INTERNAL_ERROR",
                message=f"Failed to update password: {str(e)}"
            )