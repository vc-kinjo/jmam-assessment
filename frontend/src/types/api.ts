// API共通型定義

export interface StandardRequest<T = any> {
  data: T;
  metadata?: {
    requestId?: string;
    timestamp?: string;
  };
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMetadata {
  request_id: string;
  timestamp: string;
  processing_time?: number;
}

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;
  metadata: ResponseMetadata;
}

// API エラークラス
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}