import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GanttChart from '../components/Gantt/GanttChart';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { Calendar, Plus, Save } from 'lucide-react';

const GanttPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project_id');

  const { projects, currentProject, fetchProjects, fetchProject } = useProjectStore();
  const {
    ganttData,
    fetchGanttData,
    updateTaskSchedule,
    createTask,
    deleteTask,
    isLoading,
    error
  } = useTaskStore();

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectId ? parseInt(projectId) : null
  );

  // プロジェクト一覧取得
  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
  }, [projects, fetchProjects]);

  // プロジェクト詳細とガントデータ取得
  useEffect(() => {
    if (selectedProjectId) {
      fetchProject(selectedProjectId);
      fetchGanttData(selectedProjectId);
    }
  }, [selectedProjectId, fetchProject, fetchGanttData]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = parseInt(e.target.value);
    setSelectedProjectId(projectId);
  };

  const handleTaskUpdate = async (taskId: number, updates: any) => {
    try {
      await updateTaskSchedule(taskId, updates);
      // ガントデータを再取得してUIに反映
      if (selectedProjectId) {
        fetchGanttData(selectedProjectId);
      }
    } catch (error) {
      console.error('Task update error:', error);
    }
  };

  const handleTaskCreate = async (task: any) => {
    try {
      await createTask(task);
      // ガントデータを再取得
      if (selectedProjectId) {
        fetchGanttData(selectedProjectId);
      }
    } catch (error) {
      console.error('Task create error:', error);
    }
  };

  const handleTaskDelete = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      // ガントデータを再取得
      if (selectedProjectId) {
        fetchGanttData(selectedProjectId);
      }
    } catch (error) {
      console.error('Task delete error:', error);
    }
  };

  const handleLinkCreate = async (link: any) => {
    try {
      // タスク依存関係API呼び出し（実装必要）
      console.log('Create link:', link);
    } catch (error) {
      console.error('Link create error:', error);
    }
  };

  const handleLinkDelete = async (linkId: number) => {
    try {
      // タスク依存関係削除API呼び出し（実装必要）
      console.log('Delete link:', linkId);
    } catch (error) {
      console.error('Link delete error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ガントチャート
              </h1>
              <p className="text-sm text-gray-600">
                プロジェクトのタスクとスケジュールを視覚的に管理
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (selectedProjectId) {
                  fetchGanttData(selectedProjectId);
                }
              }}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              更新
            </button>
          </div>
        </div>

        {/* プロジェクト選択 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              プロジェクト選択
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
                プロジェクト
              </label>
              <select
                id="project-select"
                value={selectedProjectId || ''}
                onChange={handleProjectChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">プロジェクトを選択してください</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {currentProject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プロジェクト情報
                </label>
                <div className="text-sm text-gray-600">
                  <p><strong>期間:</strong> {currentProject.start_date} 〜 {currentProject.end_date}</p>
                  <p><strong>ステータス:</strong> {
                    currentProject.status === 'active' ? 'アクティブ' :
                    currentProject.status === 'completed' ? '完了' : '休止中'
                  }</p>
                  <p><strong>タスク数:</strong> {currentProject.task_count}件</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* ガントチャート */}
        {selectedProjectId && ganttData ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentProject?.name} - ガントチャート
              </h3>
              <div className="text-sm text-gray-600">
                タスク数: {ganttData.data.length}件
              </div>
            </div>

            <GanttChart
              projectId={selectedProjectId}
              tasks={ganttData.data}
              links={ganttData.links}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
              onLinkCreate={handleLinkCreate}
              onLinkDelete={handleLinkDelete}
            />
          </div>
        ) : selectedProjectId && isLoading ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">ガントチャートを読み込み中...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                プロジェクトを選択してください
              </h3>
              <p className="text-sm text-gray-600">
                ガントチャートを表示するプロジェクトを上記から選択してください
              </p>
            </div>
          </div>
        )}

        {/* 操作ガイド */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">操作方法</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• タスクバーをドラッグして開始日・終了日を変更できます</li>
            <li>• タスクバーの右端をドラッグして期間を調整できます</li>
            <li>• タスクをダブルクリックして詳細を編集できます</li>
            <li>• タスク間をドラッグして依存関係を作成できます</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GanttPage;