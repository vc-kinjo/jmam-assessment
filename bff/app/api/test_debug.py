from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def debug_health():
    """デバッグヘルスチェック"""
    return {"status": "debug_healthy", "service": "DEBUG", "timestamp": datetime.now().isoformat()}

@router.post("/simple")
async def debug_simple(request: dict):
    """デバッグ用シンプルPOST"""
    return {"received": request, "status": "debug_ok", "message": "DEBUG POST endpoint working"}