// 認証サービス

import { apiClient } from './api';
import { LoginCredentials, AuthUser } from '@/types/user';
import { StandardResponse } from '@/types/api';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<{
    sessionId: string;
    user: AuthUser;
  }> {
    const response: StandardResponse<{
      session_id: string;
      user: AuthUser;
    }> = await apiClient.post('/auth/login', credentials);

    if (response.success && response.data) {
      // セッションIDを保存
      apiClient.setSessionId(response.data.session_id);
      
      return {
        sessionId: response.data.session_id,
        user: response.data.user,
      };
    }

    throw new Error('Login failed');
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // ログアウトは失敗してもクライアント側のセッションをクリア
      console.warn('Logout request failed:', error);
    } finally {
      apiClient.setSessionId(null);
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response: StandardResponse<AuthUser> = await apiClient.post('/auth/me');
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error('Failed to get current user');
  }

  async refreshToken(): Promise<void> {
    const response: StandardResponse = await apiClient.post('/auth/refresh');
    
    if (!response.success) {
      throw new Error('Failed to refresh token');
    }
  }

  isLoggedIn(): boolean {
    return apiClient.getSessionId() !== null;
  }
}

// シングルトンインスタンス
export const authService = new AuthService();