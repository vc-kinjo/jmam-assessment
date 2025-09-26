// タスク関連の型定義

export interface Task {
  id: number;
  project_id: number;
  parent_task_id?: number;
  level: number;
  name: string;
  description?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_hours: number;
  actual_hours: number;
  progress_rate: number;
  priority: string;
  status: string;
  is_milestone: boolean;
  category?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignments?: TaskAssignment[];
  subtasks?: Task[];
  predecessor_task_ids?: number[];
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  assigned_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
}

export interface TaskDependency {
  id: number;
  predecessor_id: number;
  successor_id: number;
  dependency_type: string;
  lag_days: number;
  created_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface TaskCreateRequest {
  project_id: number;
  parent_task_id?: number;
  level?: number;
  name: string;
  description?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  estimated_hours?: number;
  priority?: string;
  category?: string;
  is_milestone?: boolean;
  predecessor_task_ids?: number[];
}

export interface TaskUpdateRequest {
  name?: string;
  description?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_rate?: number;
  priority?: string;
  status?: string;
  category?: string;
  is_milestone?: boolean;
  sort_order?: number;
  predecessor_task_ids?: number[];
}

export const TASK_STATUSES = [
  { value: 'not_started', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'on_hold', label: '保留' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

export const TASK_PRIORITIES = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
] as const;

export const DEPENDENCY_TYPES = [
  { value: 'finish_to_start', label: 'FS（完了-開始）' },
  { value: 'start_to_start', label: 'SS（開始-開始）' },
  { value: 'finish_to_finish', label: 'FF（完了-完了）' },
  { value: 'start_to_finish', label: 'SF（開始-完了）' },
] as const;

export interface TaskHierarchy {
  id: number;
  name: string;
  level: number;
  parent_task_id?: number;
  status: string;
  progress_rate: number;
  subtasks: TaskHierarchy[];
}

export interface ValidPredecessorTask {
  id: number;
  name: string;
  level: number;
  parent_task_id?: number;
}

export const MAX_TASK_LEVEL = 3;