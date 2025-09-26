from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    category: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ProjectMemberBase(BaseModel):
    user_id: int
    role: str = "member"

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMember(ProjectMemberBase):
    id: int
    project_id: int
    joined_at: datetime
    
    class Config:
        from_attributes = True

class Project(ProjectBase):
    id: int
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectWithMembers(Project):
    members: List[ProjectMember] = []

class ProjectSummary(BaseModel):
    """プロジェクト概要（ダッシュボード用）"""
    id: int
    name: str
    status: str
    start_date: date
    end_date: date
    progress_rate: float
    task_count: int
    completed_task_count: int
    
    class Config:
        from_attributes = True