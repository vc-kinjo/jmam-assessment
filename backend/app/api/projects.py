from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.project import (
    Project, ProjectCreate, ProjectUpdate, ProjectWithMembers,
    ProjectMember, ProjectMemberCreate, ProjectSummary
)
from app.schemas.auth import UserInfo
from app.services.project_service import ProjectService
from app.api.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[Project])
async def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """プロジェクト一覧取得"""
    from ..models.project import Project as ProjectModel
    projects = db.query(ProjectModel).offset(skip).limit(limit).all()
    return projects

@router.post("/", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクト作成"""
    project_service = ProjectService(db)
    return project_service.create_project(project_data, current_user.id)

@router.get("/summaries", response_model=List[ProjectSummary])
async def get_project_summaries(
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクト概要一覧取得（ダッシュボード用）"""
    project_service = ProjectService(db)
    return project_service.get_project_summaries(
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/{project_id}", response_model=ProjectWithMembers)
async def get_project(
    project_id: int,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクト詳細取得"""
    project_service = ProjectService(db)
    return project_service.get_project_by_id(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクト更新"""
    project_service = ProjectService(db)
    return project_service.update_project(
        project_id=project_id,
        project_data=project_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクト削除"""
    project_service = ProjectService(db)
    project_service.delete_project(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )
    return {"message": "プロジェクトが削除されました"}

@router.get("/{project_id}/members", response_model=List[ProjectMember])
async def get_project_members(
    project_id: int,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトメンバー一覧取得"""
    project_service = ProjectService(db)
    return project_service.get_project_members(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.post("/{project_id}/members", response_model=ProjectMember)
async def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトメンバー追加"""
    project_service = ProjectService(db)
    return project_service.add_project_member(
        project_id=project_id,
        member_data=member_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.delete("/{project_id}/members/{member_user_id}")
async def remove_project_member(
    project_id: int,
    member_user_id: int,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトメンバー削除"""
    project_service = ProjectService(db)
    project_service.remove_project_member(
        project_id=project_id,
        member_user_id=member_user_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )
    return {"message": "メンバーが削除されました"}