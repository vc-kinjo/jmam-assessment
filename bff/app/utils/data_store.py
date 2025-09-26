"""
簡易データストア（JSONファイルベース）
"""
import json
import os
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

class SimpleDataStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.projects_file = os.path.join(data_dir, "projects.json")
        self.tasks_file = os.path.join(data_dir, "tasks.json")
        self.dependencies_file = os.path.join(data_dir, "dependencies.json")
        self.users_file = os.path.join(data_dir, "users.json")
        
        # データディレクトリを作成
        os.makedirs(data_dir, exist_ok=True)
        
        # 初期ファイルを作成（存在しない場合）
        self._init_files()
    
    def _init_files(self):
        """初期ファイルを作成"""
        if not os.path.exists(self.projects_file):
            self._save_json(self.projects_file, [])
        
        if not os.path.exists(self.tasks_file):
            # サンプルタスクデータを初期データとして作成
            sample_tasks = [
                {
                    "id": 1,
                    "project_id": 1,
                    "parent_task_id": None,
                    "level": 0,
                    "name": "プロジェクト1のタスク1",
                    "description": "サンプルタスクの説明です",
                    "status": "in_progress",
                    "priority": "high",
                    "planned_start_date": "2025-08-20",
                    "planned_end_date": "2025-09-10",
                    "actual_start_date": "2025-08-20",
                    "actual_end_date": None,
                    "progress_rate": 70,
                    "estimated_hours": 40,
                    "actual_hours": 28,
                    "assigned_users": ["admin"],
                    "category": "開発",
                    "is_milestone": False,
                    "sort_order": 1,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 4,
                    "project_id": 1,
                    "parent_task_id": 1,
                    "level": 1,
                    "name": "サブタスク1-1",
                    "description": "タスク1のサブタスクです",
                    "status": "completed",
                    "priority": "medium",
                    "planned_start_date": "2025-08-20",
                    "planned_end_date": "2025-08-25",
                    "actual_start_date": "2025-08-20",
                    "actual_end_date": "2025-08-24",
                    "progress_rate": 100,
                    "estimated_hours": 16,
                    "actual_hours": 15,
                    "assigned_users": ["admin"],
                    "category": "設計",
                    "is_milestone": False,
                    "sort_order": 2,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 5,
                    "project_id": 1,
                    "parent_task_id": 1,
                    "level": 1,
                    "name": "サブタスク1-2",
                    "description": "タスク1の別のサブタスクです",
                    "status": "in_progress",
                    "priority": "high",
                    "planned_start_date": "2025-08-26",
                    "planned_end_date": "2025-09-05",
                    "actual_start_date": "2025-08-26",
                    "actual_end_date": None,
                    "progress_rate": 40,
                    "estimated_hours": 24,
                    "actual_hours": 10,
                    "assigned_users": ["admin"],
                    "category": "実装",
                    "is_milestone": False,
                    "sort_order": 3,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 6,
                    "project_id": 1,
                    "parent_task_id": 5,
                    "level": 2,
                    "name": "サブサブタスク1-2-1",
                    "description": "さらに細かなタスクです",
                    "status": "not_started",
                    "priority": "low",
                    "planned_start_date": "2025-09-01",
                    "planned_end_date": "2025-09-03",
                    "actual_start_date": None,
                    "actual_end_date": None,
                    "progress_rate": 0,
                    "estimated_hours": 8,
                    "actual_hours": 0,
                    "assigned_users": ["user1"],
                    "category": "テスト",
                    "is_milestone": False,
                    "sort_order": 4,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 2,
                    "project_id": 1,
                    "parent_task_id": None,
                    "level": 0,
                    "name": "プロジェクト1のタスク2", 
                    "description": "もう一つのサンプルタスクです",
                    "status": "not_started",
                    "priority": "medium",
                    "planned_start_date": "2025-09-11",
                    "planned_end_date": "2025-09-25",
                    "actual_start_date": None,
                    "actual_end_date": None,
                    "progress_rate": 0,
                    "estimated_hours": 24,
                    "actual_hours": 0,
                    "assigned_users": ["user1"],
                    "category": "テスト",
                    "is_milestone": False,
                    "sort_order": 5,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 3,
                    "project_id": 1,
                    "parent_task_id": None,
                    "level": 0,
                    "name": "プロジェクト1のマイルストーン",
                    "description": "重要なマイルストーンです",
                    "status": "not_started",
                    "priority": "high",
                    "planned_start_date": "2025-09-26",
                    "planned_end_date": "2025-09-26",
                    "actual_start_date": None,
                    "actual_end_date": None,
                    "progress_rate": 0,
                    "estimated_hours": 0,
                    "actual_hours": 0,
                    "assigned_users": ["admin"],
                    "category": "マイルストーン",
                    "is_milestone": True,
                    "sort_order": 6,
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-27T00:00:00Z"
                }
            ]
            self._save_json(self.tasks_file, sample_tasks)
        
        if not os.path.exists(self.dependencies_file):
            # サンプル依存関係データを初期データとして作成
            sample_dependencies = [
                {
                    "id": 1,
                    "predecessor_id": 1,
                    "successor_id": 2,
                    "dependency_type": "finish_to_start",
                    "lag_days": 0,
                    "created_at": "2025-08-27T00:00:00Z"
                },
                {
                    "id": 2,
                    "predecessor_id": 2,
                    "successor_id": 3,
                    "dependency_type": "finish_to_start",
                    "lag_days": 1,
                    "created_at": "2025-08-27T00:00:00Z"
                }
            ]
            self._save_json(self.dependencies_file, sample_dependencies)
        
        if not os.path.exists(self.users_file):
            # サンプルユーザーデータを初期データとして作成
            sample_users = [
                {
                    "id": 1,
                    "username": "admin",
                    "email": "admin@gunchart.com",
                    "full_name": "管理者",
                    "furigana": "カンリシャ",
                    "phone_number": "090-1234-5678",
                    "company": "GunChart Corp",
                    "department": "IT部",
                    "is_active": True,
                    "role": "admin",
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-20T00:00:00Z"
                },
                {
                    "id": 2,
                    "username": "user1",
                    "email": "user1@gunchart.com",
                    "full_name": "テストユーザー1",
                    "furigana": "テストユーザーイチ",
                    "phone_number": "090-9876-5432",
                    "company": "GunChart Corp",
                    "department": "開発部",
                    "is_active": True,
                    "role": "user",
                    "created_at": "2025-08-20T00:00:00Z",
                    "updated_at": "2025-08-20T00:00:00Z"
                },
                {
                    "id": 3,
                    "username": "manager1",
                    "email": "manager1@gunchart.com",
                    "full_name": "マネージャー1",
                    "furigana": "マネージャーイチ",
                    "phone_number": "090-1111-2222",
                    "company": "GunChart Corp",
                    "department": "プロジェクト管理部",
                    "is_active": True,
                    "role": "manager",
                    "created_at": "2025-08-21T00:00:00Z",
                    "updated_at": "2025-08-21T00:00:00Z"
                }
            ]
            self._save_json(self.users_file, sample_users)
    
    def _load_json(self, file_path: str) -> List[Dict[str, Any]]:
        """JSONファイルを読み込み"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_json(self, file_path: str, data: List[Dict[str, Any]]):
        """JSONファイルに保存"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving {file_path}: {e}")
    
    # プロジェクト関連
    def get_projects(self) -> List[Dict[str, Any]]:
        """全プロジェクトを取得"""
        return self._load_json(self.projects_file)
    
    def get_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        """特定のプロジェクトを取得"""
        projects = self.get_projects()
        for project in projects:
            if project["id"] == project_id:
                return project
        return None
    
    def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """プロジェクトを作成"""
        projects = self.get_projects()
        
        # 新しいIDを生成
        new_id = max([p["id"] for p in projects], default=0) + 1
        
        # タイムスタンプを追加
        now = datetime.utcnow().isoformat() + "Z"
        project_data.update({
            "id": new_id,
            "created_at": now,
            "updated_at": now
        })
        
        projects.append(project_data)
        self._save_json(self.projects_file, projects)
        
        return project_data
    
    def update_project(self, project_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """プロジェクトを更新"""
        projects = self.get_projects()
        
        for i, project in enumerate(projects):
            if project["id"] == project_id:
                project.update(updates)
                project["updated_at"] = datetime.utcnow().isoformat() + "Z"
                projects[i] = project
                self._save_json(self.projects_file, projects)
                return project
        
        return None
    
    def delete_project(self, project_id: int) -> bool:
        """プロジェクトを削除"""
        projects = self.get_projects()
        original_length = len(projects)
        
        projects = [p for p in projects if p["id"] != project_id]
        
        if len(projects) < original_length:
            self._save_json(self.projects_file, projects)
            return True
        
        return False
    
    # タスク関連
    def get_tasks(self, project_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """タスクを取得（プロジェクトIDでフィルタリング可能）"""
        tasks = self._load_json(self.tasks_file)
        
        if project_id is not None:
            tasks = [t for t in tasks if t["project_id"] == project_id]
        
        return tasks
    
    def get_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        """特定のタスクを取得"""
        tasks = self.get_tasks()
        for task in tasks:
            if task["id"] == task_id:
                return task
        return None
    
    def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """タスクを作成"""
        tasks = self.get_tasks()
        
        # 新しいIDを生成
        new_id = max([t["id"] for t in tasks], default=0) + 1
        
        # デフォルト値を設定
        if "level" not in task_data:
            task_data["level"] = 0
        if "parent_task_id" not in task_data:
            task_data["parent_task_id"] = None
        
        # タイムスタンプを追加
        now = datetime.utcnow().isoformat() + "Z"
        task_data.update({
            "id": new_id,
            "created_at": now,
            "updated_at": now
        })
        
        tasks.append(task_data)
        self._save_json(self.tasks_file, tasks)
        
        return task_data
    
    def update_task(self, task_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """タスクを更新"""
        tasks = self.get_tasks()
        
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                task.update(updates)
                task["updated_at"] = datetime.utcnow().isoformat() + "Z"
                tasks[i] = task
                self._save_json(self.tasks_file, tasks)
                return task
        
        return None
    
    def delete_task(self, task_id: int) -> bool:
        """タスクを削除"""
        tasks = self.get_tasks()
        original_length = len(tasks)
        
        tasks = [t for t in tasks if t["id"] != task_id]
        
        if len(tasks) < original_length:
            self._save_json(self.tasks_file, tasks)
            return True
        
        return False
    
    # 依存関係関連
    def get_dependencies(self, project_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """依存関係を取得"""
        dependencies = self._load_json(self.dependencies_file)
        
        if project_id is not None:
            # プロジェクトのタスクIDを取得
            project_task_ids = {t["id"] for t in self.get_tasks(project_id)}
            
            # プロジェクトに関連する依存関係のみをフィルタリング
            dependencies = [
                d for d in dependencies 
                if d["predecessor_id"] in project_task_ids or d["successor_id"] in project_task_ids
            ]
        
        return dependencies
    
    # ユーザー関連
    def get_users(self) -> List[Dict[str, Any]]:
        """全ユーザーを取得"""
        return self._load_json(self.users_file)
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """特定のユーザーを取得"""
        users = self.get_users()
        for user in users:
            if user["id"] == user_id:
                return user
        return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """ユーザー名でユーザーを取得"""
        users = self.get_users()
        for user in users:
            if user["username"] == username:
                return user
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """メールアドレスでユーザーを取得"""
        users = self.get_users()
        for user in users:
            if user["email"] == email:
                return user
        return None
    
    def hash_password(self, password: str) -> str:
        """パスワードをハッシュ化"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """パスワードを検証"""
        return hashlib.sha256(password.encode()).hexdigest() == hashed
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """ユーザーを作成"""
        users = self.get_users()
        
        # 新しいIDを生成
        new_id = max([u["id"] for u in users], default=0) + 1
        
        # パスワードがある場合はハッシュ化
        if "password" in user_data:
            user_data["password_hash"] = self.hash_password(user_data["password"])
            del user_data["password"]  # 生パスワードは削除
        
        # デフォルト値を設定
        if "is_active" not in user_data:
            user_data["is_active"] = True
        if "role" not in user_data:
            user_data["role"] = "user"
        
        # タイムスタンプを追加
        now = datetime.utcnow().isoformat() + "Z"
        user_data.update({
            "id": new_id,
            "created_at": now,
            "updated_at": now
        })
        
        users.append(user_data)
        self._save_json(self.users_file, users)
        
        return user_data
    
    def update_user(self, user_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """ユーザーを更新"""
        users = self.get_users()
        
        # パスワード更新がある場合はハッシュ化
        if "password" in updates:
            updates["password_hash"] = self.hash_password(updates["password"])
            del updates["password"]  # 生パスワードは削除
        
        for i, user in enumerate(users):
            if user["id"] == user_id:
                user.update(updates)
                user["updated_at"] = datetime.utcnow().isoformat() + "Z"
                users[i] = user
                self._save_json(self.users_file, users)
                return user
        
        return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """ユーザー認証"""
        user = self.get_user_by_username(username)
        if user and user.get("is_active"):
            # パスワードハッシュがある場合は検証
            if "password_hash" in user:
                if self.verify_password(password, user["password_hash"]):
                    # セキュリティのためパスワードハッシュは返さない
                    user_copy = user.copy()
                    user_copy.pop("password_hash", None)
                    return user_copy
            # 古い形式（テストユーザー用）の互換性維持
            elif username in ["admin", "user1", "test"] and password in ["admin123", "password123", "test123"]:
                user_copy = user.copy()
                user_copy.pop("password_hash", None)
                return user_copy
        return None
    
    def delete_user(self, user_id: int) -> bool:
        """ユーザーを削除"""
        users = self.get_users()
        original_length = len(users)
        
        users = [u for u in users if u["id"] != user_id]
        
        if len(users) < original_length:
            self._save_json(self.users_file, users)
            return True
        
        return False
    
    # 依存関係管理
    def create_dependency(self, predecessor_id: int, successor_id: int, 
                         dependency_type: str = "finish_to_start", lag_days: int = 0) -> Dict[str, Any]:
        """依存関係を作成"""
        dependencies = self.get_dependencies()
        
        # 新しいIDを生成
        new_id = max([d["id"] for d in dependencies], default=0) + 1
        
        # 新しい依存関係を作成
        new_dependency = {
            "id": new_id,
            "predecessor_id": predecessor_id,
            "successor_id": successor_id,
            "dependency_type": dependency_type,
            "lag_days": lag_days,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        dependencies.append(new_dependency)
        self._save_json(self.dependencies_file, dependencies)
        
        return new_dependency
    
    def delete_dependency(self, dependency_id: int) -> bool:
        """依存関係を削除"""
        dependencies = self.get_dependencies()
        original_length = len(dependencies)
        
        dependencies = [d for d in dependencies if d["id"] != dependency_id]
        
        if len(dependencies) < original_length:
            self._save_json(self.dependencies_file, dependencies)
            return True
        
        return False

# グローバルデータストアインスタンス
data_store = SimpleDataStore()