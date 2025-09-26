from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    furigana = Column(String(100))
    phone_number = Column(String(20))
    company = Column(String(100))
    department = Column(String(100))
    role_level = Column(String(20), default='member')  # 'admin', 'manager', 'member'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships (using string references to avoid circular imports)
    created_projects = relationship("Project", back_populates="creator", lazy="select")
    project_memberships = relationship("ProjectMember", back_populates="user", lazy="select")
    task_assignments = relationship("TaskAssignment", back_populates="user", lazy="select")
    task_comments = relationship("TaskComment", back_populates="user", lazy="select")
    task_attachments = relationship("TaskAttachment", back_populates="user", lazy="select")

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"