// エラーハンドリングユーティリティ

import { APIError } from '@/types/api';

export interface ErrorDisplayInfo {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  autoClose?: boolean;
}

export class ErrorHandler {
  static handleAPIError(error: APIError): ErrorDisplayInfo {
    switch (error.code) {
      case 'AUTH_FAILED':
        return {
          title: '認証エラー',
          message: 'ユーザー名またはパスワードが間違っています',
          type: 'error'
        };

      case 'INVALID_SESSION':
        return {
          title: 'セッション切れ',
          message: 'セッションが切れました。再度ログインしてください',
          type: 'warning'
        };

      case 'ACCESS_DENIED':
        return {
          title: 'アクセス拒否',
          message: 'この操作を実行する権限がありません',
          type: 'error'
        };

      case 'NETWORK_ERROR':
        return {
          title: '接続エラー',
          message: 'サーバーに接続できませんでした。しばらく待ってから再試行してください',
          type: 'error'
        };

      case 'SERVER_ERROR':
        return {
          title: 'サーバーエラー',
          message: 'サーバーでエラーが発生しました。しばらく待ってから再試行してください',
          type: 'error'
        };

      default:
        return {
          title: 'エラー',
          message: error.message || '予期しないエラーが発生しました',
          type: 'error'
        };
    }
  }

  static handleGenericError(error: Error): ErrorDisplayInfo {
    console.error('Generic Error:', error);
    
    return {
      title: 'システムエラー',
      message: 'システムエラーが発生しました。ページを再読み込みしてください',
      type: 'error'
    };
  }

  static handleNetworkError(): ErrorDisplayInfo {
    return {
      title: 'ネットワークエラー',
      message: 'インターネット接続を確認してください',
      type: 'error'
    };
  }

  static getUserFriendlyMessage(error: unknown): ErrorDisplayInfo {
    if (error instanceof APIError) {
      return this.handleAPIError(error);
    }

    if (error instanceof Error) {
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return this.handleNetworkError();
      }
      return this.handleGenericError(error);
    }

    return {
      title: '不明なエラー',
      message: '不明なエラーが発生しました',
      type: 'error'
    };
  }
}