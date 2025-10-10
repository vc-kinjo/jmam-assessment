import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import Layout from '../components/Layout/Layout';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    console.log('DashboardPage useEffect triggered');
    let isMounted = true;

    const loadProjects = async () => {
      try {
        console.log('DashboardPage: Loading projects...');
        if (isMounted) {
          await fetchProjects();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch projects:', error);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [])

  // プロジェクトデータを安全に取得
  const projectsArray = Array.isArray(projects) ? projects : [];
  console.log('Dashboard projects data:', projectsArray);

  // 統計情報を計算
  const stats = {
    totalProjects: projectsArray.length,
    activeProjects: projectsArray.filter(p => p.status === 'active').length,
  };

  // 最近のプロジェクトを取得（進行中かつ作成日時順）
  const activeProjects = projectsArray.filter(p => p.status === 'active');
  console.log('Active projects:', activeProjects);

  const recentProjects = activeProjects
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);
  console.log('Recent projects:', recentProjects);

  return (
    <Layout>
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
                            to={`/projects/${project.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
                          >
                            {project.name}
                          </Link>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              進行中
                            </span>
                            <span className="text-xs text-gray-500">
                              {project.completed_tasks || 0}/{project.task_count || project.total_tasks || 0} タスク完了
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(project.task_count || project.total_tasks || 0) > 0
                                  ? ((project.completed_tasks || 0) / (project.task_count || project.total_tasks || 0)) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">進行中のプロジェクトはありません</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
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
                      <dd className="text-sm text-gray-900">{user?.username}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">フルネーム</dt>
                      <dd className="text-sm text-gray-900">{user?.full_name}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">ロール</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user?.role_level === 'admin'
                            ? 'bg-red-100 text-red-800'
                            : user?.role_level === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user?.role_level === 'admin' ? '管理者' :
                           user?.role_level === 'manager' ? 'プロジェクト管理者' : 'メンバー'}
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
                    <button
                      onClick={() => navigate('/projects/create')}
                      className="flex items-center w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600">➕</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">新規プロジェクト作成</p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/projects')}
                      className="flex items-center w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600">📊</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">プロジェクト一覧</p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/gantt')}
                      className="flex items-center w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600">📈</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">ガントチャート</p>
                      </div>
                    </button>

                    {user?.role_level === 'admin' && (
                      <button
                        onClick={() => alert('ユーザー管理ページは実装中です')}
                        className="flex items-center w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600">👥</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">ユーザー管理</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default DashboardPage;