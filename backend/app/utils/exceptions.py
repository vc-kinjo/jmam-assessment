from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class GunchartException(Exception):
    """ベースカスタム例外"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AuthenticationError(GunchartException):
    """認証エラー"""
    def __init__(self, message: str = "認証に失敗しました"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)

class AuthorizationError(GunchartException):
    """認可エラー"""
    def __init__(self, message: str = "アクセス権限がありません"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)

class ValidationError(GunchartException):
    """バリデーションエラー"""
    def __init__(self, message: str = "入力データが無効です"):
        super().__init__(message, status.HTTP_400_BAD_REQUEST)

class NotFoundError(GunchartException):
    """リソース未見つけエラー"""
    def __init__(self, resource: str = "リソース"):
        super().__init__(f"{resource}が見つかりません", status.HTTP_404_NOT_FOUND)

class ConflictError(GunchartException):
    """競合エラー"""
    def __init__(self, message: str = "データが競合しています"):
        super().__init__(message, status.HTTP_409_CONFLICT)

async def gunchart_exception_handler(request: Request, exc: GunchartException):
    """カスタム例外ハンドラー"""
    logger.error(f"Gunchart Exception: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "error_type": type(exc).__name__
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """SQLAlchemy例外ハンドラー"""
    logger.error(f"Database Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "データベースエラーが発生しました",
            "error_type": "DatabaseError"
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """一般例外ハンドラー"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "内部サーバーエラーが発生しました",
            "error_type": "InternalServerError"
        }
    )