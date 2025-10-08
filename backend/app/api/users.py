from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import User, UserCreate, UserUpdate, UserPasswordUpdate
from app.schemas.auth import UserInfo
from app.services.user_service import UserService
from app.api.auth import get_current_active_user

router = APIRouter()

def require_admin(current_user: UserInfo = Depends(get_current_active_user)):
    """Dependency to require admin role"""
    if current_user.role_level != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/", response_model=List[User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserInfo = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    user_service = UserService(db)
    return user_service.get_users(skip=skip, limit=limit)

@router.post("/", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: UserInfo = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create new user (admin only)"""
    user_service = UserService(db)
    return user_service.create_user(user_data)

@router.get("/profile", response_model=User)
async def get_profile(
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user_service = UserService(db)
    return user_service.get_user_by_id(current_user.id)

@router.put("/profile", response_model=User)
async def update_profile(
    user_data: UserUpdate,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    user_service = UserService(db)
    # Users can only update certain fields
    allowed_fields = {
        "full_name", "furigana", "phone_number", "company", "department"
    }
    update_data = user_data.model_dump(exclude_unset=True)
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    filtered_update = UserUpdate(**filtered_data)
    return user_service.update_user(current_user.id, filtered_update)

@router.put("/profile/password")
async def update_password(
    password_data: UserPasswordUpdate,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user password"""
    user_service = UserService(db)
    user_service.update_password(current_user.id, password_data)
    return {"message": "Password updated successfully"}

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    current_user: UserInfo = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID (admin only)"""
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: UserInfo = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user by ID (admin only)"""
    user_service = UserService(db)
    return user_service.update_user(user_id, user_data)

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: UserInfo = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete user by ID (admin only)"""
    user_service = UserService(db)
    user_service.delete_user(user_id)
    return {"message": "User deleted successfully"}