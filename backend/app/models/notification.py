from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # deadline_alert, task_assigned, progress_delay, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_email_sent = Column(Boolean, default=False)
    
    # Related IDs for context
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    email_sent_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
    project = relationship("Project", back_populates="notifications")
    task = relationship("Task", back_populates="notifications")

class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Email notification preferences
    email_deadline_alerts = Column(Boolean, default=True)
    email_task_assignments = Column(Boolean, default=True)
    email_progress_reports = Column(Boolean, default=True)
    email_project_updates = Column(Boolean, default=True)
    
    # Deadline alert timing
    deadline_alert_days = Column(Integer, default=3)  # Alert 3 days before deadline
    deadline_alert_day_of = Column(Boolean, default=True)  # Alert on the deadline day
    
    # Report frequency
    weekly_reports = Column(Boolean, default=False)
    monthly_reports = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notification_settings")