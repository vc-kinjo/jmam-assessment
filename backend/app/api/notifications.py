from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database.connection import get_db
from ..models.user import User
from ..models.notification import Notification, UserNotificationSettings
from ..schemas.notification import (
    NotificationResponse, NotificationCreate, 
    UserNotificationSettingsResponse, UserNotificationSettingsUpdate
)
from ..services.notification_service import notification_service
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """現在のユーザーの通知一覧を取得"""
    notifications = notification_service.get_user_notifications(
        db, current_user.id, limit, unread_only
    )
    return notifications

@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """通知を既読にする"""
    success = notification_service.mark_notification_as_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    return {"message": "通知を既読にしました"}

@router.put("/notifications/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """すべての通知を既読にする"""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).all()
    
    for notification in notifications:
        notification.is_read = True
        from datetime import datetime
        notification.read_at = datetime.utcnow()
    
    db.commit()
    return {"message": f"{len(notifications)}件の通知を既読にしました"}

@router.get("/notifications/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """未読通知数を取得"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.get("/notification-settings", response_model=UserNotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ユーザーの通知設定を取得"""
    settings = notification_service.get_user_notification_settings(db, current_user.id)
    return settings

@router.put("/notification-settings", response_model=UserNotificationSettingsResponse)
def update_notification_settings(
    settings_data: UserNotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ユーザーの通知設定を更新"""
    settings = notification_service.update_user_notification_settings(
        db, current_user.id, settings_data.dict(exclude_unset=True)
    )
    return settings

@router.post("/notifications/test-email")
async def send_test_email(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """テストメールを送信"""
    background_tasks.add_task(
        notification_service.send_email_notification,
        current_user.email,
        "GunChart テストメール",
        "これはGunChartからのテストメールです。メール通知が正常に動作しています。"
    )
    return {"message": "テストメールを送信しました"}

@router.post("/notifications/check-deadlines")
async def check_deadline_alerts(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """期限アラートをチェック（管理者専用）"""
    if current_user.role_level != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    background_tasks.add_task(notification_service.check_deadline_alerts, db)
    return {"message": "期限アラートのチェックを開始しました"}

@router.post("/notifications", response_model=NotificationResponse)
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """通知を手動作成（管理者用）"""
    if current_user.role_level != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    notification = notification_service.create_notification(
        db,
        notification_data.user_id,
        notification_data.type,
        notification_data.title,
        notification_data.message,
        notification_data.project_id,
        notification_data.task_id
    )
    return notification