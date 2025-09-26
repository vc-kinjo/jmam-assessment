from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, Response
from ..utils.http_client import backend_client
from ..utils.session import get_session_id
from typing import List, Dict, Any
import httpx

router = APIRouter()

@router.post("/tasks/{task_id}/attachments")
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    session_id: str = Depends(get_session_id)
):
    """タスクにファイルを添付"""
    try:
        # バックエンドにファイルをアップロード
        from ..config import settings
        
        async with httpx.AsyncClient() as client:
            files = {'file': (file.filename, await file.read(), file.content_type)}
            response = await client.post(
                f"{settings.backend_url}/tasks/{task_id}/attachments",
                files=files,
                headers={'Authorization': f'Bearer {session_id}'}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}/attachments")
async def get_attachments(
    task_id: int,
    session_id: str = Depends(get_session_id)
):
    """タスクの添付ファイル一覧を取得"""
    response = await backend_client.get(
        f"/tasks/{task_id}/attachments",
        headers={'Authorization': f'Bearer {session_id}'}
    )
    return response.json() if response.status_code == 200 else {"error": response.text}

@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    session_id: str = Depends(get_session_id)
):
    """添付ファイルを削除"""
    response = await backend_client.delete(
        f"/attachments/{attachment_id}",
        headers={'Authorization': f'Bearer {session_id}'}
    )
    return response.json() if response.status_code == 200 else {"error": response.text}

@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    session_id: str = Depends(get_session_id)
):
    """添付ファイルをダウンロード"""
    try:
        # バックエンドからファイルを取得してそのまま返す
        from ..config import settings
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.backend_url}/attachments/{attachment_id}/download",
                headers={'Authorization': f'Bearer {session_id}'}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="ファイルのダウンロードに失敗しました")
            
            # ファイル情報を取得
            filename = response.headers.get('content-disposition', '').split('filename=')[-1].strip('"')
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"'
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))