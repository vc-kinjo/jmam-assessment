from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from ..models.template import ProjectTemplate, TemplateRating
from ..models.project import Project
from ..models.task import Task, TaskDependency
from ..models.user import User

class TemplateService:
    def create_template_from_project(self, db: Session, project_id: int, 
                                   template_name: str, description: str, 
                                   category: str, tags: List[str], 
                                   user_id: int, is_public: bool = False) -> ProjectTemplate:
        """既存のプロジェクトからテンプレートを作成"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        
        # プロジェクトのタスクと依存関係を取得
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        dependencies = db.query(TaskDependency).join(
            Task, TaskDependency.predecessor_id == Task.id
        ).filter(Task.project_id == project_id).all()
        
        # テンプレートデータを構築
        template_data = {
            "project": {
                "category": project.category,
                "estimated_duration_days": self._calculate_project_duration(tasks)
            },
            "tasks": [],
            "dependencies": []
        }
        
        # タスクIDのマッピング（実際のIDからテンプレート用の連番IDへ）
        task_id_mapping = {}
        template_task_id = 1
        
        # タスクを階層順にソート
        sorted_tasks = self._sort_tasks_by_hierarchy(tasks)
        
        for task in sorted_tasks:
            task_id_mapping[task.id] = template_task_id
            
            # 相対的な開始・終了日を計算（プロジェクト開始日からの日数）
            relative_start_day = None
            relative_end_day = None
            
            if task.planned_start_date and project.start_date:
                relative_start_day = (task.planned_start_date - project.start_date).days
            if task.planned_end_date and project.start_date:
                relative_end_day = (task.planned_end_date - project.start_date).days
            
            template_task = {
                "id": template_task_id,
                "name": task.name,
                "description": task.description,
                "relative_start_day": relative_start_day,
                "relative_end_day": relative_end_day,
                "estimated_hours": task.estimated_hours,
                "priority": task.priority,
                "category": task.category,
                "is_milestone": task.is_milestone,
                "parent_task_id": task_id_mapping.get(task.parent_task_id) if task.parent_task_id else None,
                "sort_order": task.sort_order
            }
            
            template_data["tasks"].append(template_task)
            template_task_id += 1
        
        # 依存関係をマッピング
        for dependency in dependencies:
            if dependency.predecessor_id in task_id_mapping and dependency.successor_id in task_id_mapping:
                template_dependency = {
                    "predecessor_id": task_id_mapping[dependency.predecessor_id],
                    "successor_id": task_id_mapping[dependency.successor_id],
                    "dependency_type": dependency.dependency_type,
                    "lag_days": dependency.lag_days
                }
                template_data["dependencies"].append(template_dependency)
        
        # テンプレートを保存
        template = ProjectTemplate(
            name=template_name,
            description=description,
            category=category,
            tags=tags,
            created_by=user_id,
            is_public=is_public,
            template_data=template_data
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        return template
    
    def get_templates(self, db: Session, user_id: int, category: Optional[str] = None, 
                     public_only: bool = False) -> List[ProjectTemplate]:
        """テンプレート一覧を取得"""
        query = db.query(ProjectTemplate)
        
        if public_only:
            query = query.filter(ProjectTemplate.is_public == True)
        else:
            # 公開テンプレートまたは自分が作成したテンプレート
            query = query.filter(
                (ProjectTemplate.is_public == True) | 
                (ProjectTemplate.created_by == user_id)
            )
        
        if category:
            query = query.filter(ProjectTemplate.category == category)
        
        return query.order_by(ProjectTemplate.usage_count.desc(), 
                            ProjectTemplate.created_at.desc()).all()
    
    def get_template(self, db: Session, template_id: int, user_id: int) -> Optional[ProjectTemplate]:
        """特定のテンプレートを取得"""
        template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
        
        if not template:
            return None
        
        # アクセス権限チェック
        if not template.is_public and template.created_by != user_id:
            return None
        
        return template
    
    def create_project_from_template(self, db: Session, template_id: int, 
                                   project_name: str, start_date: datetime,
                                   user_id: int, description: Optional[str] = None) -> Project:
        """テンプレートからプロジェクトを作成"""
        template = self.get_template(db, template_id, user_id)
        if not template:
            raise ValueError("Template not found or access denied")
        
        # テンプレートの使用回数を増加
        template.usage_count += 1
        db.commit()
        
        template_data = template.template_data
        
        # プロジェクトを作成
        project = Project(
            name=project_name,
            description=description or template.description,
            start_date=start_date.date(),
            category=template_data.get("project", {}).get("category"),
            created_by=user_id,
            status="active"
        )
        
        # 推定終了日を計算
        estimated_duration = template_data.get("project", {}).get("estimated_duration_days", 30)
        project.end_date = start_date.date() + datetime.timedelta(days=estimated_duration)
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # タスクを作成
        task_id_mapping = {}  # テンプレートIDから実際のタスクIDへのマッピング
        
        for template_task in template_data.get("tasks", []):
            # 実際の開始・終了日を計算
            actual_start_date = None
            actual_end_date = None
            
            if template_task.get("relative_start_day") is not None:
                actual_start_date = start_date.date() + datetime.timedelta(
                    days=template_task["relative_start_day"]
                )
            if template_task.get("relative_end_day") is not None:
                actual_end_date = start_date.date() + datetime.timedelta(
                    days=template_task["relative_end_day"]
                )
            
            task = Task(
                project_id=project.id,
                name=template_task["name"],
                description=template_task.get("description"),
                planned_start_date=actual_start_date,
                planned_end_date=actual_end_date,
                estimated_hours=template_task.get("estimated_hours", 0),
                priority=template_task.get("priority", "medium"),
                category=template_task.get("category"),
                is_milestone=template_task.get("is_milestone", False),
                sort_order=template_task.get("sort_order", 0),
                status="not_started"
            )
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            task_id_mapping[template_task["id"]] = task.id
        
        # 親子関係を設定（すべてのタスクが作成された後）
        for template_task in template_data.get("tasks", []):
            if template_task.get("parent_task_id"):
                task_id = task_id_mapping[template_task["id"]]
                parent_task_id = task_id_mapping[template_task["parent_task_id"]]
                
                task = db.query(Task).filter(Task.id == task_id).first()
                if task:
                    task.parent_task_id = parent_task_id
                    db.commit()
        
        # 依存関係を作成
        for template_dependency in template_data.get("dependencies", []):
            predecessor_id = task_id_mapping[template_dependency["predecessor_id"]]
            successor_id = task_id_mapping[template_dependency["successor_id"]]
            
            dependency = TaskDependency(
                predecessor_id=predecessor_id,
                successor_id=successor_id,
                dependency_type=template_dependency.get("dependency_type", "finish_to_start"),
                lag_days=template_dependency.get("lag_days", 0)
            )
            
            db.add(dependency)
        
        db.commit()
        return project
    
    def rate_template(self, db: Session, template_id: int, user_id: int, 
                     rating: int, comment: Optional[str] = None) -> TemplateRating:
        """テンプレートに評価をつける"""
        # 既存の評価をチェック
        existing_rating = db.query(TemplateRating).filter(
            TemplateRating.template_id == template_id,
            TemplateRating.user_id == user_id
        ).first()
        
        if existing_rating:
            existing_rating.rating = rating
            existing_rating.comment = comment
            existing_rating.updated_at = datetime.utcnow()
            db.commit()
            return existing_rating
        else:
            new_rating = TemplateRating(
                template_id=template_id,
                user_id=user_id,
                rating=rating,
                comment=comment
            )
            db.add(new_rating)
            db.commit()
            db.refresh(new_rating)
            return new_rating
    
    def get_template_categories(self, db: Session) -> List[str]:
        """利用可能なテンプレートカテゴリ一覧を取得"""
        result = db.query(ProjectTemplate.category).distinct().all()
        return [row[0] for row in result if row[0]]
    
    def _calculate_project_duration(self, tasks: List[Task]) -> int:
        """タスクリストからプロジェクトの推定期間を計算"""
        if not tasks:
            return 30  # デフォルト30日
        
        earliest_start = None
        latest_end = None
        
        for task in tasks:
            if task.planned_start_date:
                if earliest_start is None or task.planned_start_date < earliest_start:
                    earliest_start = task.planned_start_date
            
            if task.planned_end_date:
                if latest_end is None or task.planned_end_date > latest_end:
                    latest_end = task.planned_end_date
        
        if earliest_start and latest_end:
            return (latest_end - earliest_start).days
        
        return 30  # デフォルト30日
    
    def _sort_tasks_by_hierarchy(self, tasks: List[Task]) -> List[Task]:
        """タスクを階層順にソート（親タスクを先に）"""
        task_dict = {task.id: task for task in tasks}
        sorted_tasks = []
        processed_ids = set()
        
        def add_task_and_children(task):
            if task.id in processed_ids:
                return
            
            sorted_tasks.append(task)
            processed_ids.add(task.id)
            
            # 子タスクを追加
            children = [t for t in tasks if t.parent_task_id == task.id]
            children.sort(key=lambda t: t.sort_order)
            for child in children:
                add_task_and_children(child)
        
        # 親タスク（parent_task_id が None）から開始
        root_tasks = [task for task in tasks if task.parent_task_id is None]
        root_tasks.sort(key=lambda t: t.sort_order)
        
        for root_task in root_tasks:
            add_task_and_children(root_task)
        
        return sorted_tasks

template_service = TemplateService()