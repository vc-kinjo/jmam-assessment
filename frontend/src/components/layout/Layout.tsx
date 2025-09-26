'use client';

import React from 'react';
import { Navigation } from './Navigation';
import { useAuthStore } from '@/stores/auth';

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showNavigation = true 
}) => {
  const { user, isLoading } = useAuthStore();

  // 認証状態を確認中の場合はローディング画面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はナビゲーションを表示しない
  if (!user || !showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      
      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              © 2024 GunChart. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">
                プライバシーポリシー
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                利用規約
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                サポート
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};