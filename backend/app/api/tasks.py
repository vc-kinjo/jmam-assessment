from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.task import (
    Task, TaskCreate, TaskUpdate, TaskWithAssignments,
    TaskAssignment, TaskAssignmentCreate,
    TaskDependency, TaskDependencyCreate,
    TaskComment, TaskCommentCreate,
    ValidPredecessorTask, TaskHierarchy
)
from app.schemas.auth import UserInfo
from app.services.task_service import TaskService
from app.api.auth import get_current_active_user

router = APIRouter()

@router.get("/projects/{project_id}/tasks", response_model=List[Task])
async def get_project_tasks(
    project_id: int = Path(..., description="プロジェクトID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトのタスク一覧取得"""
    task_service = TaskService(db)
    return task_service.get_tasks(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level,
        skip=skip,
        limit=limit,
        status_filter=status,
        assigned_to=assigned_to
    )

@router.post("/projects/{project_id}/tasks", response_model=Task)
async def create_task(
    project_id: int = Path(..., description="プロジェクトID"),
    task_data: TaskCreate = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク作成"""
    # project_idをtask_dataに設定
    task_data.project_id = project_id
    task_service = TaskService(db)
    return task_service.create_task(task_data, current_user.id, current_user.role_level)

@router.get("/tasks/{task_id}", response_model=TaskWithAssignments)
async def get_task(
    task_id: int = Path(..., description="タスクID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク詳細取得"""
    task_service = TaskService(db)
    return task_service.get_task_by_id(
        task_id=task_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: int = Path(..., description="タスクID"),
    task_data: TaskUpdate = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク更新"""
    task_service = TaskService(db)
    return task_service.update_task(
        task_id=task_id,
        task_data=task_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int = Path(..., description="タスクID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク削除"""
    task_service = TaskService(db)
    task_service.delete_task(
        task_id=task_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )
    return {"message": "タスクが削除されました"}

@router.get("/tasks/{task_id}/assignments", response_model=List[TaskAssignment])
async def get_task_assignments(
    task_id: int = Path(..., description="タスクID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク担当者一覧取得"""
    task_service = TaskService(db)
    task = task_service.get_task_by_id(task_id, current_user.id, current_user.role_level)
    return task.assignments

@router.post("/tasks/{task_id}/assignments", response_model=TaskAssignment)
async def assign_task(
    task_id: int = Path(..., description="タスクID"),
    assignment_data: TaskAssignmentCreate = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク担当者割り当て"""
    task_service = TaskService(db)
    return task_service.assign_task(
        task_id=task_id,
        assignment_data=assignment_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.delete("/tasks/{task_id}/assignments/{assignment_user_id}")
async def unassign_task(
    task_id: int = Path(..., description="タスクID"),
    assignment_user_id: int = Path(..., description="割り当て解除するユーザーID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク担当者解除"""
    task_service = TaskService(db)
    task_service.unassign_task(
        task_id=task_id,
        assignment_user_id=assignment_user_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )
    return {"message": "担当者の割り当てが解除されました"}

@router.post("/task-dependencies", response_model=TaskDependency)
async def create_task_dependency(
    dependency_data: TaskDependencyCreate = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスク依存関係作成"""
    task_service = TaskService(db)
    return task_service.create_task_dependency(
        dependency_data=dependency_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/tasks/{task_id}/comments", response_model=List[TaskComment])
async def get_task_comments(
    task_id: int = Path(..., description="タスクID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスクコメント一覧取得"""
    task_service = TaskService(db)
    return task_service.get_task_comments(
        task_id=task_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.post("/tasks/{task_id}/comments", response_model=TaskComment)
async def add_task_comment(
    task_id: int = Path(..., description="タスクID"),
    comment_data: TaskCommentCreate = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスクコメント追加"""
    task_service = TaskService(db)
    return task_service.add_task_comment(
        task_id=task_id,
        comment_data=comment_data,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/projects/{project_id}/tasks/hierarchy", response_model=List[TaskHierarchy])
async def get_task_hierarchy(
    project_id: int = Path(..., description="プロジェクトID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトのタスク階層取得"""
    task_service = TaskService(db)
    return task_service.get_task_hierarchy(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/tasks/{task_id}/valid-predecessors", response_model=List[ValidPredecessorTask])
async def get_valid_predecessors(
    task_id: int = Path(..., description="タスクID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスクの有効な先行タスク一覧取得（同じグループ内のみ）"""
    task_service = TaskService(db)
    return task_service.get_valid_predecessors(
        task_id=task_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/projects/{project_id}/hierarchy", response_model=List[TaskHierarchy])
async def get_project_task_hierarchy(
    project_id: int = Path(..., description="プロジェクトID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトのタスク階層構造取得（ガンチャート用）"""
    task_service = TaskService(db)
    return task_service.get_task_hierarchy(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.get("/projects/{project_id}/dependencies", response_model=List[TaskDependency])
async def get_project_task_dependencies(
    project_id: int = Path(..., description="プロジェクトID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """プロジェクトのタスク依存関係一覧取得（ガンチャート用）"""
    task_service = TaskService(db)
    return task_service.get_project_dependencies(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.put("/tasks/{task_id}/parent", response_model=Task)
async def update_task_parent(
    task_id: int = Path(..., description="タスクID"),
    parent_data: dict = ...,
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """タスクの親子関係更新"""
    task_service = TaskService(db)
    parent_task_id = parent_data.get('parent_task_id')
    level = parent_data.get('level', 0)
    
    return task_service.update_task_parent(
        task_id=task_id,
        parent_task_id=parent_task_id,
        level=level,
        user_id=current_user.id,
        user_role=current_user.role_level
    )

@router.post("/projects/{project_id}/calculate-progress")
async def calculate_parent_task_progress(
    project_id: int = Path(..., description="プロジェクトID"),
    current_user: UserInfo = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """親タスクの進捗率自動計算"""
    task_service = TaskService(db)
    updated_tasks = task_service.calculate_parent_progress(
        project_id=project_id,
        user_id=current_user.id,
        user_role=current_user.role_level
    )
    return {"updated_tasks": updated_tasks, "message": f"{len(updated_tasks)}個のタスクの進捗率が更新されました"}