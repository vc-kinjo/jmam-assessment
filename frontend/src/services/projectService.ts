// プロジェクト管理サービス

import { apiClient } from './api';
import { Project, ProjectCreateRequest, ProjectUpdateRequest, ProjectSummary } from '@/types/project';

export class ProjectService {
  // プロジェクト一覧取得
  static async getProjects(params: {
    skip?: number;
    limit?: number;
    status?: string;
  } = {}) {
    return apiClient.post<{ projects: Project[] }>('/projects/list', {
      skip: params.skip || 0,
      limit: params.limit || 100,
      status: params.status,
    });
  }

  // プロジェクト作成
  static async createProject(projectData: ProjectCreateRequest) {
    return apiClient.post<{ project: Project; message: string }>('/projects/create', projectData);
  }

  // プロジェクト概要一覧取得（ダッシュボード用）
  static async getProjectSummaries() {
    return apiClient.post<{ summaries: ProjectSummary[] }>('/projects/summaries');
  }

  // プロジェクト詳細取得
  static async getProject(projectId: number) {
    return apiClient.post<{ project: Project }>(`/projects/detail/${projectId}`);
  }

  // プロジェクト更新
  static async updateProject(projectId: number, projectData: ProjectUpdateRequest) {
    return apiClient.post<{ project: Project; message: string }>(`/projects/update/${projectId}`, projectData);
  }

  // プロジェクト削除
  static async deleteProject(projectId: number) {
    return apiClient.post<{ message: string }>(`/projects/delete/${projectId}`);
  }

  // プロジェクトメンバー一覧取得
  static async getProjectMembers(projectId: number) {
    return apiClient.post<{ members: any[] }>(`/projects/members/${projectId}`);
  }

  // プロジェクトメンバー追加
  static async addProjectMember(projectId: number, memberData: { user_id: number; role: string }) {
    return apiClient.post<{ member: any; message: string }>(`/projects/members/add/${projectId}`, memberData);
  }

  // プロジェクトメンバー削除
  static async removeProjectMember(projectId: number, memberUserId: number) {
    return apiClient.post<{ message: string }>(`/projects/members/remove/${projectId}/${memberUserId}`);
  }
}