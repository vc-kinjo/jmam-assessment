# プロジェクト・タスク管理システム 技術設計書

## 1. システムアーキテクチャ

### 1.1 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │      BFF        │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │    │                 │
│ - React         │    │ - API Gateway   │    │ - Business      │    │ - Primary DB    │
│ - TypeScript    │    │ - Data Agg.     │    │   Logic         │    │ - File Storage  │
│ - Tailwind CSS  │    │ - Auth Proxy    │    │ - Data Access   │    │ - Backup        │
│ - Gantt Chart   │    │ - Validation    │    │ - External API  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 技術スタック詳細

#### 1.2.1 フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript 5.0+
- **UI**: React 18, Tailwind CSS 3.0
- **状態管理**: Zustand
- **ガントチャート**: dhtmlx-gantt または Frappe Gantt
- **フォーム管理**: React Hook Form + Zod
- **HTTP通信**: Axios
- **日付処理**: date-fns
- **ファイルアップロード**: react-dropzone
- **通知**: react-hot-toast

#### 1.2.2 BFF (Backend for Frontend)
- **フレームワーク**: FastAPI 0.104+
- **言語**: Python 3.11+
- **認証**: JWT + HTTPOnly Cookies
- **バリデーション**: Pydantic v2
- **HTTP Client**: httpx
- **キャッシュ**: Redis
- **セッション管理**: Redis Session Store

#### 1.2.3 バックエンド
- **フレームワーク**: FastAPI 0.104+
- **言語**: Python 3.11+
- **ORM**: SQLAlchemy 2.0 + Alembic
- **非同期処理**: Celery + Redis
- **ファイル処理**: python-multipart
- **PDF生成**: ReportLab
- **Excel生成**: openpyxl
- **メール送信**: SMTP (smtplib)

#### 1.2.4 データベース・インフラ
- **データベース**: PostgreSQL 15+
- **キャッシュ**: Redis 7.0+
- **ファイルストレージ**: Local Storage (将来的にS3対応)
- **コンテナ**: Docker + Docker Compose

## 2. API設計

### 2.1 BFF API仕様

#### 2.1.1 エンドポイント構造
```
POST /api/v1/{resource}/{action}
```

#### 2.1.2 リクエスト・レスポンス形式

**統一リクエスト形式**:
```typescript
interface APIRequest<T = any> {
  data: T;
  metadata?: {
    requestId: string;
    timestamp: string;
    userId?: string;
  };
}
```

**統一レスポンス形式**:
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    totalCount?: number;
    hasMore?: boolean;
  };
}
```

#### 2.1.3 主要APIエンドポイント

**認証関連**:
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/verify
```

**ユーザー管理**:
```
POST /api/v1/users/list
POST /api/v1/users/create
POST /api/v1/users/update
POST /api/v1/users/delete
POST /api/v1/users/profile
```

**プロジェクト管理**:
```
POST /api/v1/projects/list
POST /api/v1/projects/create
POST /api/v1/projects/update
POST /api/v1/projects/delete
POST /api/v1/projects/members
POST /api/v1/projects/dashboard
```

**タスク管理**:
```
POST /api/v1/tasks/list
POST /api/v1/tasks/create
POST /api/v1/tasks/update
POST /api/v1/tasks/delete
POST /api/v1/tasks/dependencies
POST /api/v1/tasks/gantt
```

**ファイル管理**:
```
POST /api/v1/files/upload
POST /api/v1/files/download
POST /api/v1/files/delete
```

**レポート・通知**:
```
POST /api/v1/reports/generate
POST /api/v1/notifications/list
POST /api/v1/notifications/mark-read
```

### 2.2 バックエンドAPI設計

#### 2.2.1 マイクロサービス分割
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │ Project Service │    │  Task Service   │
│                 │    │                 │    │                 │
│ - Authentication│    │ - Project CRUD  │    │ - Task CRUD     │
│ - User CRUD     │    │ - Member Mgmt   │    │ - Dependencies  │
│ - Permissions   │    │ - Templates     │    │ - Gantt Data    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  File Service   │    │ Report Service  │    │Notification Svc │
│                 │    │                 │    │                 │
│ - File Upload   │    │ - PDF Generate  │    │ - Email Alerts  │
│ - File Storage  │    │ - Excel Export  │    │ - In-app Notify │
│ - File Metadata │    │ - Progress Calc │    │ - Settings      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 3. データベース設計

### 3.1 ER図

```mermaid
erDiagram
    Users {
        uuid id PK
        string username UK
        string password_hash
        string full_name
        string furigana
        string email UK
        string phone
        string company
        string department
        enum role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    Projects {
        uuid id PK
        string name
        text description
        date start_date
        date end_date
        enum status
        string category
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    ProjectMembers {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        enum role
        timestamp joined_at
    }

    Tasks {
        uuid id PK
        uuid project_id FK
        uuid parent_task_id FK
        string name
        text description
        date planned_start_date
        date planned_end_date
        date actual_start_date
        date actual_end_date
        decimal planned_hours
        decimal actual_hours
        integer progress_percentage
        enum priority
        enum status
        boolean is_milestone
        uuid category_id FK
        timestamp created_at
        timestamp updated_at
    }

    TaskAssignments {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        enum role
        timestamp assigned_at
    }

    TaskDependencies {
        uuid id PK
        uuid predecessor_id FK
        uuid successor_id FK
        enum dependency_type
        integer lag_days
    }

    TaskCategories {
        uuid id PK
        uuid project_id FK
        string name
        string color
        text description
    }

    TaskComments {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        text content
        timestamp created_at
    }

    TaskAttachments {
        uuid id PK
        uuid task_id FK
        string filename
        string file_path
        integer file_size
        string mime_type
        uuid uploaded_by FK
        timestamp uploaded_at
    }

    ProjectTemplates {
        uuid id PK
        string name
        string category
        text description
        json task_structure
        uuid created_by FK
        timestamp created_at
    }

    Notifications {
        uuid id PK
        uuid user_id FK
        enum type
        string title
        text content
        json metadata
        boolean is_read
        timestamp created_at
    }

    Users ||--o{ ProjectMembers : "user_id"
    Users ||--o{ TaskAssignments : "user_id"
    Users ||--o{ TaskComments : "user_id"
    Users ||--o{ TaskAttachments : "uploaded_by"
    Users ||--o{ Notifications : "user_id"
    
    Projects ||--o{ ProjectMembers : "project_id"
    Projects ||--o{ Tasks : "project_id"
    Projects ||--o{ TaskCategories : "project_id"
    
    Tasks ||--o{ TaskAssignments : "task_id"
    Tasks ||--o{ TaskDependencies : "predecessor_id"
    Tasks ||--o{ TaskDependencies : "successor_id"
    Tasks ||--o{ TaskComments : "task_id"
    Tasks ||--o{ TaskAttachments : "task_id"
    Tasks ||--o{ Tasks : "parent_task_id"
    
    TaskCategories ||--o{ Tasks : "category_id"
```

### 3.2 主要テーブル詳細

#### 3.2.1 Users（ユーザー）
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    furigana VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(100),
    department VARCHAR(100),
    role user_role NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
```

#### 3.2.2 Tasks（タスク）
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    planned_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'not_started',
    is_milestone BOOLEAN DEFAULT false,
    category_id UUID REFERENCES task_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold');
```

### 3.3 インデックス戦略

```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_date ON tasks(planned_start_date, planned_end_date);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_dependencies_predecessor ON task_dependencies(predecessor_id);
CREATE INDEX idx_task_dependencies_successor ON task_dependencies(successor_id);
```

## 4. フロントエンド設計

### 4.1 プロジェクト構造

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 認証が必要なページ
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   └── settings/
│   │   ├── login/             # ログインページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── page.tsx           # ホームページ
│   ├── components/            # 再利用可能コンポーネント
│   │   ├── ui/               # 基本UIコンポーネント
│   │   ├── forms/            # フォームコンポーネント
│   │   ├── charts/           # チャート関連
│   │   └── layout/           # レイアウトコンポーネント
│   ├── hooks/                # カスタムフック
│   ├── services/             # API通信
│   ├── store/                # 状態管理
│   ├── types/                # TypeScript型定義
│   ├── utils/                # ユーティリティ関数
│   └── styles/               # グローバルスタイル
├── public/                   # 静的ファイル
└── package.json
```

### 4.2 状態管理設計

#### 4.2.1 Zustand Store構成

```typescript
// store/auth.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// store/projects.ts
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  createProject: (data: CreateProjectData) => Promise<void>;
}

// store/tasks.ts
interface TaskState {
  tasks: Task[];
  ganttData: GanttTask[];
  selectedTask: Task | null;
  filters: TaskFilters;
  fetchTasks: (projectId: string) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<void>;
}
```

### 4.3 ガントチャート実装

#### 4.3.1 ライブラリ選定
**選択**: dhtmlx-gantt (商用ライセンス) または Frappe Gantt (オープンソース)

**理由**:
- 豊富な機能（ドラッグ&ドロップ、依存関係、イナズマ線）
- カスタマイズ性
- TypeScript対応

#### 4.3.2 ガントチャートコンポーネント設計

```typescript
interface GanttChartProps {
  tasks: GanttTask[];
  onTaskUpdate: (task: GanttTask) => void;
  onDependencyCreate: (link: GanttLink) => void;
  showLightningLine: boolean;
  baselineDate: Date;
}

interface GanttTask {
  id: string;
  text: string;
  start_date: Date;
  end_date: Date;
  duration: number;
  progress: number;
  parent?: string;
  type: 'task' | 'milestone' | 'project';
  priority: 'high' | 'medium' | 'low';
  assignees: string[];
}

interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
}
```

## 5. バックエンド設計

### 5.1 プロジェクト構造

```
backend/
├── app/
│   ├── api/                   # APIルート
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   └── reports.py
│   │   └── dependencies.py
│   ├── core/                  # 核となる設定
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/                # SQLAlchemyモデル
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── task.py
│   │   └── __init__.py
│   ├── schemas/               # Pydanticスキーマ
│   │   ├── user.py
│   │   ├── project.py
│   │   └── task.py
│   ├── services/              # ビジネスロジック
│   │   ├── auth_service.py
│   │   ├── project_service.py
│   │   ├── task_service.py
│   │   └── report_service.py
│   ├── utils/                 # ユーティリティ
│   │   ├── email.py
│   │   ├── file_handler.py
│   │   └── pdf_generator.py
│   └── main.py               # FastAPIアプリケーション
├── alembic/                  # データベースマイグレーション
├── tests/                    # テストコード
└── requirements.txt
```

### 5.2 認証・認可システム

#### 5.2.1 JWT実装

```python
# core/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

class SecurityManager:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def create_access_token(self, user_id: str, expires_delta: timedelta = None):
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode = {
            "user_id": user_id,
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)
```

#### 5.2.2 権限チェックデコレータ

```python
# utils/permissions.py
from functools import wraps
from fastapi import HTTPException, Depends

def require_permission(required_role: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user or current_user.role != required_role:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_project_access(project_id: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            # プロジェクトアクセス権限チェック
            has_access = await check_project_access(current_user.id, project_id)
            if not has_access:
                raise HTTPException(status_code=403, detail="Project access denied")
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

### 5.3 ビジネスロジック層

#### 5.3.1 タスクサービス

```python
# services/task_service.py
class TaskService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_task(self, task_data: TaskCreate, current_user: User) -> Task:
        # タスク作成ロジック
        # 1. 権限チェック
        # 2. 依存関係検証
        # 3. タスク作成
        # 4. 通知送信
        pass
    
    async def update_task_schedule(
        self, 
        task_id: str, 
        new_start: date, 
        new_end: date,
        current_user: User
    ) -> Task:
        # スケジュール更新
        # 1. タスク取得
        # 2. 依存関係チェック
        # 3. 後続タスクの自動調整
        # 4. 更新実行
        pass
    
    async def calculate_critical_path(self, project_id: str) -> List[Task]:
        # クリティカルパス計算
        pass
    
    async def generate_gantt_data(self, project_id: str) -> Dict:
        # ガントチャート用データ生成
        pass
```

## 6. BFF設計

### 6.1 BFFの責任範囲

```python
# bff/main.py
class BFFApplication:
    def __init__(self):
        self.backend_client = httpx.AsyncClient(base_url=settings.BACKEND_URL)
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
    
    async def aggregate_dashboard_data(self, user_id: str) -> DashboardData:
        # 複数のバックエンドAPIから必要なデータを取得・集約
        projects = await self.backend_client.get(f"/projects/user/{user_id}")
        notifications = await self.backend_client.get(f"/notifications/{user_id}")
        recent_tasks = await self.backend_client.get(f"/tasks/recent/{user_id}")
        
        return DashboardData(
            projects=projects.json(),
            notifications=notifications.json(),
            recent_tasks=recent_tasks.json()
        )
    
    async def transform_gantt_data(self, project_id: str) -> GanttData:
        # バックエンドからのタスクデータをフロントエンド用に変換
        tasks = await self.backend_client.get(f"/tasks/project/{project_id}")
        dependencies = await self.backend_client.get(f"/dependencies/project/{project_id}")
        
        # フロントエンドのガントチャートライブラリ用にデータ変換
        return self.transform_to_gantt_format(tasks.json(), dependencies.json())
```

### 6.2 キャッシュ戦略

```python
# bff/cache.py
class CacheManager:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def get_cached_project_data(self, project_id: str) -> Optional[Dict]:
        key = f"project:{project_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def cache_project_data(self, project_id: str, data: Dict, ttl: int = 300):
        key = f"project:{project_id}"
        await self.redis.setex(key, ttl, json.dumps(data))
    
    async def invalidate_project_cache(self, project_id: str):
        key = f"project:{project_id}"
        await self.redis.delete(key)
```

## 7. セキュリティ設計

### 7.1 認証フロー

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as BFF
    participant A as Auth Service
    participant D as Database

    F->>B: POST /api/v1/auth/login
    B->>A: Validate credentials
    A->>D: Check user
    D-->>A: User data
    A-->>B: JWT tokens
    B->>B: Set HTTPOnly cookies
    B-->>F: Success response
    
    Note over F,D: Subsequent requests
    F->>B: API request with cookies
    B->>B: Validate JWT from cookie
    B->>A: Forward request if valid
    A-->>B: Response
    B-->>F: Response
```

### 7.2 データバリデーション

```python
# schemas/task.py
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    planned_hours: Optional[float] = Field(None, ge=0, le=9999.99)
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_ids: List[UUID] = Field(default_factory=list)
    
    @validator('planned_end_date')
    def validate_end_date(cls, v, values):
        if v and values.get('planned_start_date') and v < values['planned_start_date']:
            raise ValueError('End date must be after start date')
        return v
```

## 8. パフォーマンス最適化

### 8.1 データベース最適化

```python
# バッチ処理によるN+1問題回避
async def get_tasks_with_assignees(project_id: str) -> List[TaskWithAssignees]:
    query = (
        select(Task)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.comments),
            selectinload(Task.attachments)
        )
        .where(Task.project_id == project_id)
    )
    tasks = await db.execute(query)
    return tasks.scalars().all()
```

### 8.2 フロントエンド最適化

```typescript
// 仮想化による大量データ表示最適化
import { FixedSizeList as List } from 'react-window';

const TaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TaskItem task={tasks[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={tasks.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## 9. 運用・監視設計

### 9.1 ログ戦略

```python
# ログ設定
import structlog

logger = structlog.get_logger()

async def log_user_action(user_id: str, action: str, resource: str, details: Dict):
    logger.info(
        "user_action",
        user_id=user_id,
        action=action,
        resource=resource,
        details=details,
        timestamp=datetime.utcnow().isoformat()
    )
```

### 9.2 ヘルスチェック

```python
# api/health.py
@router.get("/health")
async def health_check():
    try:
        # データベース接続確認
        await db.execute(text("SELECT 1"))
        # Redis接続確認
        await redis.ping()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "ok",
                "redis": "ok"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail="Service unhealthy")
```

## 10. デプロイメント設計

### 10.1 Docker構成

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 10.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8001
    depends_on:
      - bff

  bff:
    build: ./bff
    ports:
      - "8001:8000"
    environment:
      - BACKEND_URL=http://backend:8000
      - REDIS_URL=redis://redis:6379
    depends_on:
      - backend
      - redis

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/project_mgmt
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=project_mgmt
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 11. テスト戦略

### 11.1 フロントエンドテスト

```typescript
// __tests__/components/TaskForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskForm } from '@/components/forms/TaskForm';

describe('TaskForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    render(<TaskForm onSubmit={mockOnSubmit} />);
  });

  it('should validate required fields', async () => {
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('タスク名は必須です')).toBeInTheDocument();
    });
  });

  it('should submit valid data', async () => {
    const nameInput = screen.getByLabelText('タスク名');
    fireEvent.change(nameInput, { target: { value: 'テストタスク' } });
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'テストタスク',
        // ... other fields
      });
    });
  });
});
```

### 11.2 バックエンドテスト

```python
# tests/test_task_service.py
import pytest
from app.services.task_service import TaskService
from app.models.task import Task

@pytest.mark.asyncio
class TestTaskService:
    async def test_create_task_success(self, db_session, test_user, test_project):
        task_service = TaskService(db_session)
        
        task_data = {
            "name": "テストタスク",
            "project_id": test_project.id,
            "planned_start_date": "2024-01-01",
            "planned_end_date": "2024-01-05"
        }
        
        task = await task_service.create_task(task_data, test_user)
        
        assert task.name == "テストタスク"
        assert task.project_id == test_project.id
        assert task.created_by == test_user.id

    async def test_create_task_with_invalid_dates(self, db_session, test_user, test_project):
        task_service = TaskService(db_session)
        
        task_data = {
            "name": "テストタスク",
            "project_id": test_project.id,
            "planned_start_date": "2024-01-05",
            "planned_end_date": "2024-01-01"  # 開始日より前
        }
        
        with pytest.raises(ValueError, match="終了日は開始日より後である必要があります"):
            await task_service.create_task(task_data, test_user)

    async def test_calculate_critical_path(self, db_session, test_project_with_tasks):
        task_service = TaskService(db_session)
        
        critical_path = await task_service.calculate_critical_path(test_project_with_tasks.id)
        
        assert len(critical_path) > 0
        assert all(task.is_critical for task in critical_path)
```

### 11.3 E2Eテスト

```typescript
// e2e/task-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('タスク管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid=username]', 'testuser');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('新規タスクを作成できる', async ({ page }) => {
    await page.click('[data-testid=create-task-button]');
    await page.fill('[data-testid=task-name]', '新しいタスク');
    await page.fill('[data-testid=task-description]', 'タスクの説明');
    await page.click('[data-testid=submit-button]');
    
    await expect(page.locator('[data-testid=task-list]')).toContainText('新しいタスク');
  });

  test('ガントチャートでタスクをドラッグできる', async ({ page }) => {
    await page.goto('/projects/1/gantt');
    
    const taskBar = page.locator('[data-testid=task-bar-1]');
    await taskBar.dragTo(page.locator('[data-testid=gantt-date-2024-01-15]'));
    
    await expect(page.locator('[data-testid=task-start-date]')).toContainText('2024-01-15');
  });
});
```

## 12. パフォーマンス要件実装

### 12.1 データベースクエリ最適化

```python
# services/optimized_queries.py
class OptimizedQueries:
    @staticmethod
    async def get_project_dashboard_data(db: Session, project_id: str) -> ProjectDashboard:
        # 1つのクエリで必要なデータを全て取得
        query = text("""
            WITH task_stats AS (
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
                    COUNT(*) FILTER (WHERE planned_end_date < CURRENT_DATE AND status != 'completed') as overdue_tasks,
                    SUM(planned_hours) as total_planned_hours,
                    SUM(actual_hours) as total_actual_hours
                FROM tasks 
                WHERE project_id = :project_id
            ),
            milestone_stats AS (
                SELECT 
                    COUNT(*) as total_milestones,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones
                FROM tasks 
                WHERE project_id = :project_id AND is_milestone = true
            )
            SELECT 
                p.*,
                ts.*,
                ms.*
            FROM projects p
            CROSS JOIN task_stats ts
            CROSS JOIN milestone_stats ms
            WHERE p.id = :project_id
        """)
        
        result = await db.execute(query, {"project_id": project_id})
        return result.fetchone()

    @staticmethod
    async def get_gantt_data_optimized(db: Session, project_id: str) -> List[GanttTask]:
        # 依存関係を含むタスクデータを効率的に取得
        query = text("""
            WITH RECURSIVE task_hierarchy AS (
                SELECT 
                    t.*,
                    0 as level,
                    ARRAY[t.id] as path
                FROM tasks t
                WHERE t.project_id = :project_id AND t.parent_task_id IS NULL
                
                UNION ALL
                
                SELECT 
                    t.*,
                    th.level + 1,
                    th.path || t.id
                FROM tasks t
                JOIN task_hierarchy th ON t.parent_task_id = th.id
                WHERE NOT t.id = ANY(th.path)
            )
            SELECT 
                th.*,
                array_agg(DISTINCT ta.user_id) as assignee_ids,
                array_agg(DISTINCT td_pred.predecessor_id) as predecessor_ids,
                array_agg(DISTINCT td_succ.successor_id) as successor_ids
            FROM task_hierarchy th
            LEFT JOIN task_assignments ta ON th.id = ta.task_id
            LEFT JOIN task_dependencies td_pred ON th.id = td_pred.successor_id
            LEFT JOIN task_dependencies td_succ ON th.id = td_succ.predecessor_id
            GROUP BY th.id, th.name, th.planned_start_date, th.planned_end_date, 
                     th.actual_start_date, th.actual_end_date, th.progress_percentage,
                     th.priority, th.status, th.is_milestone, th.level, th.path
            ORDER BY th.path
        """)
        
        result = await db.execute(query, {"project_id": project_id})
        return result.fetchall()
```

### 12.2 キャッシュ実装

```python
# utils/cache_decorator.py
from functools import wraps
import json
import hashlib

def cache_result(ttl: int = 300, key_prefix: str = ""):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # キャッシュキー生成
            cache_key = f"{key_prefix}:{func.__name__}:{hashlib.md5(str(args + tuple(kwargs.items())).encode()).hexdigest()}"
            
            # キャッシュから取得試行
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # 関数実行
            result = await func(*args, **kwargs)
            
            # 結果をキャッシュ
            await redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
            
            return result
        return wrapper
    return decorator

# 使用例
@cache_result(ttl=600, key_prefix="project_data")
async def get_project_summary(project_id: str) -> ProjectSummary:
    # 重い処理
    return await calculate_project_summary(project_id)
```

## 13. セキュリティ実装詳細

### 13.1 CSRFトークン実装

```python
# core/csrf.py
import secrets
from fastapi import Request, HTTPException

class CSRFProtection:
    def __init__(self):
        self.token_length = 32
    
    def generate_token(self) -> str:
        return secrets.token_urlsafe(self.token_length)
    
    async def validate_token(self, request: Request, token: str) -> bool:
        session_token = request.session.get("csrf_token")
        return session_token and secrets.compare_digest(session_token, token)
    
    async def protect_endpoint(self, request: Request):
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            csrf_token = request.headers.get("X-CSRF-Token")
            if not csrf_token or not await self.validate_token(request, csrf_token):
                raise HTTPException(status_code=403, detail="CSRF token validation failed")
```

### 13.2 入力値サニタイゼーション

```python
# utils/sanitizer.py
import bleach
from markupsafe import Markup

class InputSanitizer:
    @staticmethod
    def sanitize_html(content: str) -> str:
        """HTMLコンテンツをサニタイズ"""
        allowed_tags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
        allowed_attributes = {}
        
        return bleach.clean(
            content,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """ファイル名をサニタイズ"""
        import re
        # 危険な文字を除去
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        # パストラバーサル攻撃を防ぐ
        filename = filename.replace('..', '')
        return filename.strip()
```

## 14. 国際化・多言語対応準備

### 14.1 フロントエンド国際化

```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ja: {
    translation: {
      "task": {
        "create": "タスクを作成",
        "edit": "タスクを編集",
        "delete": "タスクを削除",
        "name": "タスク名",
        "description": "説明",
        "startDate": "開始日",
        "endDate": "終了日",
        "priority": {
          "high": "高",
          "medium": "中", 
          "low": "低"
        }
      },
      "project": {
        "create": "プロジェクトを作成",
        "name": "プロジェクト名"
      }
    }
  },
  en: {
    translation: {
      "task": {
        "create": "Create Task",
        "edit": "Edit Task", 
        "delete": "Delete Task",
        "name": "Task Name",
        "description": "Description",
        "startDate": "Start Date",
        "endDate": "End Date",
        "priority": {
          "high": "High",
          "medium": "Medium",
          "low": "Low"
        }
      },
      "project": {
        "create": "Create Project",
        "name": "Project Name"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ja',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

### 14.2 バックエンド多言語対応

```python
# utils/i18n.py
from typing import Dict, Optional
import json
import os

class I18nManager:
    def __init__(self):
        self.translations: Dict[str, Dict] = {}
        self.load_translations()
    
    def load_translations(self):
        """翻訳ファイルを読み込み"""
        translations_dir = "locales"
        for filename in os.listdir(translations_dir):
            if filename.endswith('.json'):
                lang_code = filename.replace('.json', '')
                with open(os.path.join(translations_dir, filename), 'r', encoding='utf-8') as f:
                    self.translations[lang_code] = json.load(f)
    
    def get_text(self, key: str, lang: str = 'ja', **kwargs) -> str:
        """翻訳テキストを取得"""
        translation = self.translations.get(lang, {})
        
        # ネストしたキーをサポート (例: "error.validation.required")
        keys = key.split('.')
        text = translation
        for k in keys:
            text = text.get(k, key)
            if isinstance(text, str):
                break
        
        # プレースホルダーを置換
        if kwargs and isinstance(text, str):
            text = text.format(**kwargs)
        
        return text if isinstance(text, str) else key

# 使用例
i18n = I18nManager()
error_message = i18n.get_text("error.task.name_required", lang="ja")
```

## 15. 監視・ロギング実装

### 15.1 構造化ログ

```python
# utils/logging.py
import structlog
import logging
from datetime import datetime
from typing import Dict, Any

# ログ設定
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

class ApplicationLogger:
    @staticmethod
    def log_user_action(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Dict[str, Any] = None
    ):
        logger.info(
            "user_action",
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            timestamp=datetime.utcnow().isoformat()
        )
    
    @staticmethod
    def log_performance(
        operation: str,
        duration_ms: float,
        success: bool,
        details: Dict[str, Any] = None
    ):
        logger.info(
            "performance",
            operation=operation,
            duration_ms=duration_ms,
            success=success,
            details=details or {}
        )
    
    @staticmethod
    def log_error(
        error: Exception,
        context: Dict[str, Any] = None
    ):
        logger.error(
            "application_error",
            error_type=type(error).__name__,
            error_message=str(error),
            context=context or {},
            exc_info=True
        )
```

### 15.2 メトリクス収集

```python
# utils/metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time
from functools import wraps

# メトリクス定義
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_USERS = Gauge('active_users_total', 'Number of active users')
TASK_COUNT = Gauge('tasks_total', 'Total number of tasks', ['status', 'project_id'])

def track_performance(operation_name: str):
    """パフォーマンス追跡デコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = (time.time() - start_time) * 1000  # ms
                ApplicationLogger.log_performance(
                    operation=operation_name,
                    duration_ms=duration,
                    success=success
                )
        return wrapper
    return decorator

# 使用例
@track_performance("create_task")
async def create_task(task_data: TaskCreate) -> Task:
    # タスク作成処理
    pass
```

## 16. 本番環境準備

### 16.1 環境変数管理

```python
# core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # アプリケーション設定
    app_name: str = "Project Management System"
    debug: bool = False
    secret_key: str
    
    # データベース設定
    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20
    
    # Redis設定
    redis_url: str
    redis_max_connections: int = 10
    
    # JWT設定
    jwt_secret_key: str
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # ファイルアップロード設定
    upload_max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_allowed_extensions: list = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png']
    upload_directory: str = "uploads"
    
    # メール設定
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    
    # セキュリティ設定
    cors_origins: list = ["http://localhost:3000"]
    csrf_secret_key: str
    
    # 監視設定
    sentry_dsn: Optional[str] = None
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

### 16.2 本番用Dockerfile最適化

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["npm", "start"]

# backend/Dockerfile.prod  
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runner
WORKDIR /app
RUN adduser --disabled-password --gecos '' appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY . .
RUN chown -R appuser:appuser /app
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

技術設計書が完成いたしました。この設計書には以下の重要な要素が含まれています：

## 技術設計書の主な内容

1. **システムアーキテクチャ**: BFF構成の詳細設計
2. **API設計**: 統一されたエンドポイント設計とレスポンス形式
3. **データベース設計**: 完全なER図とテーブル設計
4. **フロントエンド設計**: Next.js + TypeScriptの詳細構成
5. **バックエンド設計**: FastAPIによるマイクロサービス設計
6. **BFF設計**: データ集約とキャッシュ戦略
7. **セキュリティ設計**: 認証・認可・入力検証
8. **パフォーマンス最適化**: データベース最適化とキャッシュ
9. **テスト戦略**: フロントエンド・バックエンド・E2Eテスト
10. **運用・監視**: ログ・メトリクス・ヘルスチェック

次のステップとして、この技術設計に基づいて**実装タスクの詳細な分解**を行います。

技術設計書の内容について確認や修正が必要な点はございますか？問題なければ、次の段階である**タスク分解**に進みます。