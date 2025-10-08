// 認証ガードコンポーネント

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { authService } from '@/services/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'manager' | 'member';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requiredRole,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, getCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // セッションIDがある場合はユーザー情報を取得
      if (authService.isLoggedIn() && !user) {
        try {
          await getCurrentUser();
        } catch (error) {
          console.error('Failed to get current user:', error);
          if (requireAuth) {
            router.push('/login');
          }
        }
      } else if (requireAuth && !authService.isLoggedIn()) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [user, requireAuth, getCurrentUser, router]);

  // 認証が必要だがログインしていない場合
  if (requireAuth && !isAuthenticated) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    return null; // リダイレクト中
  }

  // ロール要件チェック
  if (requiredRole && user && user.role_level !== requiredRole && user.role_level !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600">このページにアクセスする権限がありません。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};