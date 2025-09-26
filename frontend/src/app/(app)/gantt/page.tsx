'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import { apiService } from '@/services/apiService';
import { GanttChart } from '@/components/gantt/GanttChart';
import { GanttControls } from '@/components/gantt/GanttControls';
import { GanttViewType } from '@/types/gantt';

export default function GanttPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ガントチャート設定
  const [viewType, setViewType] = useState<GanttViewType>('month');
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>();

  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await apiService.getProjects();
        setProjects(projectsData);
        
        // URLパラメータでプロジェクトが指定されている場合
        if (projectId) {
          const project = projectsData.find(p => p.id.toString() === projectId);
          if (project) {
            setSelectedProject(project);
          }
        } else if (projectsData.length > 0) {
          // 最初のプロジェクトを選択
          setSelectedProject(projectsData[0]);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchProjects();
  }, [projectId]);

  // 選択されたプロジェクトのタスクを取得
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProject) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tasksData = await apiService.getTasks({ project_id: selectedProject.id });
        setTasks(tasksData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [selectedProject]);

  // プロジェクト選択変更
  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id.toString() === projectId);
    setSelectedProject(project || null);
  };

  // タスク更新
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    try {
      const updatedTask = await apiService.updateTask(taskId, updates);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      ));
    } catch (err: any) {
      console.error('タスク更新エラー:', err.message);
    }
  };

  // タスク選択
  const handleTaskSelect = (task: Task | null) => {
    setSelectedTaskId(task?.id);
  };

  // タスク追加
  const handleAddTask = () => {
    // TODO: タスク追加モーダルを表示
    console.log('タスク追加');
  };

  // エクスポート
  const handleExport = () => {
    // TODO: ガントチャートエクスポート機能
    console.log('エクスポート');
  };

  // 印刷
  const handlePrint = () => {
    window.print();
  };

  // ズームイン
  const handleZoomIn = () => {
    const zoomSequence: GanttViewType[] = ['month', 'week', 'day'];
    const currentIndex = zoomSequence.indexOf(viewType);
    if (currentIndex < zoomSequence.length - 1) {
      setViewType(zoomSequence[currentIndex + 1]);
    }
  };

  // ズームアウト
  const handleZoomOut = () => {
    const zoomSequence: GanttViewType[] = ['day', 'week', 'month'];
    const currentIndex = zoomSequence.indexOf(viewType);
    if (currentIndex < zoomSequence.length - 1) {
      setViewType(zoomSequence[currentIndex + 1]);
    }
  };

  // プロジェクト期間計算
  const getProjectDateRange = () => {
    if (!selectedProject || tasks.length === 0) {
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      return { startDate: today, endDate };
    }

    const startDates = tasks
      .filter(task => task.planned_start_date)
      .map(task => new Date(task.planned_start_date!));
    
    const endDates = tasks
      .filter(task => task.planned_end_date)
      .map(task => new Date(task.planned_end_date!));

    const projectStartDate = new Date(selectedProject.start_date);
    const projectEndDate = new Date(selectedProject.end_date);

    const startDate = startDates.length > 0 
      ? new Date(Math.min(projectStartDate.getTime(), ...startDates.map(d => d.getTime())))
      : projectStartDate;

    const endDate = endDates.length > 0
      ? new Date(Math.max(projectEndDate.getTime(), ...endDates.map(d => d.getTime())))
      : projectEndDate;

    return { startDate, endDate };
  };

  const { startDate, endDate } = getProjectDateRange();

  return (
    <div className="gantt-page min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ガントチャート</h1>
              <p className="text-gray-600 mt-1">プロジェクトの進捗を視覚的に管理</p>
            </div>
            
            {/* プロジェクト選択 */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">プロジェクト:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedProject?.id.toString() || ''}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loading}
              >
                <option value="">プロジェクトを選択</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error ? (
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
        ) : !selectedProject ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">プロジェクトを選択してください</h3>
            <p className="text-gray-600">ガントチャートを表示するプロジェクトを選択してください</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* プロジェクト情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedProject.name}</h2>
                  {selectedProject.description && (
                    <p className="text-gray-600 mt-1">{selectedProject.description}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{tasks.length}</div>
                    <div>タスク</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {tasks.filter(task => task.status === 'completed').length}
                    </div>
                    <div>完了</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {Math.round((tasks.filter(task => task.status === 'completed').length / Math.max(tasks.length, 1)) * 100)}%
                    </div>
                    <div>進捗</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ガントチャートコントロール */}
            <GanttControls
              viewType={viewType}
              showDependencies={showDependencies}
              showCriticalPath={showCriticalPath}
              onViewTypeChange={setViewType}
              onToggleDependencies={() => setShowDependencies(!showDependencies)}
              onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onAddTask={handleAddTask}
              onExport={handleExport}
              onPrint={handlePrint}
              className="mb-6"
            />

            {/* ガントチャート */}
            {tasks.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <GanttChart
                  tasks={tasks}
                  dependencies={[]} // TODO: 依存関係データの実装
                  projectStartDate={startDate}
                  projectEndDate={endDate}
                  viewType={viewType}
                  showDependencies={showDependencies}
                  showCriticalPath={showCriticalPath}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskSelect={handleTaskSelect}
                  selectedTaskId={selectedTaskId}
                  className="h-96"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">タスクがありません</h3>
                <p className="text-gray-600 mb-4">このプロジェクトにはまだタスクが作成されていません</p>
                <button
                  onClick={handleAddTask}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  タスクを追加
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}