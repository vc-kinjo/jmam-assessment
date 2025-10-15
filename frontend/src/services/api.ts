import axios, { AxiosResponse } from 'axios';
import { AuthResponse, LoginCredentials, User, Project, Task, GanttTask, GanttLink, PaginatedResponse } from '../types/index';

// APIクライアント設定
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // DELETEリクエストのログ
    if (config.method === 'delete') {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// レスポンスインターセプター（トークンリフレッシュ処理）
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('/api/auth/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // 元のリクエストを再実行
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // リフレッシュ失敗時はログアウト
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// 認証API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> => {
    return api.post('/auth/token/', credentials);
  },

  logout: async (): Promise<AxiosResponse> => {
    const refreshToken = localStorage.getItem('refresh_token');
    return api.post('/auth/auth/logout/', { refresh: refreshToken });
  },

  getCurrentUser: async (): Promise<AxiosResponse<User>> => {
    return api.get('/auth/users/me/');
  },

  getProfile: async (): Promise<AxiosResponse<User>> => {
    return api.get('/auth/users/profile/');
  },

  updateProfile: async (data: Partial<User>): Promise<AxiosResponse<User>> => {
    return api.patch('/auth/users/profile/', data);
  },
};

// ユーザーAPI
export const userAPI = {
  getUsers: async (): Promise<AxiosResponse<User[]>> => {
    return api.get('/auth/users/');
  },

  createUser: async (data: Partial<User>): Promise<AxiosResponse<User>> => {
    return api.post('/auth/users/', data);
  },

  updateUser: async (id: number, data: Partial<User>): Promise<AxiosResponse<User>> => {
    return api.patch(`/auth/users/${id}/`, data);
  },

  deleteUser: async (id: number): Promise<AxiosResponse> => {
    return api.delete(`/auth/users/${id}/`);
  },
};

// プロジェクトAPI
export const projectAPI = {
  getProjects: async (): Promise<AxiosResponse<PaginatedResponse<Project>>> => {
    console.log('API: Fetching projects...');
    const response = await api.get('/projects/');
    console.log('API: Projects fetch response:', response);
    return response;
  },

  getProject: async (id: number): Promise<AxiosResponse<Project>> => {
    return api.get(`/projects/${id}/`);
  },

  createProject: async (data: Partial<Project>): Promise<AxiosResponse<Project>> => {
    console.log('API: Creating project with data:', data);
    const response = await api.post('/projects/', data);
    console.log('API: Project creation response:', response);
    return response;
  },

  updateProject: async (id: number, data: Partial<Project>): Promise<AxiosResponse<Project>> => {
    return api.patch(`/projects/${id}/`, data);
  },

  deleteProject: async (id: number): Promise<AxiosResponse> => {
    return api.delete(`/projects/${id}/`);
  },

  getMyProjects: async (): Promise<AxiosResponse<Project[]>> => {
    return api.get('/projects/my_projects/');
  },

  getProjectMembers: async (id: number): Promise<AxiosResponse<any[]>> => {
    return api.get(`/projects/${id}/members/`);
  },

  addProjectMember: async (id: number, data: { user_id: number; role: string }): Promise<AxiosResponse> => {
    return api.post(`/projects/${id}/members/`, data);
  },

  removeProjectMember: async (id: number, userId: number): Promise<AxiosResponse> => {
    return api.delete(`/projects/${id}/remove_member/`, { data: { user_id: userId } });
  },
};

// タスクAPI
export const taskAPI = {
  getTasks: async (params?: { project_id?: number }): Promise<AxiosResponse<Task[]>> => {
    return api.get('/tasks/', { params });
  },

  getTask: async (id: number): Promise<AxiosResponse<Task>> => {
    return api.get(`/tasks/${id}/`);
  },

  createTask: async (data: Partial<Task>): Promise<AxiosResponse<Task>> => {
    return api.post('/tasks/', data);
  },

  updateTask: async (id: number, data: Partial<Task>): Promise<AxiosResponse<Task>> => {
    return api.patch(`/tasks/${id}/`, data);
  },

  deleteTask: async (id: number): Promise<AxiosResponse> => {
    console.log('API: Deleting task with ID:', id);
    try {
      const response = await api.delete(`/tasks/${id}/`);
      console.log('API: Task deletion response:', response);
      return response;
    } catch (error: any) {
      console.error('API: Task deletion error:', error);
      console.error('API: Error response data:', error.response?.data);
      console.error('API: Error status:', error.response?.status);
      throw error;
    }
  },

  getMyTasks: async (): Promise<AxiosResponse<Task[]>> => {
    return api.get('/tasks/my_tasks/');
  },

  getTaskHierarchy: async (projectId: number): Promise<AxiosResponse<Task[]>> => {
    return api.get('/tasks/hierarchy/', { params: { project_id: projectId } });
  },

  // ガントチャート用
  getGanttData: async (projectId: number): Promise<AxiosResponse<{ data: GanttTask[]; links: GanttLink[] }>> => {
    return api.get('/tasks/gantt_data/', { params: { project_id: projectId } });
  },

  updateTaskSchedule: async (id: number, data: Partial<Task>): Promise<AxiosResponse<Task>> => {
    return api.post(`/tasks/${id}/update_schedule/`, data);
  },

  // タスク担当者
  getTaskAssignments: async (id: number): Promise<AxiosResponse<any[]>> => {
    return api.get(`/tasks/${id}/assignments/`);
  },

  addTaskAssignment: async (id: number, data: { user_id: number }): Promise<AxiosResponse> => {
    return api.post(`/tasks/${id}/assignments/`, data);
  },

  removeTaskAssignment: async (id: number, userId: number): Promise<AxiosResponse> => {
    return api.delete(`/tasks/${id}/remove_assignment/`, { data: { user_id: userId } });
  },

  // タスク依存関係
  getTaskDependencies: async (id: number): Promise<AxiosResponse<any>> => {
    return api.get(`/tasks/${id}/dependencies/`);
  },

  addTaskDependency: async (id: number, data: any): Promise<AxiosResponse> => {
    return api.post(`/tasks/${id}/dependencies/`, data);
  },

  removeTaskDependency: async (id: number, predecessorId: number): Promise<AxiosResponse> => {
    return api.delete(`/tasks/${id}/remove_dependency/`, { data: { predecessor_id: predecessorId } });
  },

  // タスクコメント
  getTaskComments: async (id: number): Promise<AxiosResponse<any[]>> => {
    return api.get(`/tasks/${id}/comments/`);
  },

  addTaskComment: async (id: number, data: { content: string }): Promise<AxiosResponse> => {
    return api.post(`/tasks/${id}/comments/`, data);
  },

  // タスク添付ファイル
  getTaskAttachments: async (id: number): Promise<AxiosResponse<any[]>> => {
    return api.get(`/tasks/${id}/attachments/`);
  },

  addTaskAttachment: async (id: number, formData: FormData): Promise<AxiosResponse> => {
    return api.post(`/tasks/${id}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;