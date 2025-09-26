// 統合APIサービス

import { apiClient } from './api';
import { Project, ProjectSummary } from '@/types/project';
import { Task } from '@/types/task';
import { User } from '@/types/user';

class ApiService {
  // プロジェクト関連
  async getProjects(): Promise<ProjectSummary[]> {
    try {
      // BFFのGETエンドポイントは直接配列を返すため、fetchで直接呼び出す
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projects = await response.json();
      
      // エラーオブジェクトが返された場合
      if (projects.error) {
        throw new Error(projects.error);
      }
      
      // 配列でない場合は空配列を返す
      if (!Array.isArray(projects)) {
        return [];
      }
      
      // Transform backend data to match ProjectSummary interface
      return projects.map((project: any) => ({
        ...project,
        progress_rate: 0,
        progress: 0,
        task_count: 0,
        completed_task_count: 0,
        total_tasks: 0,
        completed_tasks: 0,
        member_count: 1 // Default to 1 (creator)
      }));
    } catch (error) {
      console.error('Failed to get projects:', error);
      return [];
    }
  }

  async getProject(id: number): Promise<Project> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/projects/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const project = await response.json();
      
      // BFFがエラーオブジェクトを返した場合
      if (project.error) {
        throw new Error(project.error);
      }
      
      return project;
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const project = await response.json();
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  }

  // タスク関連
  async getTasks(params?: { project_id?: number }): Promise<Task[]> {
    try {
      const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tasks = await response.json();
      
      // BFFがエラーオブジェクトを返した場合
      if (tasks.error) {
        throw new Error(tasks.error);
      }
      
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  async getTask(id: number): Promise<Task> {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    try {
      console.log('apiService.createTask - Sending data:', data);
      
      // Step 1: 基本タスク情報を作成（predecessor_task_ids除く）
      const taskData = { ...data };
      const predecessorIds = taskData.predecessor_task_ids;
      delete taskData.predecessor_task_ids; // 依存関係は別で処理
      
      console.log('apiService.createTask - Creating basic task:', taskData);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const task = await response.json();
      console.log('apiService.createTask - Received task:', task);
      
      // BFFがエラーオブジェクトを返した場合
      if (task.error) {
        throw new Error(task.error);
      }
      
      // Step 2: predecessor_task_idsがある場合、依存関係を作成
      if (predecessorIds && predecessorIds.length > 0) {
        console.log('apiService.createTask - Creating dependencies for new task:', predecessorIds);
        
        try {
          // 各先行タスクとの依存関係を作成
          for (const predecessorId of predecessorIds) {
            await this.createSingleDependency(predecessorId, task.id);
          }
          
          // 依存関係作成後、正確な情報でタスクを返す
          const finalTask = {
            ...task,
            predecessor_task_ids: predecessorIds
          };
          
          console.log('apiService.createTask - Final task with dependencies:', finalTask);
          return finalTask;
        } catch (depError) {
          console.error('Failed to create dependencies for new task:', depError);
          // 依存関係作成に失敗してもタスク作成は成功しているのでタスクを返す
          return {
            ...task,
            predecessor_task_ids: predecessorIds
          };
        }
      }
      
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    try {
      console.log('apiService.updateTask - Updating task ID:', id, 'with data:', data);
      
      // Step 1: 基本タスク情報を更新（predecessor_task_ids除く）
      const taskData = { ...data };
      delete taskData.predecessor_task_ids; // 依存関係は別で処理
      
      console.log('apiService.updateTask - Sending basic task data:', taskData);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const task = await response.json();
      console.log('apiService.updateTask - Received updated task:', task);
      
      // BFFがエラーオブジェクトを返した場合
      if (task.error) {
        throw new Error(task.error);
      }
      
      // Step 2: predecessor_task_idsが変更された場合、依存関係を更新
      if (data.predecessor_task_ids !== undefined) {
        console.log('apiService.updateTask - Managing dependencies manually');
        console.log('apiService.updateTask - New predecessor_task_ids:', data.predecessor_task_ids);
        
        try {
          await this.updateTaskDependenciesManually(id, task.project_id, data.predecessor_task_ids);
          
          // 依存関係更新後、正確な情報でタスクを返す
          const finalTask = {
            ...task,
            predecessor_task_ids: data.predecessor_task_ids || []
          };
          
          console.log('apiService.updateTask - Final task with updated dependencies:', finalTask);
          return finalTask;
        } catch (depError) {
          console.error('Failed to manage dependencies manually:', depError);
          // 依存関係管理に失敗してもタスク更新は成功しているのでタスクを返す
          return {
            ...task,
            predecessor_task_ids: data.predecessor_task_ids || []
          };
        }
      }
      
      return task;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // BFFがエラーオブジェクトを返した場合
      if (result.error) {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  // タスク依存関係取得
  async getTaskDependencies(projectId?: number): Promise<any[]> {
    try {
      const query = projectId ? `?project_id=${projectId}` : '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/dependencies${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const dependencies = await response.json();
      
      // BFFがエラーオブジェクトを返した場合
      if (dependencies.error) {
        throw new Error(dependencies.error);
      }
      
      return Array.isArray(dependencies) ? dependencies : [];
    } catch (error) {
      console.error('Failed to get task dependencies:', error);
      return [];
    }
  }

  // 依存関係を含むタスク取得
  async getTaskWithDependencies(taskId: number): Promise<Task> {
    try {
      // 基本タスク情報を取得
      const task = await this.getTask(taskId);
      
      // プロジェクトの依存関係を取得
      const dependencies = await this.getTaskDependencies(task.project_id);
      
      // このタスクの先行タスクIDを抽出
      const predecessorIds = dependencies
        .filter(dep => dep.successor_id === taskId)
        .map(dep => dep.predecessor_id);
      
      // predecessor_task_idsをタスクに追加
      return {
        ...task,
        predecessor_task_ids: predecessorIds
      };
    } catch (error) {
      console.error('Failed to get task with dependencies:', error);
      throw error;
    }
  }

  // タスク依存関係作成
  async createTaskDependency(predecessorId: number, successorId: number): Promise<void> {
    try {
      console.log('apiService.createTaskDependency - Creating dependency:', predecessorId, '->', successorId);
      
      // fetchを直接使用（他のメソッドと同様）
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify({
          predecessor_id: predecessorId,
          successor_id: successorId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('apiService.createTaskDependency - Response data:', result);
      
      // BFFがエラーオブジェクトを返した場合
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      console.log('apiService.createTaskDependency - Dependency created successfully');
    } catch (error) {
      console.error('Failed to create task dependency:', error);
      throw error;
    }
  }

  // 依存関係を手動で管理（既存削除→新規追加）
  async updateTaskDependenciesManually(taskId: number, projectId: number, newPredecessorIds: number[]): Promise<void> {
    try {
      console.log('apiService.updateTaskDependenciesManually - Task:', taskId, 'New predecessors:', newPredecessorIds);
      
      // Step 1: 現在の依存関係を取得
      const currentDependencies = await this.getTaskDependencies(projectId);
      const currentTaskDeps = currentDependencies.filter(dep => dep.successor_id === taskId);
      const currentPredecessorIds = currentTaskDeps.map(dep => dep.predecessor_id);
      
      console.log('apiService.updateTaskDependenciesManually - Current predecessors:', currentPredecessorIds);
      
      // Step 2: 削除する依存関係を特定
      const toDelete = currentTaskDeps.filter(dep => !newPredecessorIds.includes(dep.predecessor_id));
      
      // Step 3: 追加する依存関係を特定
      const toAdd = newPredecessorIds.filter(predId => !currentPredecessorIds.includes(predId));
      
      console.log('apiService.updateTaskDependenciesManually - To delete:', toDelete.map(d => d.id));
      console.log('apiService.updateTaskDependenciesManually - To add:', toAdd);
      
      // Step 4: 削除処理
      for (const dependency of toDelete) {
        try {
          await this.deleteSingleDependency(dependency.id);
          console.log(`Successfully deleted dependency ${dependency.id}: ${dependency.predecessor_id} -> ${dependency.successor_id}`);
        } catch (error) {
          console.warn(`Failed to delete dependency ${dependency.id}:`, error);
        }
      }
      
      // Step 5: 追加処理
      for (const predecessorId of toAdd) {
        try {
          await this.createSingleDependency(predecessorId, taskId);
          console.log(`Successfully created dependency: ${predecessorId} -> ${taskId}`);
        } catch (error) {
          console.warn(`Failed to create dependency ${predecessorId} -> ${taskId}:`, error);
        }
      }
      
      console.log('apiService.updateTaskDependenciesManually - Dependencies updated successfully');
    } catch (error) {
      console.error('Failed to update task dependencies manually:', error);
      throw error;
    }
  }

  // 単一依存関係削除
  async deleteSingleDependency(dependencyId: number): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/dependencies/${dependencyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
      },
      mode: 'cors',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // 単一依存関係作成
  async createSingleDependency(predecessorId: number, successorId: number): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/tasks/dependencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({
        predecessor_id: predecessorId,
        successor_id: successorId,
        dependency_type: 'finish_to_start',
        lag_days: 0
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (result && result.error) {
      throw new Error(result.error);
    }
  }

  // タスクの依存関係削除（既存の依存関係を個別に削除）
  async deleteTaskDependencies(taskId: number): Promise<void> {
    try {
      console.log('apiService.deleteTaskDependencies - Deleting dependencies for task:', taskId);
      
      // 最初に現在の依存関係を取得
      const dependencies = await this.getTaskDependencies();
      const taskDependencies = dependencies.filter(dep => dep.successor_id === taskId);
      
      console.log('apiService.deleteTaskDependencies - Found dependencies to delete:', taskDependencies);
      
      // 各依存関係を個別に削除
      for (const dependency of taskDependencies) {
        try {
          await this.deleteSingleDependency(dependency.id);
          console.log(`Successfully deleted dependency ${dependency.id}`);
        } catch (error) {
          console.warn(`Error deleting dependency ${dependency.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to delete task dependencies:', error);
      // 依存関係削除は失敗してもプロセスを続行
    }
  }

  // ユーザー関連
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    try {
      // BFF returns users array directly, not in StandardResponse format
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const users = await response.json();
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(data: Partial<User>): Promise<User> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiClient.getSessionId() ? { 'X-Session-ID': apiClient.getSessionId()! } : {})
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const user = await response.json();
      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }
}

export const apiService = new ApiService();