from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    estimated_hours: Optional[int] = 0
    priority: str = "medium"
    category: Optional[str] = None
    is_milestone: bool = False

class TaskCreate(TaskBase):
    project_id: int
    parent_task_id: Optional[int] = None
    level: Optional[int] = 0

class TaskUpdate(BaseModel):
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

class TaskAssignmentBase(BaseModel):
    user_id: int

class TaskAssignmentCreate(TaskAssignmentBase):
    pass

class TaskAssignment(TaskAssignmentBase):
    id: int
    task_id: int
    assigned_at: datetime
    
    class Config:
        from_attributes = True

class Task(TaskBase):
    id: int
    project_id: int
    parent_task_id: Optional[int] = None
    level: int = 0
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    actual_hours: int = 0
    progress_rate: int = 0
    status: str
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskWithAssignments(Task):
    assignments: List[TaskAssignment] = []
    subtasks: List['TaskWithAssignments'] = []

class TaskDependencyBase(BaseModel):
    predecessor_id: int
    successor_id: int
    dependency_type: str = "finish_to_start"
    lag_days: int = 0

class TaskDependencyCreate(TaskDependencyBase):
    pass

class TaskDependency(TaskDependencyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskCommentBase(BaseModel):
    comment: str

class TaskCommentCreate(TaskCommentBase):
    pass

class TaskComment(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskAttachmentBase(BaseModel):
    filename: str
    file_size: int
    content_type: Optional[str] = None

class TaskAttachmentCreate(TaskAttachmentBase):
    task_id: int
    stored_filename: str

class TaskAttachmentResponse(TaskAttachmentBase):
    id: int
    task_id: int
    stored_filename: str
    uploaded_by: int
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class TaskSummary(BaseModel):
    id: int
    name: str
    status: str
    progress_rate: int
    planned_start_date: Optional[date]
    planned_end_date: Optional[date]
    assigned_users: List[str] = []
    
    class Config:
        from_attributes = True

class ValidPredecessorTask(BaseModel):
    id: int
    name: str
    level: int
    parent_task_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class TaskHierarchy(BaseModel):
    id: int
    name: str
    level: int
    parent_task_id: Optional[int] = None
    status: str
    progress_rate: int
    subtasks: List['TaskHierarchy'] = []
    
    class Config:
        from_attributes = True

# Fix forward reference
TaskWithAssignments.model_rebuild()
TaskHierarchy.model_rebuild()