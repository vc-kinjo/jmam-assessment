// タスク管理ストア

import { create } from 'zustand';
import { Task } from '@/types/task';
import { TaskService } from '@/services/taskService';
import { useNotificationStore } from './notification';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTasks: (params: { project_id: number; skip?: number; limit?: number; status?: string; assigned_to?: number }) => Promise<void>;
  fetchTask: (taskId: number) => Promise<void>;
  createTask: (taskData: any) => Promise<boolean>;
  updateTask: (taskId: number, taskData: any) => Promise<boolean>;
  deleteTask: (taskId: number) => Promise<boolean>;
  assignTask: (taskId: number, userId: number) => Promise<boolean>;
  unassignTask: (taskId: number, userId: number) => Promise<boolean>;
  clearSelectedTask: () => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,

  fetchTasks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.getTasks(params);
      if (response.success) {
        set({ tasks: response.data.tasks, loading: false });
      } else {
        set({ error: response.error?.message || 'タスク一覧の取得に失敗しました', loading: false });
      }
    } catch (error) {
      set({ error: 'タスク一覧の取得中にエラーが発生しました', loading: false });
    }
  },

  fetchTask: async (taskId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.getTask(taskId);
      if (response.success) {
        set({ selectedTask: response.data.task, loading: false });
      } else {
        set({ error: response.error?.message || 'タスクの取得に失敗しました', loading: false });
      }
    } catch (error) {
      set({ error: 'タスクの取得中にエラーが発生しました', loading: false });
    }
  },

  createTask: async (taskData: any) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.createTask(taskData);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // タスク一覧を再取得
        await get().fetchTasks({ project_id: taskData.project_id });
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'タスクの作成に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'タスクの作成に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'タスクの作成中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'タスクの作成中にエラーが発生しました');
      return false;
    }
  },

  updateTask: async (taskId: number, taskData: any) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.updateTask(taskId, taskData);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // 選択中のタスクも更新
        if (get().selectedTask?.id === taskId) {
          await get().fetchTask(taskId);
        }
        // タスク一覧の該当項目を更新
        const tasks = get().tasks;
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data.task : task
        );
        set({ tasks: updatedTasks, loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'タスクの更新に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'タスクの更新に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'タスクの更新中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'タスクの更新中にエラーが発生しました');
      return false;
    }
  },

  deleteTask: async (taskId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.deleteTask(taskId);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // タスク一覧から削除
        const tasks = get().tasks;
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        set({ tasks: updatedTasks });
        // 選択中のタスクをクリア
        if (get().selectedTask?.id === taskId) {
          set({ selectedTask: null });
        }
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'タスクの削除に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'タスクの削除に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'タスクの削除中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'タスクの削除中にエラーが発生しました');
      return false;
    }
  },

  assignTask: async (taskId: number, userId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.assignTask(taskId, userId);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // 選択中のタスクを再取得
        if (get().selectedTask?.id === taskId) {
          await get().fetchTask(taskId);
        }
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || '担当者の割り当てに失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || '担当者の割り当てに失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: '担当者の割り当て中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', '担当者の割り当て中にエラーが発生しました');
      return false;
    }
  },

  unassignTask: async (taskId: number, userId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await TaskService.unassignTask(taskId, userId);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // 選択中のタスクを再取得
        if (get().selectedTask?.id === taskId) {
          await get().fetchTask(taskId);
        }
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || '担当者の解除に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || '担当者の解除に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: '担当者の解除中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', '担当者の解除中にエラーが発生しました');
      return false;
    }
  },

  clearSelectedTask: () => {
    set({ selectedTask: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));