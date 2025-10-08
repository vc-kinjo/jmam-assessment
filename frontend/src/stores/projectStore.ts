// プロジェクト管理ストア

import { create } from 'zustand';
import { Project, ProjectSummary } from '@/types/project';
import { ProjectService } from '@/services/projectService';
import { useNotificationStore } from './notification';

interface ProjectState {
  projects: Project[];
  projectSummaries: ProjectSummary[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: (params?: { skip?: number; limit?: number; status?: string }) => Promise<void>;
  fetchProjectSummaries: () => Promise<void>;
  fetchProject: (projectId: number) => Promise<void>;
  createProject: (projectData: any) => Promise<boolean>;
  updateProject: (projectId: number, projectData: any) => Promise<boolean>;
  deleteProject: (projectId: number) => Promise<boolean>;
  clearSelectedProject: () => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  projectSummaries: [],
  selectedProject: null,
  loading: false,
  error: null,

  fetchProjects: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.getProjects(params);
      if (response.success) {
        set({ projects: response.data.projects, loading: false });
      } else {
        set({ error: response.error?.message || 'プロジェクト一覧の取得に失敗しました', loading: false });
      }
    } catch (error) {
      set({ error: 'プロジェクト一覧の取得中にエラーが発生しました', loading: false });
    }
  },

  fetchProjectSummaries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.getProjectSummaries();
      if (response.success) {
        set({ projectSummaries: response.data.summaries, loading: false });
      } else {
        set({ error: response.error?.message || 'プロジェクト概要の取得に失敗しました', loading: false });
      }
    } catch (error) {
      set({ error: 'プロジェクト概要の取得中にエラーが発生しました', loading: false });
    }
  },

  fetchProject: async (projectId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.getProject(projectId);
      if (response.success) {
        set({ selectedProject: response.data.project, loading: false });
      } else {
        set({ error: response.error?.message || 'プロジェクトの取得に失敗しました', loading: false });
      }
    } catch (error) {
      set({ error: 'プロジェクトの取得中にエラーが発生しました', loading: false });
    }
  },

  createProject: async (projectData: any) => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.createProject(projectData);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // プロジェクト一覧を再取得
        await get().fetchProjects();
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'プロジェクトの作成に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'プロジェクトの作成に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'プロジェクトの作成中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'プロジェクトの作成中にエラーが発生しました');
      return false;
    }
  },

  updateProject: async (projectId: number, projectData: any) => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.updateProject(projectId, projectData);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // プロジェクト一覧を再取得
        await get().fetchProjects();
        // 選択中のプロジェクトも更新
        if (get().selectedProject?.id === projectId) {
          await get().fetchProject(projectId);
        }
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'プロジェクトの更新に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'プロジェクトの更新に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'プロジェクトの更新中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'プロジェクトの更新中にエラーが発生しました');
      return false;
    }
  },

  deleteProject: async (projectId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await ProjectService.deleteProject(projectId);
      if (response.success) {
        useNotificationStore.getState().addNotification('success', response.data.message);
        // プロジェクト一覧を再取得
        await get().fetchProjects();
        // 選択中のプロジェクトをクリア
        if (get().selectedProject?.id === projectId) {
          set({ selectedProject: null });
        }
        set({ loading: false });
        return true;
      } else {
        set({ error: response.error?.message || 'プロジェクトの削除に失敗しました', loading: false });
        useNotificationStore.getState().addNotification('error', response.error?.message || 'プロジェクトの削除に失敗しました');
        return false;
      }
    } catch (error) {
      set({ error: 'プロジェクトの削除中にエラーが発生しました', loading: false });
      useNotificationStore.getState().addNotification('error', 'プロジェクトの削除中にエラーが発生しました');
      return false;
    }
  },

  clearSelectedProject: () => {
    set({ selectedProject: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));