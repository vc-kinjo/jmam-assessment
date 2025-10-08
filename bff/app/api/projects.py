from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel
from datetime import date
import httpx
from app.models.response import StandardResponse
from app.utils.session import get_current_session, get_current_user_session, UserSession
from app.config import settings
from app.utils.data_store import data_store

class SimpleProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    start_date: str
    end_date: str
    category: Optional[str] = ""

# メモリベースの簡易プロジェクトストレージ（テスト用）
memory_projects = []

router = APIRouter()

class ProjectListRequest(BaseModel):
    skip: int = 0
    limit: int = 100
    status: Optional[str] = None

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    category: Optional[str] = None

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ProjectMemberAddRequest(BaseModel):
    user_id: int
    role: str = "member"

@router.post("/list")
async def get_projects(
    request: ProjectListRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクト一覧取得"""
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
            
            response = await client.get(
                f"{settings.backend_url}/api/projects/",
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                projects = response.json()
                return StandardResponse.success_response({
                    "projects": projects
                })
            else:
                error_detail = response.json().get("detail", "プロジェクト一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクト一覧の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/create")
async def create_project(
    request: ProjectCreateRequest,
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクト作成"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            project_data = {
                "name": request.name,
                "description": request.description,
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
                "category": request.category
            }
            
            response = await client.post(
                f"{settings.backend_url}/api/projects/",
                headers=headers,
                json=project_data
            )
            
            if response.status_code == 200:
                project = response.json()
                return StandardResponse.success_response({
                    "project": project,
                    "message": "プロジェクトが作成されました"
                })
            else:
                error_detail = response.json().get("detail", "プロジェクトの作成に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクトの作成中にエラーが発生しました: {str(e)}", 500)

@router.get("")
async def get_projects_simple():
    """プロジェクト一覧取得（シンプル）"""
    try:
        # 永続化ストアからプロジェクトを取得
        projects = data_store.get_projects()
        return projects
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.get("/{project_id}")
async def get_project_by_id(project_id: int):
    """プロジェクト詳細取得"""
    try:
        # 永続化ストアからプロジェクトを取得
        project = data_store.get_project(project_id)
        if project:
            return project
        else:
            return {"error": "プロジェクトが見つかりません"}
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.post("")
async def create_project_simple(project_data: SimpleProjectCreate):
    """プロジェクト作成（シンプル）"""
    try:
        new_project = {
            "name": project_data.name,
            "description": project_data.description,
            "start_date": project_data.start_date,
            "end_date": project_data.end_date,
            "status": "active",
            "category": project_data.category,
            "created_by": 1,  # 仮の作成者ID
        }
        
        # 永続化ストアに保存
        created_project = data_store.create_project(new_project)
        return created_project
                
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}

@router.post("/summaries")
@router.get("/summaries")
async def get_project_summaries():
    """プロジェクト概要一覧取得（ダッシュボード用）"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.backend_url}/projects/summaries")
            
            if response.status_code == 200:
                summaries = response.json()
                return StandardResponse.success_response({
                    "summaries": summaries
                })
            else:
                error_detail = response.json().get("detail", "プロジェクト概要の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクト概要の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/detail/{project_id}")
async def get_project_detail(
    project_id: int = Path(..., description="プロジェクトID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクト詳細取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/projects/{project_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                project = response.json()
                return StandardResponse.success_response({
                    "project": project
                })
            else:
                error_detail = response.json().get("detail", "プロジェクト詳細の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクト詳細の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/update/{project_id}")
async def update_project(
    project_id: int = Path(..., description="プロジェクトID"),
    request: ProjectUpdateRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクト更新"""
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
            if request.start_date is not None:
                update_data["start_date"] = request.start_date.isoformat()
            if request.end_date is not None:
                update_data["end_date"] = request.end_date.isoformat()
            if request.status is not None:
                update_data["status"] = request.status
            if request.category is not None:
                update_data["category"] = request.category
            
            response = await client.put(
                f"{settings.backend_url}/api/projects/{project_id}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                project = response.json()
                return StandardResponse.success_response({
                    "project": project,
                    "message": "プロジェクトが更新されました"
                })
            else:
                error_detail = response.json().get("detail", "プロジェクトの更新に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクトの更新中にエラーが発生しました: {str(e)}", 500)

@router.post("/delete/{project_id}")
async def delete_project(
    project_id: int = Path(..., description="プロジェクトID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクト削除"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.delete(
                f"{settings.backend_url}/api/projects/{project_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                return StandardResponse.success_response({
                    "message": "プロジェクトが削除されました"
                })
            else:
                error_detail = response.json().get("detail", "プロジェクトの削除に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"プロジェクトの削除中にエラーが発生しました: {str(e)}", 500)

@router.post("/members/{project_id}")
async def get_project_members(
    project_id: int = Path(..., description="プロジェクトID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクトメンバー一覧取得"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"{settings.backend_url}/api/projects/{project_id}/members",
                headers=headers
            )
            
            if response.status_code == 200:
                members = response.json()
                return StandardResponse.success_response({
                    "members": members
                })
            else:
                error_detail = response.json().get("detail", "メンバー一覧の取得に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"メンバー一覧の取得中にエラーが発生しました: {str(e)}", 500)

@router.post("/members/add/{project_id}")
async def add_project_member(
    project_id: int = Path(..., description="プロジェクトID"),
    request: ProjectMemberAddRequest = ...,
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクトメンバー追加"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            member_data = {
                "user_id": request.user_id,
                "role": request.role
            }
            
            response = await client.post(
                f"{settings.backend_url}/api/projects/{project_id}/members",
                headers=headers,
                json=member_data
            )
            
            if response.status_code == 200:
                member = response.json()
                return StandardResponse.success_response({
                    "member": member,
                    "message": "メンバーが追加されました"
                })
            else:
                error_detail = response.json().get("detail", "メンバーの追加に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"メンバーの追加中にエラーが発生しました: {str(e)}", 500)

@router.post("/members/remove/{project_id}/{member_user_id}")
async def remove_project_member(
    project_id: int = Path(..., description="プロジェクトID"),
    member_user_id: int = Path(..., description="削除するメンバーのユーザーID"),
    user_session: UserSession = Depends(get_current_user_session)
):
    """プロジェクトメンバー削除"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {user_session.access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.delete(
                f"{settings.backend_url}/api/projects/{project_id}/members/{member_user_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                return StandardResponse.success_response({
                    "message": "メンバーが削除されました"
                })
            else:
                error_detail = response.json().get("detail", "メンバーの削除に失敗しました")
                return StandardResponse.error_response(error_detail, response.status_code)
                
    except Exception as e:
        return StandardResponse.error_response(f"メンバーの削除中にエラーが発生しました: {str(e)}", 500)