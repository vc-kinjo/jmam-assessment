from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    parent_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    level = Column(Integer, default=0)  # 0=root, 1=sub, 2=sub-sub, 3=sub-sub-sub
    name = Column(String(300), nullable=False)
    description = Column(Text)
    planned_start_date = Column(Date)
    planned_end_date = Column(Date)
    actual_start_date = Column(Date)
    actual_end_date = Column(Date)
    estimated_hours = Column(Integer, default=0)
    actual_hours = Column(Integer, default=0)
    progress_rate = Column(Integer, default=0)  # 0-100
    priority = Column(String(10), default='medium')  # 'high', 'medium', 'low'
    status = Column(String(20), default='not_started')  # 'not_started', 'in_progress', 'completed', 'on_hold'
    is_milestone = Column(Boolean, default=False)
    category = Column(String(50))
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("Task", back_populates="parent_task", cascade="all, delete-orphan")
    
    @property
    def task_group_root_id(self):
        """Get the root task ID for this task's group"""
        current = self
        while current.parent_task_id is not None:
            current = current.parent_task
        return current.id
    
    def get_siblings_and_ancestors(self):
        """Get all tasks in the same group that can be predecessors"""
        from sqlalchemy.orm import Session
        from app.database.connection import SessionLocal
        
        if self.level == 0:
            # Root tasks can have any task in same project as predecessor
            return []
            
        if self.parent_task_id is None:
            return []
            
        # Get all tasks with same parent (siblings) and all ancestor tasks
        valid_predecessors = []
        
        # Add siblings (same parent_task_id)
        siblings = self.parent_task.subtasks if self.parent_task else []
        valid_predecessors.extend([t for t in siblings if t.id != self.id])
        
        # Add parent and its ancestors
        current = self.parent_task
        while current is not None:
            valid_predecessors.append(current)
            current = current.parent_task
            
        return valid_predecessors
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")
    dependencies_as_predecessor = relationship(
        "TaskDependency", 
        foreign_keys="TaskDependency.predecessor_id", 
        back_populates="predecessor",
        cascade="all, delete-orphan"
    )
    dependencies_as_successor = relationship(
        "TaskDependency", 
        foreign_keys="TaskDependency.successor_id", 
        back_populates="successor",
        cascade="all, delete-orphan"
    )
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Task(name='{self.name}', status='{self.status}')>"

class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="assignments")
    user = relationship("User", back_populates="task_assignments")

    def __repr__(self):
        return f"<TaskAssignment(task_id={self.task_id}, user_id={self.user_id})>"

class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    predecessor_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    successor_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    dependency_type = Column(String(20), default='finish_to_start')  # 'fs', 'ss', 'ff', 'sf'
    lag_days = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    predecessor = relationship("Task", foreign_keys=[predecessor_id], back_populates="dependencies_as_predecessor")
    successor = relationship("Task", foreign_keys=[successor_id], back_populates="dependencies_as_successor")

    def __repr__(self):
        return f"<TaskDependency(predecessor_id={self.predecessor_id}, successor_id={self.successor_id})>"

class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="task_comments")

    def __repr__(self):
        return f"<TaskComment(task_id={self.task_id}, user_id={self.user_id})>"

class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="attachments")
    user = relationship("User", back_populates="task_attachments")

    def __repr__(self):
        return f"<TaskAttachment(task_id={self.task_id}, filename='{self.filename}')>"