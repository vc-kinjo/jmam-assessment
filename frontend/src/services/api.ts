// APIクライアント基盤

import { StandardRequest, StandardResponse, APIError } from '@/types/api';

class APIClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
  private sessionId: string | null = null;

  constructor() {
    // ブラウザからセッションIDを取得
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('sessionId');
    }
  }

  setSessionId(sessionId: string | null) {
    this.sessionId = sessionId;
    if (typeof window !== 'undefined') {
      if (sessionId) {
        localStorage.setItem('sessionId', sessionId);
      } else {
        localStorage.removeItem('sessionId');
      }
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit & { data?: any } = {}
  ): Promise<StandardResponse<T>> {
    const { data, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // セッションIDをヘッダーに追加
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      mode: 'cors',
      credentials: 'include',
      body: data ? JSON.stringify(data) : fetchOptions.body,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const result: StandardResponse<T> = await response.json();

      if (!result.success && result.error) {
        throw new APIError(result.error.code, result.error.message, result.error.details);
      }

      return result;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // ネットワークエラーなど
      throw new APIError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<StandardResponse<T>> {
    const requestData: StandardRequest = {
      data: data || {},
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      data: requestData,
    });
  }

  async get<T = any>(endpoint: string): Promise<StandardResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<StandardResponse<T>> {
    const requestData: StandardRequest = {
      data: data || {},
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      data: requestData,
    });
  }

  async delete<T = any>(endpoint: string): Promise<StandardResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// シングルトンインスタンス
export const apiClient = new APIClient();