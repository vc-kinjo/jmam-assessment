from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database.connection import get_db
from ..models.user import User
from ..models.template import ProjectTemplate, TemplateRating
from ..schemas.template import (
    ProjectTemplateResponse, ProjectTemplateCreate, ProjectTemplateFromProject,
    ProjectFromTemplate, TemplateRatingCreate, TemplateRatingResponse
)
from ..services.template_service import template_service
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("/templates", response_model=List[ProjectTemplateResponse])
def get_templates(
    category: Optional[str] = Query(None, description="フィルターするカテゴリ"),
    public_only: bool = Query(False, description="公開テンプレートのみ取得"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレート一覧を取得"""
    templates = template_service.get_templates(db, current_user.id, category, public_only)
    return templates

@router.get("/templates/{template_id}", response_model=ProjectTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """特定のテンプレートを取得"""
    template = template_service.get_template(db, template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    return template

@router.post("/templates/from-project", response_model=ProjectTemplateResponse)
def create_template_from_project(
    template_data: ProjectTemplateFromProject,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """既存のプロジェクトからテンプレートを作成"""
    try:
        template = template_service.create_template_from_project(
            db,
            template_data.project_id,
            template_data.name,
            template_data.description,
            template_data.category,
            template_data.tags,
            current_user.id,
            template_data.is_public
        )
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/create-project")
def create_project_from_template(
    template_id: int,
    project_data: ProjectFromTemplate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレートからプロジェクトを作成"""
    try:
        project = template_service.create_project_from_template(
            db,
            template_id,
            project_data.name,
            project_data.start_date,
            current_user.id,
            project_data.description
        )
        return {
            "project_id": project.id,
            "message": f"プロジェクト「{project.name}」を作成しました"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/{template_id}/rate", response_model=TemplateRatingResponse)
def rate_template(
    template_id: int,
    rating_data: TemplateRatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレートに評価をつける"""
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="評価は1-5の範囲で入力してください")
    
    rating = template_service.rate_template(
        db, template_id, current_user.id, rating_data.rating, rating_data.comment
    )
    return rating

@router.get("/templates/{template_id}/ratings", response_model=List[TemplateRatingResponse])
def get_template_ratings(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレートの評価一覧を取得"""
    ratings = db.query(TemplateRating).filter(
        TemplateRating.template_id == template_id
    ).order_by(TemplateRating.created_at.desc()).all()
    return ratings

@router.get("/template-categories")
def get_template_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """利用可能なテンプレートカテゴリ一覧を取得"""
    categories = template_service.get_template_categories(db)
    return {"categories": categories}

@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレートを削除（作成者のみ）"""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    
    if template.created_by != current_user.id and current_user.role_level != "admin":
        raise HTTPException(status_code=403, detail="削除権限がありません")
    
    db.delete(template)
    db.commit()
    
    return {"message": "テンプレートを削除しました"}

@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テンプレートを更新（作成者のみ）"""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    
    if template.created_by != current_user.id and current_user.role_level != "admin":
        raise HTTPException(status_code=403, detail="編集権限がありません")
    
    # 更新可能なフィールドのみ処理
    allowed_fields = {"name", "description", "category", "tags", "is_public"}
    for field, value in update_data.items():
        if field in allowed_fields and hasattr(template, field):
            setattr(template, field, value)
    
    from datetime import datetime
    template.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "テンプレートを更新しました"}