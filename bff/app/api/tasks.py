from typing import Optional
from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel
from datetime import date
import httpx
from app.models.response import StandardResponse
from app.api.auth import get_current_user_session, UserSession
from app.config import settings
from app.utils.data_store import data_store

router = APIRouter()

@router.get("")
async def get_tasks_by_project(project_id: int):
    """プロジェクトのタスク一覧取得（シンプル）"""
    try:
        # 永続化ストアからタスクを取得
        tasks = data_store.get_tasks(project_id)
        return tasks
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}


class SimpleTaskCreate(BaseModel):
    project_id: int
    parent_task_id: Optional[int] = None
    level: Optional[int] = 0
    name: str
    description: Optional[str] = ""
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    priority: str = "medium"
    category: Optional[str] = ""
    estimated_hours: Optional[int] = 0

@router.post("")
async def create_task_simple(task_data: SimpleTaskCreate):
    """タスク作成（シンプル）"""
    try:
        new_task = {
            "project_id": task_data.project_id,
            "parent_task_id": task_data.parent_task_id,
            "level": task_data.level,
            "name": task_data.name,
            "description": task_data.description,
            "planned_start_date": task_data.planned_start_date,
            "planned_end_date": task_data.planned_end_date,
            "priority": task_data.priority,
            "category": task_data.category,
            "estimated_hours": task_data.estimated_hours,
            "status": "not_started",
            "progress_rate": 0,
            "actual_hours": 0,
            "assigned_users": [],
            "is_milestone": False
        }
        
        # 永続化ストアに保存
        created_task = data_store.create_task(new_task)
        return created_task
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

class TaskListRequest(BaseModel):
    project_id: int
    skip: int = 0
    limit: int = 100
    status: Optional[str] = None
    assigned_to: Optional[int] = None

class TaskCreateRequest(BaseModel):
    project_id: int
    parent_task_id: Optional[int] = None
    level: Optional[int] = 0
    name: str
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    estimated_hours: Optional[int] = 0
    priority: str = "medium"
    category: Optional[str] = None
    is_milestone: bool = False

class TaskUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    progress_rate: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    is_milestone: Optional[bool] = None
    sort_order: Optional[int] = None

class TaskAssignRequest(BaseModel):
    user_id: int

class TaskDependencyCreateRequest(BaseModel):
    predecessor_id: int
    successor_id: int
    dependency_type: str = "finish_to_start"
    lag_days: int = 0

class TaskCommentCreateRequest(BaseModel):
    comment: str

@router.post("/list")
async def get_tasks(
    request: TaskListRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク一覧取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            params = {
                "skip": request.skip,
                "limit": request.limit
            }
            if request.status:
                params["status"] = request.status
            if request.assigned_to:
                params["assigned_to"] = request.assigned_to
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/projects/{request.project_id}/tasks",
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                tasks = response.json()
                return StandardResponse.success_response({
                    "tasks": tasks
                })
            else:
                error_detail = response.json().get("detail", "タスク一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"タスク一覧の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/create")
async def create_task(
    request: TaskCreateRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク作成"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            task_data = {
                "name": request.name,
                "description": request.description,
                "estimated_hours": request.estimated_hours,
                "priority": request.priority,
                "category": request.category,
                "is_milestone": request.is_milestone,
                "level": request.level
            }
            
            if request.parent_task_id:
                task_data["parent_task_id"] = request.parent_task_id
            if request.planned_start_date:
                task_data["planned_start_date"] = request.planned_start_date.isoformat()
            if request.planned_end_date:
                task_data["planned_end_date"] = request.planned_end_date.isoformat()
            
            response = await client.post(
                f"{settings.backend_url}/api/tasks/projects/{request.project_id}/tasks",
                headers=headers,
                json=task_data
            )
            
            if response.status_code == 200:
                task = response.json()
                return StandardResponse.success_response({
                    "task": task,
                    "message": "タスクが作成されました"
                })
            else:
                error_detail = response.json().get("detail", "タスクの作成に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"タスクの作成中にエラーが発生しました: {str(e)}", 500)

@router.get("/dependencies")
async def get_task_dependencies(project_id: int):
    """タスク依存関係一覧取得（シンプル）"""
    try:
        # 永続化ストアから依存関係を取得
        dependencies = data_store.get_dependencies(project_id)
        return dependencies if dependencies else []
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.get("/{task_id}")
async def get_task_detail(
    task_id: int = Path(..., description="タスクID")
):
    """タスク詳細取得（シンプル）"""
    try:
        # 永続化ストアからタスクを取得
        task = data_store.get_task(task_id)
        if task:
            return task
        else:
            return {"error": "タスクが見つかりません"}
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.post("/detail/{task_id}")
async def get_task_detail_post(
    task_id: int = Path(..., description="タスクID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク詳細取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                task = response.json()
                return StandardResponse.success_response({
                    "task": task
                })
            else:
                error_detail = response.json().get("detail", "タスク詳細の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"タスク詳細の取得中にエラーが発生しました: {str(e)}", 500)

class SimpleTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    actual_start_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    progress_rate: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    is_milestone: Optional[bool] = None

@router.put("/{task_id}")
async def update_task_simple(
    task_id: int = Path(..., description="タスクID"),
    request: SimpleTaskUpdate = ...
):
    """タスク更新（シンプル）"""
    try:
        # 更新データを準備
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.planned_start_date is not None:
            update_data["planned_start_date"] = request.planned_start_date
        if request.planned_end_date is not None:
            update_data["planned_end_date"] = request.planned_end_date
        if request.actual_start_date is not None:
            update_data["actual_start_date"] = request.actual_start_date
        if request.actual_end_date is not None:
            update_data["actual_end_date"] = request.actual_end_date
        if request.estimated_hours is not None:
            update_data["estimated_hours"] = request.estimated_hours
        if request.actual_hours is not None:
            update_data["actual_hours"] = request.actual_hours
        if request.progress_rate is not None:
            update_data["progress_rate"] = request.progress_rate
        if request.priority is not None:
            update_data["priority"] = request.priority
        if request.status is not None:
            update_data["status"] = request.status
        if request.category is not None:
            update_data["category"] = request.category
        if request.is_milestone is not None:
            update_data["is_milestone"] = request.is_milestone
        
        # 永続化ストアで更新
        updated_task = data_store.update_task(task_id, update_data)
        if updated_task:
            return updated_task
        else:
            return {"error": "タスクが見つかりません"}
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}


@router.post("/update/{task_id}")
async def update_task(
    task_id: int = Path(..., description="タスクID"),
    request: TaskUpdateRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク更新"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            update_data = {}
            if request.name is not None:
                update_data["name"] = request.name
            if request.description is not None:
                update_data["description"] = request.description
            if request.planned_start_date is not None:
                update_data["planned_start_date"] = request.planned_start_date.isoformat()
            if request.planned_end_date is not None:
                update_data["planned_end_date"] = request.planned_end_date.isoformat()
            if request.actual_start_date is not None:
                update_data["actual_start_date"] = request.actual_start_date.isoformat()
            if request.actual_end_date is not None:
                update_data["actual_end_date"] = request.actual_end_date.isoformat()
            if request.estimated_hours is not None:
                update_data["estimated_hours"] = request.estimated_hours
            if request.actual_hours is not None:
                update_data["actual_hours"] = request.actual_hours
            if request.progress_rate is not None:
                update_data["progress_rate"] = request.progress_rate
            if request.priority is not None:
                update_data["priority"] = request.priority
            if request.status is not None:
                update_data["status"] = request.status
            if request.category is not None:
                update_data["category"] = request.category
            if request.is_milestone is not None:
                update_data["is_milestone"] = request.is_milestone
            if request.sort_order is not None:
                update_data["sort_order"] = request.sort_order
            
            response = await client.put(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                task = response.json()
                return StandardResponse.success_response({
                    "task": task,
                    "message": "タスクが更新されました"
                })
            else:
                error_detail = response.json().get("detail", "タスクの更新に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"タスクの更新中にエラーが発生しました: {str(e)}", 500)

@router.get("/delete")
async def delete_task_simple_get(task_id: int):
    """タスク削除（シンプル）- GETメソッド（互換性維持）"""
    try:
        # 永続化ストアから削除
        success = data_store.delete_task(task_id)
        if success:
            return {"message": "タスクが削除されました"}
        else:
            return {"error": "タスクが見つかりません"}
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.delete("/{task_id}")
async def delete_task_simple(task_id: int = Path(..., description="タスクID")):
    """タスク削除（シンプル）- DELETEメソッド"""
    try:
        # 永続化ストアから削除
        success = data_store.delete_task(task_id)
        if success:
            return {"message": "タスクが削除されました"}
        else:
            return {"error": "タスクが見つかりません"}
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.post("/assign/{task_id}")
async def assign_task(
    task_id: int = Path(..., description="タスクID"),
    request: TaskAssignRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク担当者割り当て"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            assignment_data = {
                "user_id": request.user_id
            }
            
            response = await client.post(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}/assignments",
                headers=headers,
                json=assignment_data
            )
            
            if response.status_code == 200:
                assignment = response.json()
                return StandardResponse.success_response({
                    "assignment": assignment,
                    "message": "担当者が割り当てられました"
                })
            else:
                error_detail = response.json().get("detail", "担当者の割り当てに失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"担当者の割り当て中にエラーが発生しました: {str(e)}", 500)

@router.post("/unassign/{task_id}/{user_id}")
async def unassign_task(
    task_id: int = Path(..., description="タスクID"),
    user_id: int = Path(..., description="ユーザーID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク担当者解除"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.delete(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}/assignments/{user_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                return StandardResponse.success_response({
                    "message": "担当者の割り当てが解除されました"
                })
            else:
                error_detail = response.json().get("detail", "担当者の解除に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"担当者の解除中にエラーが発生しました: {str(e)}", 500)

@router.post("/dependencies")
async def create_task_dependency(request: TaskDependencyCreateRequest):
    """タスク依存関係作成（JSONファイルベース）"""
    try:
        # JSONファイルベースデータストアに依存関係を追加
        new_dependency = data_store.create_dependency(
            predecessor_id=request.predecessor_id,
            successor_id=request.successor_id,
            dependency_type=request.dependency_type,
            lag_days=request.lag_days
        )
        
        return StandardResponse.success_response({
            "dependency": new_dependency,
            "message": "タスク依存関係が作成されました"
        })
                
    except Exception as e:
        return StandardResponse.error_response(f"依存関係の作成中にエラーが発生しました: {str(e)}", 500)

@router.delete("/dependencies/{dependency_id}")
async def delete_task_dependency(dependency_id: int):
    """タスク依存関係削除（JSONファイルベース）"""
    try:
        # JSONファイルベースデータストアから依存関係を削除
        success = data_store.delete_dependency(dependency_id)
        
        if success:
            return StandardResponse.success_response({
                "message": f"依存関係 {dependency_id} が削除されました"
            })
        else:
            return StandardResponse.error_response(f"依存関係 {dependency_id} が見つかりません", 404)
                
    except Exception as e:
        return StandardResponse.error_response(f"依存関係の削除中にエラーが発生しました: {str(e)}", 500)

@router.post("/comments/{task_id}")
async def get_task_comments(
    task_id: int = Path(..., description="タスクID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスクコメント一覧取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}/comments",
                headers=headers
            )
            
            if response.status_code == 200:
                comments = response.json()
                return StandardResponse.success_response({
                    "comments": comments
                })
            else:
                error_detail = response.json().get("detail", "コメント一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"コメント一覧の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/comments/add/{task_id}")
async def add_task_comment(
    task_id: int = Path(..., description="タスクID"),
    request: TaskCommentCreateRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスクコメント追加"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            comment_data = {
                "comment": request.comment
            }
            
            response = await client.post(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}/comments",
                headers=headers,
                json=comment_data
            )
            
            if response.status_code == 200:
                comment = response.json()
                return StandardResponse.success_response({
                    "comment": comment,
                    "message": "コメントが追加されました"
                })
            else:
                error_detail = response.json().get("detail", "コメントの追加に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"コメントの追加中にエラーが発生しました: {str(e)}", 500)

# ガンチャート用の追加API
class TaskHierarchyRequest(BaseModel):
    project_id: int

@router.post("/hierarchy")
async def get_task_hierarchy(
    request: TaskHierarchyRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク階層構造取得（ガンチャート用）"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/projects/{request.project_id}/hierarchy",
                headers=headers
            )
            
            if response.status_code == 200:
                hierarchy = response.json()
                return StandardResponse.success_response({
                    "hierarchy": hierarchy
                })
            else:
                error_detail = response.json().get("detail", "タスク階層の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"タスク階層の取得中にエラーが発生しました: {str(e)}", 500)

class TaskDependenciesRequest(BaseModel):
    project_id: int

@router.post("/dependencies/list")
async def get_task_dependencies_list(
    request: TaskDependenciesRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスク依存関係一覧取得（ガンチャート用）"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/projects/{request.project_id}/dependencies",
                headers=headers
            )
            
            if response.status_code == 200:
                dependencies = response.json()
                return StandardResponse.success_response({
                    "dependencies": dependencies
                })
            else:
                error_detail = response.json().get("detail", "依存関係一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"依存関係一覧の取得中にエラーが発生しました: {str(e)}", 500)

class UpdateTaskParentRequest(BaseModel):
    parent_task_id: Optional[int] = None
    level: Optional[int] = 0

@router.post("/update-parent/{task_id}")
async def update_task_parent(
    task_id: int = Path(..., description="タスクID"),
    request: UpdateTaskParentRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """タスクの親子関係更新"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            update_data = {
                "parent_task_id": request.parent_task_id,
                "level": request.level
            }
            
            response = await client.put(
                f"{settings.backend_url}/api/tasks/tasks/{task_id}/parent",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                task = response.json()
                return StandardResponse.success_response({
                    "task": task,
                    "message": "親子関係が更新されました"
                })
            else:
                error_detail = response.json().get("detail", "親子関係の更新に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"親子関係の更新中にエラーが発生しました: {str(e)}", 500)

class ValidPredecessorsRequest(BaseModel):
    task_id: int
    project_id: int

@router.post("/valid-predecessors")
async def get_valid_predecessors(
    request: ValidPredecessorsRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """有効な先行タスク一覧取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/tasks/tasks/{request.task_id}/valid-predecessors",
                headers=headers,
                params={"project_id": request.project_id}
            )
            
            if response.status_code == 200:
                predecessors = response.json()
                return StandardResponse.success_response({
                    "predecessors": predecessors
                })
            else:
                error_detail = response.json().get("detail", "有効な先行タスク一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"有効な先行タスク一覧の取得中にエラーが発生しました: {str(e)}", 500)

class CalculateProgressRequest(BaseModel):
    project_id: int

@router.post("/calculate-progress")
async def calculate_parent_progress(
    request: CalculateProgressRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """親タスクの進捗率自動計算"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.post(
                f"{settings.backend_url}/api/tasks/projects/{request.project_id}/calculate-progress",
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                return StandardResponse.success_response({
                    "result": result,
                    "message": "親タスクの進捗率が計算されました"
                })
            else:
                error_detail = response.json().get("detail", "進捗率計算に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"進捗率計算中にエラーが発生しました: {str(e)}", 500)