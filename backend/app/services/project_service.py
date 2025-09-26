from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from fastapi import HTTPException, status
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectMemberCreate, 
    ProjectSummary
)
from app.utils.exceptions import NotFoundError, ConflictError, AuthorizationError

class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    def get_projects(
        self, 
        user_id: int, 
        user_role: str,
        skip: int = 0, 
        limit: int = 100,
        status_filter: Optional[str] = None
    ) -> List[Project]:
        """ユーザーが参加可能なプロジェクト一覧取得"""
        query = self.db.query(Project)
        
        # 管理者以外は参加プロジェクトのみ
        if user_role != "admin":
            query = query.join(ProjectMember).filter(ProjectMember.user_id == user_id)
        
        # ステータスフィルタ
        if status_filter:
            query = query.filter(Project.status == status_filter)
            
        return query.options(joinedload(Project.members)).offset(skip).limit(limit).all()

    def get_project_by_id(self, project_id: int, user_id: int, user_role: str) -> Project:
        """プロジェクト詳細取得"""
        project = self.db.query(Project).options(
            joinedload(Project.members),
            joinedload(Project.creator)
        ).filter(Project.id == project_id).first()
        
        if not project:
            raise NotFoundError("プロジェクト")
            
        # アクセス権限チェック
        if not self._can_access_project(project, user_id, user_role):
            raise AuthorizationError("このプロジェクトにアクセスする権限がありません")
            
        return project

    def create_project(self, project_data: ProjectCreate, user_id: int) -> Project:
        """プロジェクト作成"""
        # 日付検証
        if project_data.start_date >= project_data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="開始日は終了日より前である必要があります"
            )

        # プロジェクト作成
        db_project = Project(
            name=project_data.name,
            description=project_data.description,
            start_date=project_data.start_date,
            end_date=project_data.end_date,
            category=project_data.category,
            created_by=user_id
        )
        
        self.db.add(db_project)
        self.db.flush()  # IDを取得するため
        
        # 作成者をプロジェクトマネージャーとして追加
        project_member = ProjectMember(
            project_id=db_project.id,
            user_id=user_id,
            role="manager"
        )
        self.db.add(project_member)
        
        self.db.commit()
        self.db.refresh(db_project)
        return db_project

    def update_project(
        self, 
        project_id: int, 
        project_data: ProjectUpdate, 
        user_id: int, 
        user_role: str
    ) -> Project:
        """プロジェクト更新"""
        project = self.get_project_by_id(project_id, user_id, user_role)
        
        # 更新権限チェック
        if not self._can_modify_project(project, user_id, user_role):
            raise AuthorizationError("プロジェクトを更新する権限がありません")

        # 更新データ適用
        update_data = project_data.model_dump(exclude_unset=True)
        
        # 日付検証
        start_date = update_data.get('start_date', project.start_date)
        end_date = update_data.get('end_date', project.end_date)
        if start_date >= end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="開始日は終了日より前である必要があります"
            )

        for field, value in update_data.items():
            setattr(project, field, value)

        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: int, user_id: int, user_role: str) -> bool:
        """プロジェクト削除"""
        project = self.get_project_by_id(project_id, user_id, user_role)
        
        # 削除権限チェック（作成者か管理者のみ）
        if user_role != "admin" and project.created_by != user_id:
            raise AuthorizationError("プロジェクトを削除する権限がありません")

        self.db.delete(project)
        self.db.commit()
        return True

    def get_project_members(self, project_id: int, user_id: int, user_role: str) -> List[ProjectMember]:
        """プロジェクトメンバー一覧取得"""
        project = self.get_project_by_id(project_id, user_id, user_role)
        
        return self.db.query(ProjectMember).options(
            joinedload(ProjectMember.user)
        ).filter(ProjectMember.project_id == project_id).all()

    def add_project_member(
        self, 
        project_id: int, 
        member_data: ProjectMemberCreate, 
        user_id: int, 
        user_role: str
    ) -> ProjectMember:
        """プロジェクトメンバー追加"""
        project = self.get_project_by_id(project_id, user_id, user_role)
        
        # 追加権限チェック
        if not self._can_modify_project(project, user_id, user_role):
            raise AuthorizationError("メンバーを追加する権限がありません")

        # ユーザー存在確認
        user_exists = self.db.query(User).filter(User.id == member_data.user_id).first()
        if not user_exists:
            raise NotFoundError("ユーザー")

        # 重複チェック
        existing_member = self.db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == member_data.user_id
            )
        ).first()
        
        if existing_member:
            raise ConflictError("ユーザーは既にプロジェクトメンバーです")

        # メンバー追加
        db_member = ProjectMember(
            project_id=project_id,
            user_id=member_data.user_id,
            role=member_data.role
        )
        
        self.db.add(db_member)
        self.db.commit()
        self.db.refresh(db_member)
        return db_member

    def remove_project_member(
        self, 
        project_id: int, 
        member_user_id: int, 
        user_id: int, 
        user_role: str
    ) -> bool:
        """プロジェクトメンバー削除"""
        project = self.get_project_by_id(project_id, user_id, user_role)
        
        # 削除権限チェック
        if not self._can_modify_project(project, user_id, user_role):
            raise AuthorizationError("メンバーを削除する権限がありません")

        # プロジェクト作成者は削除不可
        if project.created_by == member_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="プロジェクト作成者は削除できません"
            )

        member = self.db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == member_user_id
            )
        ).first()
        
        if not member:
            raise NotFoundError("プロジェクトメンバー")

        self.db.delete(member)
        self.db.commit()
        return True

    def get_project_summaries(self, user_id: int, user_role: str) -> List[ProjectSummary]:
        """プロジェクト概要一覧取得（ダッシュボード用）"""
        # 基本クエリ
        query = self.db.query(
            Project.id,
            Project.name,
            Project.status,
            Project.start_date,
            Project.end_date,
            func.count(Task.id).label('task_count'),
            func.count(func.nullif(Task.status == 'completed', False)).label('completed_task_count')
        ).outerjoin(Task, Task.project_id == Project.id)
        
        # 管理者以外は参加プロジェクトのみ
        if user_role != "admin":
            query = query.join(ProjectMember).filter(ProjectMember.user_id == user_id)
        
        # グループ化
        results = query.group_by(
            Project.id, Project.name, Project.status, 
            Project.start_date, Project.end_date
        ).all()
        
        summaries = []
        for result in results:
            progress_rate = 0.0
            if result.task_count > 0:
                progress_rate = (result.completed_task_count / result.task_count) * 100
                
            summaries.append(ProjectSummary(
                id=result.id,
                name=result.name,
                status=result.status,
                start_date=result.start_date,
                end_date=result.end_date,
                progress_rate=round(progress_rate, 1),
                task_count=result.task_count,
                completed_task_count=result.completed_task_count
            ))
            
        return summaries

    def _can_access_project(self, project: Project, user_id: int, user_role: str) -> bool:
        """プロジェクトアクセス権限チェック"""
        if user_role == "admin":
            return True
            
        # プロジェクトメンバーかチェック
        is_member = any(member.user_id == user_id for member in project.members)
        return is_member

    def _can_modify_project(self, project: Project, user_id: int, user_role: str) -> bool:
        """プロジェクト変更権限チェック"""
        if user_role == "admin":
            return True
            
        # プロジェクト作成者またはマネージャーかチェック
        if project.created_by == user_id:
            return True
            
        # マネージャー権限チェック
        member = next((m for m in project.members if m.user_id == user_id), None)
        return member and member.role == "manager"