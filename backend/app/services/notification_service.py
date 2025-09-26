from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
from fastapi_mail import FastMail, MessageSchema, MessageType
from fastapi_mail.config import ConnectionConfig

from ..models.notification import Notification, UserNotificationSettings
from ..models.user import User
from ..models.task import Task
from ..models.project import Project
from ..database.connection import get_db

class NotificationService:
    def __init__(self):
        # メール設定（実際の使用時は環境変数から取得）
        self.mail_config = ConnectionConfig(
            MAIL_USERNAME="your-email@gmail.com",
            MAIL_PASSWORD="your-app-password",
            MAIL_FROM="your-email@gmail.com",
            MAIL_PORT=587,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_FROM_NAME="GunChart System",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
        self.fast_mail = FastMail(self.mail_config)

    def create_notification(self, db: Session, user_id: int, notification_type: str, 
                          title: str, message: str, project_id: Optional[int] = None, 
                          task_id: Optional[int] = None) -> Notification:
        """通知を作成"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            project_id=project_id,
            task_id=task_id
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def get_user_notifications(self, db: Session, user_id: int, 
                             limit: int = 20, unread_only: bool = False) -> List[Notification]:
        """ユーザーの通知一覧を取得"""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    def mark_notification_as_read(self, db: Session, notification_id: int, user_id: int) -> bool:
        """通知を既読にする"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            return True
        return False

    def get_user_notification_settings(self, db: Session, user_id: int) -> UserNotificationSettings:
        """ユーザーの通知設定を取得"""
        settings = db.query(UserNotificationSettings).filter(
            UserNotificationSettings.user_id == user_id
        ).first()
        
        if not settings:
            # デフォルト設定を作成
            settings = UserNotificationSettings(user_id=user_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return settings

    def update_user_notification_settings(self, db: Session, user_id: int, 
                                        settings_data: dict) -> UserNotificationSettings:
        """ユーザーの通知設定を更新"""
        settings = self.get_user_notification_settings(db, user_id)
        
        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        settings.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(settings)
        return settings

    async def send_email_notification(self, to_email: str, subject: str, body: str):
        """メール通知を送信"""
        try:
            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body,
                subtype=MessageType.plain
            )
            await self.fast_mail.send_message(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    async def check_deadline_alerts(self, db: Session):
        """期限アラートをチェックして通知を送信"""
        try:
            # 3日後、1日後、当日の期限を持つタスクを取得
            today = datetime.now().date()
            alert_dates = [today + timedelta(days=3), today + timedelta(days=1), today]
            
            for alert_date in alert_dates:
                tasks = db.query(Task).filter(
                    Task.planned_end_date == alert_date,
                    Task.status.in_(["not_started", "in_progress"])
                ).all()
                
                for task in tasks:
                    # タスクの担当者に通知
                    for assignment in task.assignments:
                        user = db.query(User).filter(User.id == assignment.user_id).first()
                        if not user:
                            continue
                        
                        settings = self.get_user_notification_settings(db, user.id)
                        
                        if not settings.email_deadline_alerts:
                            continue
                        
                        # 通知の重複チェック
                        existing_notification = db.query(Notification).filter(
                            Notification.user_id == user.id,
                            Notification.task_id == task.id,
                            Notification.type == "deadline_alert",
                            Notification.created_at >= datetime.now() - timedelta(days=1)
                        ).first()
                        
                        if existing_notification:
                            continue
                        
                        days_until = (alert_date - today).days
                        if days_until > 0:
                            title = f"期限アラート: {task.name} (残り{days_until}日)"
                            message = f"タスク「{task.name}」の期限まで残り{days_until}日です。"
                        else:
                            title = f"期限当日: {task.name}"
                            message = f"タスク「{task.name}」の期限は本日です。"
                        
                        # アプリ内通知を作成
                        notification = self.create_notification(
                            db, user.id, "deadline_alert", title, message,
                            project_id=task.project_id, task_id=task.id
                        )
                        
                        # メール通知を送信
                        if settings.email_deadline_alerts:
                            await self.send_email_notification(
                                user.email, title, f"{message}\n\nプロジェクト: {task.project.name if task.project else '不明'}"
                            )
                            notification.is_email_sent = True
                            notification.email_sent_at = datetime.utcnow()
                            db.commit()
                            
        except Exception as e:
            print(f"Error checking deadline alerts: {e}")

    async def send_task_assignment_notification(self, db: Session, task_id: int, user_id: int):
        """タスク割り当て通知を送信"""
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            user = db.query(User).filter(User.id == user_id).first()
            
            if not task or not user:
                return
            
            settings = self.get_user_notification_settings(db, user.id)
            
            title = f"新しいタスクが割り当てられました: {task.name}"
            message = f"タスク「{task.name}」があなたに割り当てられました。"
            
            # アプリ内通知を作成
            notification = self.create_notification(
                db, user.id, "task_assigned", title, message,
                project_id=task.project_id, task_id=task.id
            )
            
            # メール通知を送信
            if settings.email_task_assignments:
                email_body = f"{message}\n\nプロジェクト: {task.project.name if task.project else '不明'}\n期限: {task.planned_end_date if task.planned_end_date else '未設定'}"
                await self.send_email_notification(user.email, title, email_body)
                notification.is_email_sent = True
                notification.email_sent_at = datetime.utcnow()
                db.commit()
                
        except Exception as e:
            print(f"Error sending task assignment notification: {e}")

    async def send_progress_delay_notification(self, db: Session, project_id: int):
        """進捗遅れ通知を送信"""
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return
            
            # プロジェクト関係者に通知
            for member in project.members:
                user = db.query(User).filter(User.id == member.user_id).first()
                if not user:
                    continue
                
                settings = self.get_user_notification_settings(db, user.id)
                
                title = f"プロジェクト進捗遅れ: {project.name}"
                message = f"プロジェクト「{project.name}」で進捗の遅れが発生しています。"
                
                # アプリ内通知を作成
                notification = self.create_notification(
                    db, user.id, "progress_delay", title, message,
                    project_id=project.id
                )
                
                # メール通知を送信
                if settings.email_project_updates:
                    await self.send_email_notification(user.email, title, message)
                    notification.is_email_sent = True
                    notification.email_sent_at = datetime.utcnow()
                    db.commit()
                    
        except Exception as e:
            print(f"Error sending progress delay notification: {e}")

notification_service = NotificationService()