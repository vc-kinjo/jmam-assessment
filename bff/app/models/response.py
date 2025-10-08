from pydantic import BaseModel
from typing import Any, Optional, Dict
from datetime import datetime

class ErrorDetail(BaseModel):
    """エラー詳細"""
    code: str
    message: str
    details: Optional[Any] = None

class ResponseMetadata(BaseModel):
    """レスポンスメタデータ"""
    request_id: str
    timestamp: datetime
    processing_time: Optional[float] = None

class StandardResponse(BaseModel):
    """標準レスポンス形式"""
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None
    metadata: ResponseMetadata

    @classmethod
    def success_response(cls, data: Any = None, request_id: str = ""):
        return cls(
            success=True,
            data=data,
            metadata=ResponseMetadata(
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
        )

    @classmethod
    def error_response(cls, code: str, message: str, details: Any = None, request_id: str = ""):
        return cls(
            success=False,
            error=ErrorDetail(
                code=code,
                message=message,
                details=details
            ),
            metadata=ResponseMetadata(
                request_id=request_id,
                timestamp=datetime.utcnow()
            )
        )