from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from fastapi import HTTPException, status
from app.models.task import Task, TaskAssignment, TaskDependency, TaskComment
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskAssignmentCreate, 
    TaskDependencyCreate, TaskCommentCreate,
    ValidPredecessorTask, TaskHierarchy
)
from app.utils.exceptions import NotFoundError, ConflictError, AuthorizationError

class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_tasks(
        self, 
        project_id: int,
        user_id: int, 
        user_role: str,
        skip: int = 0, 
        limit: int = 100,
        status_filter: Optional[str] = None,
        assigned_to: Optional[int] = None
    ) -> List[Task]:
        """プロジェクトのタスク一覧取得"""
        # プロジェクトアクセス権限チェック
        self._check_project_access(project_id, user_id, user_role)
        
        query = self.db.query(Task).filter(Task.project_id == project_id)
        
        # ステータスフィルタ
        if status_filter:
            query = query.filter(Task.status == status_filter)
        
        # 担当者フィルタ
        if assigned_to:
            query = query.join(TaskAssignment).filter(TaskAssignment.user_id == assigned_to)
            
        return query.options(
            joinedload(Task.assignments)
        ).order_by(Task.sort_order, Task.id).offset(skip).limit(limit).all()

    def get_task_by_id(self, task_id: int, user_id: int, user_role: str) -> Task:
        """タスク詳細取得"""
        task = self.db.query(Task).options(
            joinedload(Task.assignments),
            joinedload(Task.subtasks),
            joinedload(Task.dependencies_as_predecessor),
            joinedload(Task.dependencies_as_successor)
        ).filter(Task.id == task_id).first()
        
        if not task:
            raise NotFoundError("タスク")
        
        # プロジェクトアクセス権限チェック
        self._check_project_access(task.project_id, user_id, user_role)
            
        return task

    def create_task(self, task_data: TaskCreate, user_id: int, user_role: str) -> Task:
        """タスク作成"""
        # プロジェクトアクセス権限チェック
        self._check_project_access(task_data.project_id, user_id, user_role)
        
        # 日付検証
        if (task_data.planned_start_date and task_data.planned_end_date and
            task_data.planned_start_date >= task_data.planned_end_date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="計画開始日は計画終了日より前である必要があります"
            )

        # 親タスク存在確認と階層レベル計算
        level = task_data.level if task_data.level is not None else 0
        if task_data.parent_task_id:
            parent_task = self.db.query(Task).filter(
                and_(
                    Task.id == task_data.parent_task_id,
                    Task.project_id == task_data.project_id
                )
            ).first()
            if not parent_task:
                raise NotFoundError("親タスク")
            
            # 階層レベル制限チェック（最大3レベル）
            if parent_task.level >= 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="サブタスクは3階層までしか作成できません"
                )
            
            # フロントエンドから送信されたlevelを優先、なければ親のレベル+1
            if task_data.level is None:
                level = parent_task.level + 1
            else:
                level = task_data.level

        # ソート順の自動設定
        max_sort_order = self.db.query(func.max(Task.sort_order)).filter(
            Task.project_id == task_data.project_id
        ).scalar() or 0

        # タスク作成
        db_task = Task(
            project_id=task_data.project_id,
            parent_task_id=task_data.parent_task_id,
            level=level,
            name=task_data.name,
            description=task_data.description,
            planned_start_date=task_data.planned_start_date,
            planned_end_date=task_data.planned_end_date,
            estimated_hours=task_data.estimated_hours,
            priority=task_data.priority,
            category=task_data.category,
            is_milestone=task_data.is_milestone,
            sort_order=max_sort_order + 1
        )
        
        self.db.add(db_task)
        self.db.commit()
        self.db.refresh(db_task)
        return db_task

    def update_task(
        self, 
        task_id: int, 
        task_data: TaskUpdate, 
        user_id: int, 
        user_role: str
    ) -> Task:
        """タスク更新"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        # 更新権限チェック（プロジェクトメンバーなら更新可能）
        if not self._can_modify_project(task.project_id, user_id, user_role):
            raise AuthorizationError("タスクを更新する権限がありません")

        # 更新データ適用
        update_data = task_data.model_dump(exclude_unset=True)
        
        # 日付検証
        planned_start = update_data.get('planned_start_date', task.planned_start_date)
        planned_end = update_data.get('planned_end_date', task.planned_end_date)
        if (planned_start and planned_end and planned_start >= planned_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="計画開始日は計画終了日より前である必要があります"
            )
        
        actual_start = update_data.get('actual_start_date', task.actual_start_date)
        actual_end = update_data.get('actual_end_date', task.actual_end_date)
        if (actual_start and actual_end and actual_start >= actual_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="実際開始日は実際終了日より前である必要があります"
            )

        # 進捗率検証
        progress_rate = update_data.get('progress_rate', task.progress_rate)
        if progress_rate < 0 or progress_rate > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="進捗率は0-100の範囲で入力してください"
            )

        for field, value in update_data.items():
            setattr(task, field, value)

        # 進捗率が更新された場合、親タスクの進捗率を自動更新
        if 'progress_rate' in update_data:
            self._update_parent_progress(task)

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: int, user_id: int, user_role: str) -> bool:
        """タスク削除"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        # 削除権限チェック
        if not self._can_modify_project(task.project_id, user_id, user_role):
            raise AuthorizationError("タスクを削除する権限がありません")

        # 子タスクがある場合は削除不可
        subtasks_count = self.db.query(Task).filter(Task.parent_task_id == task_id).count()
        if subtasks_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="子タスクがあるため削除できません"
            )

        self.db.delete(task)
        self.db.commit()
        return True

    def assign_task(
        self, 
        task_id: int, 
        assignment_data: TaskAssignmentCreate, 
        user_id: int, 
        user_role: str
    ) -> TaskAssignment:
        """タスク担当者割り当て"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        # 割り当て権限チェック
        if not self._can_modify_project(task.project_id, user_id, user_role):
            raise AuthorizationError("タスクを割り当てる権限がありません")

        # ユーザー存在確認
        user_exists = self.db.query(User).filter(User.id == assignment_data.user_id).first()
        if not user_exists:
            raise NotFoundError("ユーザー")

        # プロジェクトメンバー確認
        is_member = self.db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == task.project_id,
                ProjectMember.user_id == assignment_data.user_id
            )
        ).first()
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="プロジェクトメンバーではないユーザーには割り当てできません"
            )

        # 重複チェック
        existing_assignment = self.db.query(TaskAssignment).filter(
            and_(
                TaskAssignment.task_id == task_id,
                TaskAssignment.user_id == assignment_data.user_id
            )
        ).first()
        
        if existing_assignment:
            raise ConflictError("ユーザーは既にこのタスクに割り当てられています")

        # 割り当て作成
        db_assignment = TaskAssignment(
            task_id=task_id,
            user_id=assignment_data.user_id
        )
        
        self.db.add(db_assignment)
        self.db.commit()
        self.db.refresh(db_assignment)
        return db_assignment

    def unassign_task(
        self, 
        task_id: int, 
        assignment_user_id: int, 
        user_id: int, 
        user_role: str
    ) -> bool:
        """タスク担当者解除"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        # 解除権限チェック
        if not self._can_modify_project(task.project_id, user_id, user_role):
            raise AuthorizationError("タスクの割り当てを解除する権限がありません")

        assignment = self.db.query(TaskAssignment).filter(
            and_(
                TaskAssignment.task_id == task_id,
                TaskAssignment.user_id == assignment_user_id
            )
        ).first()
        
        if not assignment:
            raise NotFoundError("タスク割り当て")

        self.db.delete(assignment)
        self.db.commit()
        return True

    def create_task_dependency(
        self, 
        dependency_data: TaskDependencyCreate, 
        user_id: int, 
        user_role: str
    ) -> TaskDependency:
        """タスク依存関係作成"""
        # 前タスクと後タスクの存在確認
        predecessor = self.get_task_by_id(dependency_data.predecessor_id, user_id, user_role)
        successor = self.get_task_by_id(dependency_data.successor_id, user_id, user_role)
        
        # 同じプロジェクトか確認
        if predecessor.project_id != successor.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="異なるプロジェクトのタスク間では依存関係を作成できません"
            )
        
        # 自己依存チェック
        if dependency_data.predecessor_id == dependency_data.successor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="タスクは自分自身に依存できません"
            )

        # 重複チェック
        existing_dependency = self.db.query(TaskDependency).filter(
            and_(
                TaskDependency.predecessor_id == dependency_data.predecessor_id,
                TaskDependency.successor_id == dependency_data.successor_id
            )
        ).first()
        
        if existing_dependency:
            raise ConflictError("この依存関係は既に存在します")

        # 循環依存チェック（簡易版）
        if self._creates_circular_dependency(dependency_data.predecessor_id, dependency_data.successor_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="循環依存が発生するため作成できません"
            )

        # 依存関係作成
        db_dependency = TaskDependency(
            predecessor_id=dependency_data.predecessor_id,
            successor_id=dependency_data.successor_id,
            dependency_type=dependency_data.dependency_type,
            lag_days=dependency_data.lag_days
        )
        
        self.db.add(db_dependency)
        self.db.commit()
        self.db.refresh(db_dependency)
        return db_dependency

    def add_task_comment(
        self, 
        task_id: int, 
        comment_data: TaskCommentCreate, 
        user_id: int, 
        user_role: str
    ) -> TaskComment:
        """タスクコメント追加"""
        task = self.get_task_by_id(task_id, user_id, user_role)

        # コメント作成
        db_comment = TaskComment(
            task_id=task_id,
            user_id=user_id,
            comment=comment_data.comment
        )
        
        self.db.add(db_comment)
        self.db.commit()
        self.db.refresh(db_comment)
        return db_comment

    def get_task_comments(self, task_id: int, user_id: int, user_role: str) -> List[TaskComment]:
        """タスクコメント一覧取得"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        return self.db.query(TaskComment).options(
            joinedload(TaskComment.user)
        ).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.desc()).all()
    
    def get_task_hierarchy(
        self, 
        project_id: int, 
        user_id: int, 
        user_role: str
    ) -> List[TaskHierarchy]:
        """プロジェクトのタスク階層取得"""
        self._check_project_access(project_id, user_id, user_role)
        
        # ルートタスク（level=0）を取得
        root_tasks = self.db.query(Task).filter(
            and_(Task.project_id == project_id, Task.level == 0)
        ).order_by(Task.sort_order, Task.id).all()
        
        result = []
        for root_task in root_tasks:
            hierarchy = self._build_task_hierarchy(root_task)
            result.append(hierarchy)
        
        return result
    
    def _build_task_hierarchy(self, task: Task) -> TaskHierarchy:
        """タスク階層を再帰的に構築"""
        subtasks = []
        for subtask in task.subtasks:
            subtask_hierarchy = self._build_task_hierarchy(subtask)
            subtasks.append(subtask_hierarchy)
        
        return TaskHierarchy(
            id=task.id,
            name=task.name,
            level=task.level,
            parent_task_id=task.parent_task_id,
            status=task.status,
            progress_rate=task.progress_rate,
            subtasks=subtasks
        )
    
    def get_valid_predecessors(
        self, 
        task_id: int, 
        user_id: int, 
        user_role: str
    ) -> List[ValidPredecessorTask]:
        """同じグループ内での有効な先行タスク一覧を取得"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        valid_predecessors = []
        
        if task.level == 0:
            # ルートタスクの場合、同じプロジェクト内の他のルートタスクが対象
            root_tasks = self.db.query(Task).filter(
                and_(
                    Task.project_id == task.project_id,
                    Task.level == 0,
                    Task.id != task.id
                )
            ).all()
            valid_predecessors = root_tasks
        else:
            # サブタスクの場合、同じ親を持つタスクと上位階層のタスクが対象
            if task.parent_task:
                # 同じ親を持つ兄弟タスク
                siblings = self.db.query(Task).filter(
                    and_(
                        Task.parent_task_id == task.parent_task_id,
                        Task.id != task.id
                    )
                ).all()
                valid_predecessors.extend(siblings)
                
                # 親タスクとその祖先
                current_parent = task.parent_task
                while current_parent:
                    valid_predecessors.append(current_parent)
                    current_parent = current_parent.parent_task
        
        # ValidPredecessorTaskスキーマに変換
        result = []
        for predecessor in valid_predecessors:
            result.append(ValidPredecessorTask(
                id=predecessor.id,
                name=predecessor.name,
                level=predecessor.level,
                parent_task_id=predecessor.parent_task_id
            ))
        
        return result

    def _check_project_access(self, project_id: int, user_id: int, user_role: str):
        """プロジェクトアクセス権限チェック"""
        if user_role == "admin":
            return True
            
        project = self.db.query(Project).options(
            joinedload(Project.members)
        ).filter(Project.id == project_id).first()
        
        if not project:
            raise NotFoundError("プロジェクト")
            
        # プロジェクトメンバーかチェック
        is_member = any(member.user_id == user_id for member in project.members)
        if not is_member:
            raise AuthorizationError("このプロジェクトにアクセスする権限がありません")

    def _can_modify_project(self, project_id: int, user_id: int, user_role: str) -> bool:
        """プロジェクト変更権限チェック"""
        if user_role == "admin":
            return True
            
        project = self.db.query(Project).options(
            joinedload(Project.members)
        ).filter(Project.id == project_id).first()
        
        if not project:
            return False
            
        # プロジェクト作成者またはマネージャーかチェック
        if project.created_by == user_id:
            return True
            
        # マネージャー権限チェック
        member = next((m for m in project.members if m.user_id == user_id), None)
        return member and member.role == "manager"

    def _creates_circular_dependency(self, predecessor_id: int, successor_id: int) -> bool:
        """循環依存チェック（簡易版）"""
        # successor_idから辿ってpredecessor_idに到達するかチェック
        visited = set()
        stack = [successor_id]
        
        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            visited.add(current_id)
            
            if current_id == predecessor_id:
                return True
                
            # current_idが依存しているタスクを取得
            dependencies = self.db.query(TaskDependency).filter(
                TaskDependency.successor_id == current_id
            ).all()
            
            for dep in dependencies:
                if dep.predecessor_id not in visited:
                    stack.append(dep.predecessor_id)
        
        return False

    def _update_parent_progress(self, task: Task):
        """親タスクの進捗率を子タスクの平均から自動算出・更新"""
        if not task.parent_task_id:
            return  # ルートタスクの場合は何もしない
        
        parent_task = task.parent_task
        if not parent_task:
            return
        
        # 親タスクの全子タスクの進捗率を取得
        subtasks = self.db.query(Task).filter(
            Task.parent_task_id == parent_task.id
        ).all()
        
        if not subtasks:
            return
        
        # 子タスクの進捗率の平均を計算
        total_progress = sum(subtask.progress_rate for subtask in subtasks)
        average_progress = int(total_progress / len(subtasks))
        
        # 親タスクの進捗率を更新
        parent_task.progress_rate = average_progress
        
        # さらに上位の親タスクも再帰的に更新
        self._update_parent_progress(parent_task)

    def get_task_hierarchy(self, project_id: int, user_id: int, user_role: str) -> List[TaskHierarchy]:
        """プロジェクトのタスク階層構造取得（ガンチャート用）"""
        # プロジェクトアクセス権限チェック
        self._check_project_access(project_id, user_id, user_role)
        
        # 全てのタスクを取得
        tasks = self.db.query(Task).filter(Task.project_id == project_id).order_by(
            Task.level, Task.sort_order, Task.id
        ).all()
        
        # 階層構造を構築
        task_dict = {task.id: task for task in tasks}
        hierarchy = []
        
        def build_hierarchy(parent_id: Optional[int] = None, level: int = 0) -> List[TaskHierarchy]:
            result = []
            parent_tasks = [t for t in tasks if t.parent_task_id == parent_id and t.level == level]
            
            for task in parent_tasks:
                task_hierarchy = TaskHierarchy(
                    id=task.id,
                    name=task.name,
                    level=task.level,
                    parent_task_id=task.parent_task_id,
                    status=task.status,
                    progress_rate=task.progress_rate,
                    subtasks=build_hierarchy(task.id, level + 1)
                )
                result.append(task_hierarchy)
            
            return result
        
        return build_hierarchy()

    def get_project_dependencies(self, project_id: int, user_id: int, user_role: str) -> List[TaskDependency]:
        """プロジェクトのタスク依存関係一覧取得（ガンチャート用）"""
        # プロジェクトアクセス権限チェック
        self._check_project_access(project_id, user_id, user_role)
        
        # プロジェクト内のタスク依存関係を取得
        dependencies = self.db.query(TaskDependency).join(
            Task, TaskDependency.predecessor_id == Task.id
        ).filter(Task.project_id == project_id).all()
        
        return dependencies

    def update_task_parent(
        self, 
        task_id: int, 
        parent_task_id: Optional[int], 
        level: int, 
        user_id: int, 
        user_role: str
    ) -> Task:
        """タスクの親子関係更新"""
        task = self.get_task_by_id(task_id, user_id, user_role)
        
        # 親タスクの循環参照チェック
        if parent_task_id:
            if self._check_parent_cycle(task_id, parent_task_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="親子関係で循環参照が発生します"
                )
        
        # 更新
        task.parent_task_id = parent_task_id
        task.level = level
        
        self.db.commit()
        self.db.refresh(task)
        
        return task

    def calculate_parent_progress(self, project_id: int, user_id: int, user_role: str) -> List[Task]:
        """親タスクの進捗率自動計算"""
        # プロジェクトアクセス権限チェック
        self._check_project_access(project_id, user_id, user_role)
        
        updated_tasks = []
        
        # 親タスクを持つタスク（レベル1以上）を取得してレベル順にソート
        parent_tasks = self.db.query(Task).filter(
            and_(Task.project_id == project_id, Task.level > 0)
        ).order_by(Task.level.desc()).all()  # 下位レベルから更新
        
        for parent_task in parent_tasks:
            # 子タスクの進捗率を計算
            subtasks = self.db.query(Task).filter(
                Task.parent_task_id == parent_task.id
            ).all()
            
            if subtasks:
                # 子タスクの進捗率の平均を計算
                total_progress = sum(subtask.progress_rate for subtask in subtasks)
                average_progress = int(total_progress / len(subtasks))
                
                # 進捗率が変更された場合のみ更新
                if parent_task.progress_rate != average_progress:
                    parent_task.progress_rate = average_progress
                    updated_tasks.append(parent_task)
        
        self.db.commit()
        return updated_tasks

    def _check_parent_cycle(self, task_id: int, parent_task_id: int) -> bool:
        """親子関係の循環参照チェック"""
        visited = set()
        current_id = parent_task_id
        
        while current_id:
            if current_id in visited:
                return True
            if current_id == task_id:
                return True
                
            visited.add(current_id)
            
            # 親タスクを取得
            parent_task = self.db.query(Task).filter(Task.id == current_id).first()
            if not parent_task:
                break
                
            current_id = parent_task.parent_task_id
        
        return False