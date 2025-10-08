// プロジェクト関連の型定義

export interface Project {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  category?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
}

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string;
  status: string;
  category?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  progress_rate: number;
  progress?: number;
  task_count: number;
  completed_task_count: number;
  total_tasks: number;
  completed_tasks: number;
  member_count: number;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  category?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  category?: string;
}

export const PROJECT_STATUSES = [
  { value: 'active', label: 'アクティブ' },
  { value: 'completed', label: '完了' },
  { value: 'on_hold', label: '保留' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

export const PROJECT_CATEGORIES = [
  { value: 'development', label: '開発' },
  { value: 'research', label: '調査・研究' },
  { value: 'marketing', label: 'マーケティング' },
  { value: 'operation', label: '運用' },
  { value: 'other', label: 'その他' },
] as const;

export const MEMBER_ROLES = [
  { value: 'manager', label: 'マネージャー' },
  { value: 'member', label: 'メンバー' },
  { value: 'viewer', label: '閲覧者' },
] as const;