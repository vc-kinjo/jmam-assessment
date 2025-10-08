from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from app.models.response import StandardResponse
import logging
import httpx

logger = logging.getLogger(__name__)

class BFFException(Exception):
    """BFFベースカスタム例外"""
    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)

class BackendConnectionError(BFFException):
    """Backend API接続エラー"""
    def __init__(self, message: str = "Backend APIに接続できませんでした"):
        super().__init__(message, "BACKEND_CONNECTION_ERROR", status.HTTP_503_SERVICE_UNAVAILABLE)

class BackendTimeoutError(BFFException):
    """Backend APIタイムアウトエラー"""  
    def __init__(self, message: str = "Backend APIがタイムアウトしました"):
        super().__init__(message, "BACKEND_TIMEOUT_ERROR", status.HTTP_504_GATEWAY_TIMEOUT)

class SessionError(BFFException):
    """セッションエラー"""
    def __init__(self, message: str = "セッションエラーが発生しました"):
        super().__init__(message, "SESSION_ERROR", status.HTTP_401_UNAUTHORIZED)

class RedisConnectionError(BFFException):
    """Redis接続エラー"""
    def __init__(self, message: str = "Redis接続エラーが発生しました"):
        super().__init__(message, "REDIS_CONNECTION_ERROR", status.HTTP_503_SERVICE_UNAVAILABLE)

async def bff_exception_handler(request: Request, exc: BFFException):
    """BFFカスタム例外ハンドラー"""
    logger.error(f"BFF Exception: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=StandardResponse.error_response(
            code=exc.code,
            message=exc.message
        ).model_dump()
    )

async def httpx_exception_handler(request: Request, exc: Exception):
    """HTTPXリクエスト例外ハンドラー"""
    logger.error(f"HTTP Request Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=StandardResponse.error_response(
            code="HTTP_REQUEST_ERROR",
            message="外部APIリクエストエラーが発生しました"
        ).model_dump()
    )

async def general_exception_handler(request: Request, exc: Exception):
    """一般例外ハンドラー"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=StandardResponse.error_response(
            code="INTERNAL_ERROR",
            message="内部サーバーエラーが発生しました"
        ).model_dump()
    )