import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GanttPage from './pages/GanttPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectDetailPage from './pages/ProjectDetailPage';

// QueryClientの設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      cacheTime: 10 * 60 * 1000, // 10分
    },
  },
});

// 認証が必要なルートを保護するコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, getCurrentUser, user } = useAuthStore();

  useEffect(() => {
    console.log('ProtectedRoute useEffect triggered:', { isAuthenticated, user: !!user });
    let isMounted = true;

    const loadUser = async () => {
      if (isAuthenticated && !user && isMounted) {
        try {
          console.log('ProtectedRoute: Loading user...');
          await getCurrentUser();
        } catch (error) {
          if (isMounted) {
            console.error('Failed to get current user:', error);
          }
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* パブリックルート */}
            <Route
              path="/login"
              element={
                <Layout showNavigation={false}>
                  <LoginPage />
                </Layout>
              }
            />

            {/* プロテクトされたルート */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gantt"
              element={
                <ProtectedRoute>
                  <GanttPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
                    <p className="mt-2 text-gray-600">プロジェクト一覧ページは実装中です。</p>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/create"
              element={
                <ProtectedRoute>
                  <ProjectCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
                    <p className="mt-2 text-gray-600">プロフィールページは実装中です。</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* デフォルトリダイレクト */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404ページ（後で実装） */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
