import { create } from 'zustand';
import { Project } from '../types/index';
import { projectAPI } from '../services/api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: number) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: number, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => {
  let isInitialized = false;

  return {
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,

    fetchProjects: async () => {
      try {
        console.log('ProjectStore.fetchProjects called');
        const currentState = get();

        // 既にローディング中または初期化済みでデータがある場合はスキップ
        if (currentState.isLoading || (isInitialized && currentState.projects.length > 0 && !currentState.error)) {
          console.log('ProjectStore.fetchProjects: Already loading or data exists, skipping');
          return;
        }

        isInitialized = true;

      set({ isLoading: true, error: null });
      const response = await projectAPI.getProjects();
      console.log('Fetch projects response:', response);
      console.log('Response data:', response.data);

      // PaginatedResponseの形式の場合はresultsを取得、配列の場合はそのまま使用
      let projects: Project[] = [];
      if (response.data && typeof response.data === 'object') {
        if ('results' in response.data && Array.isArray(response.data.results)) {
          projects = response.data.results;
          console.log('Projects from paginated response:', projects);
        } else if (Array.isArray(response.data)) {
          projects = response.data;
        }
      }

      console.log('ProjectStore.fetchProjects: Final projects array:', projects);
      set({
        projects: projects,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Fetch projects error:', error);
      const errorMessage = error.response?.data?.detail ||
                          'プロジェクト一覧の取得に失敗しました';
        set({
          error: errorMessage,
          isLoading: false,
          projects: [] // エラー時は空配列に設定
        });
      }
    },

  fetchProject: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching project with ID:', id);
      const response = await projectAPI.getProject(id);
      console.log('Fetched project:', response.data);

      const fetchedProject = response.data;

      set(state => ({
        currentProject: fetchedProject,
        // projects配列にも追加/更新
        projects: Array.isArray(state.projects)
          ? state.projects.some(p => p.id === id)
            ? state.projects.map(p => p.id === id ? fetchedProject : p)
            : [...state.projects, fetchedProject]
          : [fetchedProject],
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Fetch project error:', error);
      const errorMessage = error.response?.data?.detail ||
                          'プロジェクトの取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  createProject: async (data: Partial<Project>) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Creating project with data:', data);
      const response = await projectAPI.createProject(data);
      console.log('Project creation response:', response);
      const newProject = response.data;

      set(state => ({
        projects: Array.isArray(state.projects) ? [...state.projects, newProject] : [newProject],
        isLoading: false
      }));

      return newProject;
    } catch (error: any) {
      console.error('Project creation error in store:', error);
      console.error('Error response in store:', error.response);
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          'プロジェクトの作成に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  updateProject: async (id: number, data: Partial<Project>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await projectAPI.updateProject(id, data);
      const updatedProject = response.data;

      set(state => ({
        projects: Array.isArray(state.projects)
          ? state.projects.map(p => p.id === id ? updatedProject : p)
          : [updatedProject],
        currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
        isLoading: false
      }));

      return updatedProject;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'プロジェクトの更新に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  deleteProject: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      await projectAPI.deleteProject(id);

      set(state => ({
        projects: Array.isArray(state.projects)
          ? state.projects.filter(p => p.id !== id)
          : [],
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'プロジェクトの削除に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

    clearError: () => set({ error: null }),
  };
});