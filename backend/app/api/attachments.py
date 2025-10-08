from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from ..database.connection import get_db
from ..models.task import TaskAttachment
from ..schemas.task import TaskAttachmentResponse
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter()

# ファイルアップロード用のディレクトリ
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 許可するファイルタイプ
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
    'zip', 'rar', '7z'
}

# 最大ファイルサイズ (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/tasks/{task_id}/attachments", response_model=TaskAttachmentResponse)
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """タスクにファイルを添付"""
    
    # ファイルサイズチェック
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ファイルサイズが大きすぎます (最大10MB)")
    
    # ファイル拡張子チェック
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="許可されていないファイル形式です")
    
    # ユニークなファイル名を生成
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        # ファイルを保存
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # データベースに記録
        attachment = TaskAttachment(
            task_id=task_id,
            filename=file.filename,
            stored_filename=unique_filename,
            file_size=len(content),
            content_type=file.content_type,
            uploaded_by=current_user.id,
            uploaded_at=datetime.utcnow()
        )
        
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        return attachment
        
    except Exception as e:
        # エラーが発生した場合、アップロードしたファイルを削除
        if os.path.exists(file_path):
            os.remove(file_path)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"ファイルアップロードに失敗しました: {str(e)}")

@router.get("/tasks/{task_id}/attachments", response_model=List[TaskAttachmentResponse])
def get_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """タスクの添付ファイル一覧を取得"""
    attachments = db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).all()
    return attachments

@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """添付ファイルを削除"""
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="添付ファイルが見つかりません")
    
    # ファイルを物理削除
    file_path = os.path.join(UPLOAD_DIR, attachment.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # データベースから削除
    db.delete(attachment)
    db.commit()
    
    return {"message": "添付ファイルを削除しました"}

from fastapi import Response
from fastapi.responses import FileResponse

@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """添付ファイルをダウンロード"""
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="添付ファイルが見つかりません")
    
    file_path = os.path.join(UPLOAD_DIR, attachment.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    return FileResponse(
        file_path, 
        filename=attachment.filename,
        media_type=attachment.content_type
    )