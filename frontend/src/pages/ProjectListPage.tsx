import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types/index';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout/Layout';

interface ProjectFilters {
  search: string;
  status: string;
  category: string;
  sortBy: 'name' | 'created_at' | 'end_date' | 'progress';
  sortOrder: 'asc' | 'desc';
}

const ProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, fetchProjects, isLoading, error } = useProjectStore();
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'all',
    category: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // プロジェクト一覧を取得
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // プロジェクトデータを安全に取得
  const projectsArray = Array.isArray(projects) ? projects : [];

  // フィルタリングとソート
  useEffect(() => {
    let filtered = [...projectsArray];

    // 検索フィルター
    if (filters.search) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // ステータスフィルター
    if (filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    // カテゴリフィルター
    if (filters.category !== 'all') {
      filtered = filtered.filter(project => project.category === filters.category);
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      // 日付の場合は Date オブジェクトに変換
      if (filters.sortBy === 'created_at' || filters.sortBy === 'end_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // 進捗の場合は計算
      if (filters.sortBy === 'progress') {
        aValue = calculateProgress(a);
        bValue = calculateProgress(b);
      }

      // 文字列比較
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 数値・日付比較
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProjects(filtered);
  }, [projectsArray, filters]);

  // フィルター更新
  const updateFilter = (key: keyof ProjectFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // プロジェクトのステータス表示
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'active': { label: '進行中', color: 'bg-blue-100 text-blue-800' },
      'completed': { label: '完了', color: 'bg-green-100 text-green-800' },
      'on_hold': { label: '保留', color: 'bg-yellow-100 text-yellow-800' },
      'cancelled': { label: '中止', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // 進捗率の計算
  const calculateProgress = (project: Project): number => {
    const totalTasks = project.total_tasks || project.task_count || 0;
    const completedTasks = project.completed_tasks || 0;
    if (!totalTasks || totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // プロジェクト作成ページへの遷移
  const handleCreateProject = () => {
    navigate('/projects/create');
  };

  // プロジェクト詳細ページへの遷移
  const handleProjectClick = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  // 日付フォーマット関数
  const formatDate = (dateString: string) => {
    if (!dateString) return '未設定';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
  };

  if (isLoading) {
    return (
      <Layout showNavigation={false}>
        <div className="projects-page min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="h-6 bg-gray-300 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showNavigation={false}>
        <div className="projects-page min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false}>
      <div className="projects-page min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-sm sm:text-base text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>ダッシュボード</span>
                </button>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">プロジェクト一覧</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">
                    {filteredProjects.length}件のプロジェクト
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateProject}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-2 sm:ml-4"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新規プロジェクト</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* フィルター・検索エリア */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 検索 */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="プロジェクト名で検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ステータスフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                >
                  <option value="all">すべて</option>
                  <option value="active">進行中</option>
                  <option value="completed">完了</option>
                  <option value="on_hold">保留</option>
                  <option value="cancelled">中止</option>
                </select>
              </div>

              {/* ソート */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">並び順</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    updateFilter('sortBy', sortBy);
                    updateFilter('sortOrder', sortOrder);
                  }}
                >
                  <option value="created_at-desc">作成日 (新しい順)</option>
                  <option value="created_at-asc">作成日 (古い順)</option>
                  <option value="name-asc">名前 (A-Z)</option>
                  <option value="name-desc">名前 (Z-A)</option>
                  <option value="end_date-asc">終了予定日 (近い順)</option>
                  <option value="end_date-desc">終了予定日 (遠い順)</option>
                  <option value="progress-desc">進捗率 (高い順)</option>
                  <option value="progress-asc">進捗率 (低い順)</option>
                </select>
              </div>

              {/* 表示切り替え */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">表示</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    className={`flex-1 px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    className={`flex-1 px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* プロジェクト一覧 */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">プロジェクトがありません</h3>
              <p className="text-gray-600 mb-4">新しいプロジェクトを作成して始めましょう</p>
              <button
                onClick={handleCreateProject}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                プロジェクトを作成
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {filteredProjects.map((project) => {
                const status = getStatusDisplay(project.status);
                const progress = calculateProgress(project);

                return viewMode === 'grid' ? (
                  <div
                    key={project.id}
                    className="project-card bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg cursor-pointer transition-all duration-200 hover:border-blue-300"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    {/* ヘッダー */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                        {project.category && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded mt-1">
                            {project.category}
                          </span>
                        )}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* 説明 */}
                    {project.description && (
                      <p className="text-gray-600 text-sm mb-4 max-h-10 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {project.description}
                      </p>
                    )}

                    {/* 進捗 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">進捗</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 統計 */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="block font-medium text-gray-900">
                          {project.completed_tasks || 0}/{project.total_tasks || project.task_count || 0}
                        </span>
                        <span>タスク完了</span>
                      </div>
                      <div>
                        <span className="block font-medium text-gray-900">
                          {formatDate(project.end_date)}
                        </span>
                        <span>終了予定</span>
                      </div>
                    </div>

                    {/* チームメンバー */}
                    {project.member_count > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>{project.member_count}人のメンバー</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    key={project.id}
                    className="project-row bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-blue-300"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                      {/* 左側: プロジェクト情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                            {project.category && (
                              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {project.category}
                              </span>
                            )}
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-gray-600 text-sm mt-1 truncate">{project.description}</p>
                        )}
                      </div>

                      {/* 右側: 進捗と統計 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-3 sm:space-y-0">
                        <div className="w-full sm:w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">進捗</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* 統計 */}
                        <div className="flex items-center justify-between sm:justify-start sm:space-x-6 text-sm text-gray-600">
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {project.completed_tasks || 0}/{project.total_tasks || project.task_count || 0}
                            </div>
                            <div>タスク</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {project.member_count || 0}
                            </div>
                            <div>メンバー</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {formatDate(project.end_date)}
                            </div>
                            <div>終了予定</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectListPage;