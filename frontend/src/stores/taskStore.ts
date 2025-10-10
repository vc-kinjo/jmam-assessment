import { create } from 'zustand';
import { Task, GanttTask, GanttLink } from '../types/index';
import { taskAPI } from '../services/api';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  ganttData: { data: GanttTask[]; links: GanttLink[] } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: (projectId?: number) => Promise<void>;
  fetchTasksByProject: (projectId: number) => Promise<Task[]>;
  fetchTask: (id: number) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: number, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  fetchGanttData: (projectId: number) => Promise<void>;
  updateTaskSchedule: (id: number, data: Partial<Task>) => Promise<void>;
  setCurrentTask: (task: Task | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  ganttData: null,
  isLoading: false,
  error: null,

  fetchTasks: async (projectId?: number) => {
    try {
      set({ isLoading: true, error: null });
      const params = projectId ? { project_id: projectId } : undefined;
      const response = await taskAPI.getTasks(params);
      set({
        tasks: response.data,
        isLoading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'タスク一覧の取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  fetchTasksByProject: async (projectId: number) => {
    try {
      console.log('TaskStore: Fetching tasks for project ID:', projectId);
      const response = await taskAPI.getTasks({ project_id: projectId });
      console.log('TaskStore: Tasks response:', response.data);
      console.log('TaskStore: Response data type:', typeof response.data);

      // ページネーション形式の場合はresultsを取得、配列の場合はそのまま使用
      let tasks: Task[] = [];
      if (response.data && typeof response.data === 'object') {
        if ('results' in response.data && Array.isArray(response.data.results)) {
          tasks = response.data.results;
          console.log('TaskStore: Tasks from paginated response:', tasks);
        } else if (Array.isArray(response.data)) {
          tasks = response.data;
          console.log('TaskStore: Tasks from array response:', tasks);
        }
      }

      // 担当者・先行タスク情報の確認
      if (tasks.length > 0) {
        console.log('TaskStore: First task detailed info:');
        const firstTask = tasks[0];
        console.log('- Task ID:', firstTask.id);
        console.log('- Task name:', firstTask.name);
        console.log('- Assignments:', firstTask.assignments);
        console.log('- Dependencies as successor:', firstTask.dependencies_as_successor);
        console.log('- All task keys:', Object.keys(firstTask));
      }

      console.log('TaskStore: Final tasks array:', tasks);
      return tasks;
    } catch (error: any) {
      console.error('Failed to fetch tasks by project:', error);
      return [];
    }
  },

  fetchTask: async (id: number) => {
    try {
      console.log('TaskStore.fetchTask called for ID:', id);

      // IDの有効性を確認
      if (!id || id === undefined || id === null || isNaN(id)) {
        console.error('TaskStore.fetchTask: Invalid task ID:', id);
        set({
          error: '無効なタスクIDです',
          isLoading: false
        });
        return;
      }

      const currentState = get();

      // 既にローディング中または同じタスクが既に取得済みの場合はスキップ
      if (currentState.isLoading || (currentState.currentTask?.id === id && !currentState.error)) {
        console.log('TaskStore.fetchTask: Already loading or same task exists, skipping');
        return;
      }

      set({ isLoading: true, error: null });
      const response = await taskAPI.getTask(id);
      console.log('TaskStore.fetchTask: Got task data:', response.data);
      set({
        currentTask: response.data,
        isLoading: false
      });
    } catch (error: any) {
      console.error('TaskStore.fetchTask error:', error);

      // 404エラーの場合は、タスクが削除されているのでcurrentTaskをクリア
      if (error.response?.status === 404) {
        console.log('TaskStore.fetchTask: Task not found (404), clearing current task');
        set({
          currentTask: null,
          isLoading: false,
          error: null // 404エラーはエラーとして表示しない
        });
        return;
      }

      const errorMessage = error.response?.data?.detail ||
                          'タスクの取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  createTask: async (data: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await taskAPI.createTask(data);
      const newTask = response.data;

      set(state => ({
        tasks: [...state.tasks, newTask],
        isLoading: false
      }));

      return newTask;
    } catch (error: any) {
      console.error('Task creation failed:', error);
      const errorMessage = error.response?.data?.detail ||
                          'タスクの作成に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  updateTask: async (id: number, data: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await taskAPI.updateTask(id, data);
      const updatedTask = response.data;

      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updatedTask } : t),
        currentTask: state.currentTask?.id === id ? { ...state.currentTask, ...updatedTask } : state.currentTask,
        isLoading: false
      }));

      // ガントデータが存在する場合は、プロジェクトIDを取得して再取得
      const state = get();
      if (state.ganttData && updatedTask.project) {
        try {
          const ganttResponse = await taskAPI.getGanttData(updatedTask.project);
          set({ ganttData: ganttResponse.data });
        } catch (ganttError) {
          console.warn('Failed to refresh gantt data after task update:', ganttError);
        }
      }

      return updatedTask;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'タスクの更新に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  deleteTask: async (id: number) => {
    try {
      console.log('TaskStore: Deleting task with ID:', id);
      set({ isLoading: true, error: null });

      const response = await taskAPI.deleteTask(id);
      console.log('TaskStore: Task deletion successful');

      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id),
        currentTask: state.currentTask?.id === id ? null : state.currentTask,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('TaskStore: Task deletion failed:', error);
      console.error('TaskStore: Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'タスクの削除に失敗しました';

      if (error.response?.status === 500) {
        errorMessage = 'サーバーエラーが発生しました。このタスクに関連する依存関係がある可能性があります。';
      } else if (error.response?.status === 404) {
        errorMessage = 'タスクが見つかりません。既に削除されている可能性があります。';
        // 404の場合は実際に削除されているので、ローカル状態からも削除
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id),
          currentTask: state.currentTask?.id === id ? null : state.currentTask,
          isLoading: false,
          error: null
        }));
        return;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  fetchGanttData: async (projectId: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await taskAPI.getGanttData(projectId);
      set({
        ganttData: response.data,
        isLoading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'ガントチャートデータの取得に失敗しました';
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  updateTaskSchedule: async (id: number, data: Partial<Task>) => {
    try {
      await taskAPI.updateTaskSchedule(id, data);

      // ローカル状態も更新
      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t),
        currentTask: state.currentTask?.id === id ? { ...state.currentTask, ...data } : state.currentTask,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          'タスクスケジュールの更新に失敗しました';
      set({ error: errorMessage });
      throw error;
    }
  },

  setCurrentTask: (task: Task | null) => {
    set({ currentTask: task });
  },

  clearError: () => set({ error: null }),
}));