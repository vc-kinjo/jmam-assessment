'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // アプリケーション開始時に認証状態を初期化
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
};