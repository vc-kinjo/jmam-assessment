// タスク管理サービス

import { apiClient } from './api';
import { Task, TaskCreateRequest, TaskUpdateRequest, TaskHierarchy, ValidPredecessorTask, MAX_TASK_LEVEL } from '@/types/task';

export class TaskService {
  // タスク一覧取得
  static async getTasks(params: {
    project_id: number;
    skip?: number;
    limit?: number;
    status?: string;
    assigned_to?: number;
  }) {
    return apiClient.post<{ tasks: Task[] }>('/tasks/list', {
      project_id: params.project_id,
      skip: params.skip || 0,
      limit: params.limit || 100,
      status: params.status,
      assigned_to: params.assigned_to,
    });
  }

  // タスク作成
  static async createTask(taskData: TaskCreateRequest) {
    return apiClient.post<{ task: Task; message: string }>('/tasks/create', taskData);
  }

  // タスク詳細取得
  static async getTask(taskId: number) {
    return apiClient.post<{ task: Task }>(`/tasks/detail/${taskId}`);
  }

  // タスク更新
  static async updateTask(taskId: number, taskData: TaskUpdateRequest) {
    console.log('TaskService.updateTask - taskId:', taskId, 'taskData:', taskData);
    console.log('TaskService.updateTask - predecessor_task_ids:', taskData.predecessor_task_ids);
    
    return apiClient.post<{ task: Task; message: string }>(`/tasks/update/${taskId}`, taskData);
  }

  // タスク削除
  static async deleteTask(taskId: number) {
    return apiClient.get<{ message: string }>(`/tasks/delete?task_id=${taskId}`);
  }

  // タスク担当者割り当て
  static async assignTask(taskId: number, userId: number) {
    return apiClient.post<{ assignment: any; message: string }>(`/tasks/assign/${taskId}`, {
      user_id: userId,
    });
  }

  // タスク担当者解除
  static async unassignTask(taskId: number, userId: number) {
    return apiClient.post<{ message: string }>(`/tasks/unassign/${taskId}/${userId}`);
  }

  // タスク依存関係取得
  static async getTaskDependencies(projectId: number) {
    return apiClient.get<any[]>(`/tasks/dependencies?project_id=${projectId}`);
  }

  // タスク依存関係作成
  static async createTaskDependency(dependencyData: {
    predecessor_id: number;
    successor_id: number;
    dependency_type?: string;
    lag_days?: number;
  }) {
    return apiClient.post<{ dependency: any; message: string }>('/tasks/dependencies', {
      predecessor_id: dependencyData.predecessor_id,
      successor_id: dependencyData.successor_id,
      dependency_type: dependencyData.dependency_type || 'finish_to_start',
      lag_days: dependencyData.lag_days || 0,
    });
  }

  // タスクコメント一覧取得
  static async getTaskComments(taskId: number) {
    return apiClient.post<{ comments: any[] }>(`/tasks/comments/${taskId}`);
  }

  // タスクコメント追加
  static async addTaskComment(taskId: number, comment: string) {
    return apiClient.post<{ comment: any; message: string }>(`/tasks/comments/add/${taskId}`, {
      comment,
    });
  }

  // タスク階層取得
  static async getTaskHierarchy(projectId: number) {
    return apiClient.get<TaskHierarchy[]>(`/api/projects/${projectId}/tasks/hierarchy`);
  }

  // 有効な先行タスク一覧取得
  static async getValidPredecessors(taskId: number) {
    return apiClient.get<ValidPredecessorTask[]>(`/api/tasks/${taskId}/valid-predecessors`);
  }

  // サブタスクの作成レベル制限チェック
  static canCreateSubtask(parentTask: Task | null): boolean {
    if (!parentTask) return true; // ルートレベルの場合
    return parentTask.level < MAX_TASK_LEVEL - 1; // 最大3世代（レベル0,1,2）まで作成可能
  }

  // タスクレベルに基づくインデント計算
  static getTaskIndent(level: number): number {
    return level * 20; // 20pxずつインデント
  }

  // ガンチャート用のAPIメソッド

  // タスク階層構造取得（ガンチャート用）
  static async getTaskHierarchyForGantt(projectId: number) {
    return apiClient.post<{ hierarchy: TaskHierarchy[] }>('/tasks/hierarchy', {
      project_id: projectId,
    });
  }

  // タスク依存関係一覧取得（ガンチャート用）
  static async getTaskDependenciesForGantt(projectId: number) {
    return apiClient.post<{ dependencies: any[] }>('/tasks/dependencies/list', {
      project_id: projectId,
    });
  }

  // タスクの親子関係更新
  static async updateTaskParent(taskId: number, parentTaskId: number | null, level: number = 0) {
    return apiClient.post<{ task: Task; message: string }>(`/tasks/update-parent/${taskId}`, {
      parent_task_id: parentTaskId,
      level: level,
    });
  }

  // 有効な先行タスク一覧取得（ガンチャート用）
  static async getValidPredecessorsForGantt(taskId: number, projectId: number) {
    return apiClient.post<{ predecessors: ValidPredecessorTask[] }>('/tasks/valid-predecessors', {
      task_id: taskId,
      project_id: projectId,
    });
  }

  // 親タスクの進捗率自動計算
  static async calculateParentProgress(projectId: number) {
    return apiClient.post<{ result: any; message: string }>('/tasks/calculate-progress', {
      project_id: projectId,
    });
  }
}