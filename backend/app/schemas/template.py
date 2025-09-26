from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ProjectTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    tags: List[str] = []

class ProjectTemplateCreate(ProjectTemplateBase):
    template_data: Dict[str, Any]
    is_public: bool = False

class ProjectTemplateFromProject(ProjectTemplateBase):
    project_id: int
    is_public: bool = False

class ProjectTemplateResponse(ProjectTemplateBase):
    id: int
    created_by: int
    is_public: bool
    usage_count: int
    template_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectFromTemplate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime

class TemplateRatingBase(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None

class TemplateRatingCreate(TemplateRatingBase):
    pass

class TemplateRatingResponse(TemplateRatingBase):
    id: int
    template_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Summary models for template listing
class ProjectTemplateSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    tags: List[str] = []
    usage_count: int
    average_rating: Optional[float] = None
    rating_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True