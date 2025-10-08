from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    furigana: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    role_level: str = "member"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    furigana: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    role_level: Optional[str] = None
    is_active: Optional[bool] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserInDB(User):
    password_hash: str