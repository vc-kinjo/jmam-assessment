from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    is_email_sent: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    email_sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserNotificationSettingsBase(BaseModel):
    email_deadline_alerts: bool = True
    email_task_assignments: bool = True
    email_progress_reports: bool = True
    email_project_updates: bool = True
    deadline_alert_days: int = 3
    deadline_alert_day_of: bool = True
    weekly_reports: bool = False
    monthly_reports: bool = True

class UserNotificationSettingsUpdate(BaseModel):
    email_deadline_alerts: Optional[bool] = None
    email_task_assignments: Optional[bool] = None
    email_progress_reports: Optional[bool] = None
    email_project_updates: Optional[bool] = None
    deadline_alert_days: Optional[int] = None
    deadline_alert_day_of: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    monthly_reports: Optional[bool] = None

class UserNotificationSettingsResponse(UserNotificationSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True