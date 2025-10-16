// 基本的な型定義

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  furigana: string;
  phone_number: string;
  company: string;
  department: string;
  role_level: 'admin' | 'manager' | 'member';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  category: string;
  created_by: User;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  member_count: number;
  task_count: number;
  total_tasks: number;
  completed_tasks: number;
}

export interface ProjectMember {
  id: number;
  user: User;
  role: 'manager' | 'member' | 'viewer';
  joined_at: string;
}

export interface Task {
  id: number;
  project: number;
  project_name: string;
  parent_task: number | null;
  parent_task_name: string;
  level: number;
  name: string;
  description: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_hours: number;
  actual_hours: number;
  progress_rate: number;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  is_milestone: boolean;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignments: TaskAssignment[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  subtask_count: number;
  duration_days: number;
}

export interface TaskAssignment {
  id: number;
  user: User;
  assigned_at: string;
}


export interface TaskComment {
  id: number;
  user: User;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: number;
  user: User;
  file: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface GanttTask {
  id: number;
  text: string;
  start_date: string;
  end_date: string;
  progress: number;
  parent: number;
  type: 'task' | 'project' | 'milestone';
  priority: string;
  status: string;
}


export interface AuthResponse {
  user?: User;
  access: string;
  refresh: string;
}

export interface JWTResponse {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}