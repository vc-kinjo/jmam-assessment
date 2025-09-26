'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/apiService';
import { ProjectSummary } from '@/types/project';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_level: string;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    delayedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ローカルストレージからユーザー情報を取得
    const storedUser = localStorage.getItem('user');
    const storedSessionId = localStorage.getItem('sessionId');
    
    if (storedUser && storedSessionId) {
      setUser(JSON.parse(storedUser));
      setSessionId(storedSessionId);
      loadDashboardData();
    } else {
      // 認証情報がない場合はログインページに遷移
      router.push('/login');
    }
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const projectData = await apiService.getProjects();
      setProjects(projectData);
      
      // 統計データを計算
      const now = new Date();
      const activeProjects = projectData.filter(p => p.status === 'active');
      const completedProjects = projectData.filter(p => p.status === 'completed');
      const delayedProjects = projectData.filter(p => {
        const endDate = new Date(p.end_date);
        return p.status === 'active' && endDate < now;
      });

      const totalTasks = projectData.reduce((sum, p) => sum + p.total_tasks, 0);
      const completedTasks = projectData.reduce((sum, p) => sum + p.completed_tasks, 0);
      
      setStats({
        totalProjects: projectData.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        delayedProjects: delayedProjects.length,
        totalTasks,
        completedTasks,
        overdueTasks: 0, // Will need task-level data for accurate count
        upcomingTasks: totalTasks - completedTasks
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    router.push('/');
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const recentProjects = (projects || [])
    .filter(p => p.status === 'active')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                🔫 GunChart Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                ようこそ、{user.full_name}さん
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {/* Total Projects */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        総プロジェクト数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalProjects}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Projects */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600">🟢</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        進行中プロジェクト
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.activeProjects}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Projects */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  最近のプロジェクト
                </h2>
                {recentProjects.length > 0 ? (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/projects/${project.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
                          >
                            {project.name}
                          </Link>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              project.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                              project.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status === 'active' ? '進行中' : 
                               project.status === 'completed' ? '完了' : project.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {project.completed_tasks}/{project.total_tasks} タスク完了
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${project.total_tasks > 0 ? (project.completed_tasks / project.total_tasks) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">進行中のプロジェクトはありません</p>
                )}
                {/* <div className="mt-4">
                  <Link
                    href="/projects"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    すべてのプロジェクトを表示 →
                  </Link>
                </div> */}
              </div>
            </div>

            {/* User Info & Quick Actions */}
            <div className="space-y-6">
              {/* User Information */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    ユーザー情報
                  </h2>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">ユーザー名</dt>
                      <dd className="text-sm text-gray-900">{user.username}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">フルネーム</dt>
                      <dd className="text-sm text-gray-900">{user.full_name}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">ロール</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role_level === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : user.role_level === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role_level === 'admin' ? '管理者' : 
                           user.role_level === 'manager' ? 'プロジェクト管理者' : 'メンバー'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    クイックアクション
                  </h2>
                  <div className="space-y-3">
                    <Link 
                      href="/projects/create"
                      className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600">➕</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">新規プロジェクト作成</p>
                      </div>
                    </Link>

                    <Link 
                      href="/projects"
                      className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600">📊</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">プロジェクト一覧</p>
                      </div>
                    </Link>

                    <Link 
                      href="/gantt"
                      className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600">📈</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">ガントチャート</p>
                      </div>
                    </Link>

                    {user.role_level === 'admin' && (
                      <Link 
                        href="/admin/users"
                        className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600">👥</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">ユーザー管理</p>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}