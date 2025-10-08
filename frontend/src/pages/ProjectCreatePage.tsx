import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useProjectStore } from '../stores/projectStore';

const ProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, fetchProjects, isLoading } = useProjectStore();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 空のプロジェクト作成フォーム用の状態
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    category: ''
  });

  // フォーム入力の更新
  const handleInputChange = (field: string, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (error) setError(null);
  };

  // 空のプロジェクト作成
  const handleCreateEmptyProject = async () => {
    if (!projectData.name.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }

    if (!projectData.end_date) {
      setError('終了予定日を入力してください');
      return;
    }

    if (new Date(projectData.end_date) <= new Date(projectData.start_date)) {
      setError('終了予定日は開始日より後の日付を選択してください');
      return;
    }

    try {
      setError(null);

      const project = await createProject({
        name: projectData.name,
        description: projectData.description,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        category: projectData.category,
        status: 'active'
      });

      console.log('Project created successfully:', { id: project?.id, name: project?.name });

      if (!project || !project.id) {
        throw new Error('プロジェクトIDが取得できませんでした');
      }

      // プロジェクト作成成功後、プロジェクト一覧を再取得してプロジェクト詳細ページに遷移
      await fetchProjects();
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      console.error('Project creation error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.message ||
                          err.message ||
                          'プロジェクトの作成に失敗しました';
      setError(errorMessage);
    }
  };

  return (
    <Layout>
      <div className="create-project-page min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">新規プロジェクト作成</h1>
                <p className="text-gray-600 mt-1">空のプロジェクトを作成するか、テンプレートを使用してください</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 空のプロジェクト作成 */}
            <div className="create-empty bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">空のプロジェクトを作成</h2>
                <p className="text-gray-600 text-sm">基本情報を入力して新しいプロジェクトを作成します</p>
              </div>

              <div className="space-y-4">
                {/* プロジェクト名 */}
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                    プロジェクト名 *
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="プロジェクト名を入力..."
                    value={projectData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
                    説明
                  </label>
                  <textarea
                    id="project-description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="プロジェクトの説明を入力..."
                    value={projectData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                {/* 開始日 */}
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                    開始日 *
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={projectData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>

                {/* 終了予定日 */}
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                    終了予定日 *
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={projectData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    min={projectData.start_date}
                  />
                </div>

                {/* カテゴリ */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ
                  </label>
                  <input
                    id="category"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="カテゴリを入力..."
                    value={projectData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  />
                </div>

                {/* 作成ボタン */}
                <button
                  onClick={handleCreateEmptyProject}
                  disabled={isLoading || !projectData.name.trim() || !projectData.end_date}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      作成中...
                    </div>
                  ) : (
                    'プロジェクトを作成'
                  )}
                </button>
              </div>
            </div>

            {/* テンプレート使用 */}
            <div className="create-template bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">テンプレートを使用</h2>
                <p className="text-gray-600 text-sm">定型的なプロジェクトを素早く開始できます</p>
              </div>

              <div className="space-y-4">
                {/* テンプレートの利点 */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">テンプレートの利点</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      事前定義されたタスクとスケジュール
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      業界のベストプラクティス
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      時間の大幅な短縮
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      カスタマイズ可能
                    </li>
                  </ul>
                </div>

                {/* 利用可能なテンプレート */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">利用可能なテンプレート</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Web開発プロジェクト</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">15タスク</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>マーケティングキャンペーン</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">12タスク</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>製品ローンチ</span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">20タスク</span>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-2">
                      他にも多数のテンプレートを用意
                    </div>
                  </div>
                </div>

                {/* テンプレート選択ボタン */}
                <button
                  onClick={() => alert('テンプレート機能は実装中です')}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  テンプレートを選択
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectCreatePage;