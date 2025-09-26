from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel
from typing import Optional
from app.models.request import StandardRequest, UserProfileUpdateRequest, UserCreateRequest
from app.models.response import StandardResponse
from app.services.user_service import UserService
from app.api.auth import (
    get_current_user_dependency, 
    get_admin_user_dependency, 
    get_backend_token
)
from app.utils.data_store import data_store

class SimpleUserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: Optional[str] = ""  # パスワードフィールド追加
    furigana: Optional[str] = ""
    phone_number: Optional[str] = ""
    company: Optional[str] = ""
    department: Optional[str] = ""
    role_level: str = "member"

router = APIRouter()

# 汎用ルートを先に定義（path parameterなし）
@router.get("")
async def get_users_list():
    """ユーザー一覧取得"""
    try:
        users = data_store.get_users()
        return users  # 元のフォーマットを維持
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

@router.post("")
async def create_user_simple(user_data: SimpleUserCreate):
    """ユーザー作成"""
    try:
        new_user_data = {
            "username": user_data.username,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "password": user_data.password if user_data.password else "password123",  # デフォルトパスワード
            "furigana": user_data.furigana,
            "phone_number": user_data.phone_number,
            "company": user_data.company,
            "department": user_data.department,
            "role": user_data.role_level
        }
        
        created_user = data_store.create_user(new_user_data)
        return created_user
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

# POST版の削除（フロントエンドの対応のため）
@router.post("/delete")
async def delete_user_via_post(request: dict):
    """ユーザー削除（POST経由）"""
    try:
        user_id = request.get("user_id")
        if not user_id:
            return {"success": False, "error": "user_id is required"}
        
        success = data_store.delete_user(user_id)
        if success:
            return {"success": True, "message": f"ユーザーID {user_id} を削除しました"}
        else:
            return {"success": False, "error": "ユーザーが見つかりません"}
    except Exception as e:
        return {"success": False, "error": f"エラー: {str(e)}"}

# 具体的なルートを後に定義（path parameterを持つルート）
@router.get("/{user_id}")  
async def get_user_by_id(user_id: int):
    """単一ユーザー取得 - フロントエンドが期待するURL"""
    try:
        user = data_store.get_user(user_id)
        if user:
            return user  # 元のフォーマットを維持
        else:
            return {"error": "ユーザーが見つかりません"}
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

@router.put("/{user_id}")  
async def update_user_by_id(user_id: int, user_data: SimpleUserCreate):
    """ユーザー更新 - フロントエンドが期待するPUT /{user_id}"""
    try:
        updated_data = {
            "username": user_data.username,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "furigana": user_data.furigana,
            "phone_number": user_data.phone_number,
            "company": user_data.company,
            "department": user_data.department,
            "role": user_data.role_level
        }
        
        # パスワードが提供された場合は更新
        if user_data.password:
            updated_data["password"] = user_data.password
        
        updated_user = data_store.update_user(user_id, updated_data)
        if updated_user:
            return updated_user  # 元のフォーマットを維持
        else:
            return {"error": "ユーザーが見つかりません"}
    except Exception as e:
        return {"error": f"エラー: {str(e)}"}

@router.delete("/{user_id}")  
async def delete_user_by_id(user_id: int):
    """ユーザー削除 - フロントエンドが期待するDELETE /{user_id}"""
    try:
        success = data_store.delete_user(user_id)
        if success:
            return {"message": f"ユーザーID {user_id} を削除しました", "success": True}
        else:
            return {"error": "ユーザーが見つかりません", "success": False}
    except Exception as e:
        return {"error": f"エラー: {str(e)}", "success": False}

# 管理者用エンドポイント（既存）
@router.post("/list", response_model=StandardResponse)
async def get_users(
    request: StandardRequest,
    current_user = Depends(get_admin_user_dependency),
    backend_token: str = Depends(get_backend_token)
):
    """ユーザー一覧取得（管理者用）"""
    user_service = UserService()
    return await user_service.get_users(
        skip=request.data.get("skip", 0),
        limit=request.data.get("limit", 100),
        backend_token=backend_token
    )

@router.post("/create", response_model=StandardResponse)
async def create_user(
    request: UserCreateRequest,
    current_user = Depends(get_admin_user_dependency),
    backend_token: str = Depends(get_backend_token)
):
    """ユーザー作成（管理者用）- バックエンドとBFF両方に保存"""
    try:
        user_service = UserService()
        
        # バックエンドにユーザーを作成
        backend_response = await user_service.create_user(request.data, backend_token)
        
        if backend_response.success:
            # バックエンド作成成功時、BFFのデータストアにも同期
            user_data = request.data
            bff_user_data = {
                "username": user_data.get("username"),
                "email": user_data.get("email"),
                "full_name": user_data.get("full_name"),
                "furigana": user_data.get("furigana", ""),
                "phone_number": user_data.get("phone_number", ""),
                "company": user_data.get("company", ""),
                "department": user_data.get("department", ""),
                "role": user_data.get("role_level", "user")
            }
            
            # BFFのデータストアにも保存
            data_store.create_user(bff_user_data)
        
        return backend_response
        
    except Exception as e:
        return StandardResponse.error_response(
            code="USER_CREATION_ERROR",
            message=f"ユーザー作成エラー: {str(e)}"
        )

@router.post("/profile/get", response_model=StandardResponse)
async def get_profile(
    current_user = Depends(get_current_user_dependency),
    backend_token: str = Depends(get_backend_token)
):
    """プロフィール取得"""
    user_service = UserService()
    return await user_service.get_profile(backend_token)

@router.post("/profile/update", response_model=StandardResponse)
async def update_profile(
    request: UserProfileUpdateRequest,
    current_user = Depends(get_current_user_dependency),
    backend_token: str = Depends(get_backend_token)
):
    """プロフィール更新"""
    user_service = UserService()
    return await user_service.update_profile(request.data, backend_token)

@router.post("/profile/password", response_model=StandardResponse)
async def update_password(
    request: StandardRequest,
    current_user = Depends(get_current_user_dependency),
    backend_token: str = Depends(get_backend_token)
):
    """パスワード更新"""
    user_service = UserService()
    return await user_service.update_password(request.data, backend_token)