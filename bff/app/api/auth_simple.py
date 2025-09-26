from fastapi import APIRouter
from app.models.request import LoginRequest
from app.models.response import StandardResponse
import uuid
import logging
from datetime import datetime
from app.utils.data_store import data_store

# ロガーを設定
logger = logging.getLogger(__name__)

router = APIRouter()

# 簡単なテスト用ユーザー（従来のテスト用）
TEST_USERS = {
    "admin": "admin123",
    "user1": "password123",
    "test": "test123"
}

@router.post("/simple-login", response_model=StandardResponse)
async def simple_login(request: LoginRequest):
    """シンプルなテスト用ログイン - 確実に動作する版"""
    try:
        # デバッグ用の詳細ログ
        print(f"=== LOGIN REQUEST DEBUG ===")
        print(f"Request object: {request}")
        print(f"Request type: {type(request)}")
        print(f"Has 'data' attr: {hasattr(request, 'data')}")
        if hasattr(request, 'data'):
            print(f"Request.data: {request.data}")
            print(f"Request.data type: {type(request.data)}")
        
        logger.info(f"=== LOGIN REQUEST DEBUG ===")
        logger.info(f"Request object: {request}")
        logger.info(f"Request type: {type(request)}")
        logger.info(f"Has 'data' attr: {hasattr(request, 'data')}")
        if hasattr(request, 'data'):
            logger.info(f"Request.data: {request.data}")
            logger.info(f"Request.data type: {type(request.data)}")
        
        # 受信データを確実に取得
        username = None
        password = None
        
        if hasattr(request, 'data') and request.data:
            username = request.data.get("username")
            password = request.data.get("password")
        
        logger.info(f"Login attempt: username={username}, password={'*' * len(password) if password else 'None'}")
        
        # データストアを使用した統一認証
        authenticated_user = data_store.authenticate_user(username, password)
        logger.info(f"Authentication result: {'SUCCESS' if authenticated_user else 'FAILED'}")
        
        if authenticated_user:
            session_id = str(uuid.uuid4())
            return StandardResponse.success_response({
                "session_id": session_id,
                "user": {
                    "id": authenticated_user.get("id"),
                    "username": authenticated_user.get("username"),
                    "email": authenticated_user.get("email"),
                    "full_name": authenticated_user.get("full_name"),
                    "role_level": authenticated_user.get("role", "user")
                },
                "message": "ログイン成功"
            })
        
        return StandardResponse.error_response(
            code="AUTH_FAILED",
            message="ユーザー名またはパスワードが間違っています"
        )
            
    except Exception as e:
        return StandardResponse.error_response(
            code="INTERNAL_ERROR",
            message=f"予期しないエラーが発生しました: {str(e)}"
        )

@router.get("/test-health")
async def test_health():
    """テスト用ヘルスチェック"""
    return {"status": "healthy", "service": "BFF", "timestamp": datetime.now().isoformat()}

@router.post("/super-simple-test")
async def super_simple_test(request: dict):
    """超シンプルなPOSTテスト"""
    return {"received": request, "status": "ok", "message": "POST endpoint is working"}

@router.post("/test-simple-auth")
async def test_simple_auth(request: LoginRequest):
    """HTTP認証テスト用"""
    try:
        username = request.data.get("username") if request.data else "no_data"
        return {
            "success": True,
            "received_username": username,
            "request_data": request.data,
            "message": "HTTP request received successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/debug-login")
async def debug_login(request: LoginRequest):
    """デバッグ用ログイン（リクエスト形式確認）"""
    try:
        # リクエストから情報を取得
        username = request.data.get("username", "unknown") if hasattr(request, 'data') else "no_data"
        password = request.data.get("password", "unknown") if hasattr(request, 'data') else "no_data"
        
        # データストアで認証テスト
        auth_result = data_store.authenticate_user(username, password)
        
        # user3の情報を直接返す（従来の動作も維持）
        stored_user = data_store.get_user_by_username('user3')
        
        return {
            "success": stored_user is not None,
            "request_username": username,
            "request_password": password,
            "request_data_type": str(type(request.data)) if hasattr(request, 'data') else "no_data",
            "request_data": request.data if hasattr(request, 'data') else "no_data",
            "found_user": stored_user,
            "auth_result": auth_result is not None,
            "auth_user": auth_result,
            "session_id": str(uuid.uuid4()) if stored_user else None
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "request_info": str(request)
        }