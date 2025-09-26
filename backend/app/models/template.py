from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ProjectTemplate(Base):
    __tablename__ = "project_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    tags = Column(JSON, nullable=True, default=[])  # List of tags for categorization
    
    # Template metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)  # Public templates can be used by all users
    usage_count = Column(Integer, default=0)  # Track how many times template is used
    
    # Template data - JSON structure containing tasks and their relationships
    template_data = Column(JSON, nullable=False)  # Contains tasks, dependencies, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by_user = relationship("User", back_populates="created_templates")
    ratings = relationship("TemplateRating", back_populates="template", cascade="all, delete-orphan")

class TemplateRating(Base):
    __tablename__ = "template_ratings"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("project_templates.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 star rating
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="ratings")
    user = relationship("User", back_populates="template_ratings")