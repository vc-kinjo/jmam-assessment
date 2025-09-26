from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_basic():
    """基本テスト"""
    return {"message": "test endpoint works"}

@router.get("/test/{user_id}")
async def test_with_param(user_id: int):
    """パラメータテスト"""
    return {"message": f"test endpoint with param works: {user_id}"}