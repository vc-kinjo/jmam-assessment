// ユーザー関連型定義

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  furigana?: string;
  phone_number?: string;
  phone?: string;
  company?: string;
  department?: string;
  role_level: 'admin' | 'manager' | 'member';
  role?: 'admin' | 'manager' | 'member';
  position?: string;
  bio?: string;
  notification_settings?: {
    email_notifications: boolean;
    push_notifications: boolean;
    task_reminders: boolean;
    project_updates: boolean;
  };
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  furigana?: string;
  phone_number?: string;
  company?: string;
  department?: string;
  role_level?: 'admin' | 'manager' | 'member';
}

export interface UserUpdateData {
  full_name?: string;
  furigana?: string;
  phone_number?: string;
  company?: string;
  department?: string;
}

export interface PasswordUpdateData {
  current_password: string;
  new_password: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_level: 'admin' | 'manager' | 'member';
}