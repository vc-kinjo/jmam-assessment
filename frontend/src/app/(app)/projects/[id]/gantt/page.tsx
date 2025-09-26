'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { GanttViewType } from '@/types/gantt';
import { SimpleWamraGantt } from '@/components/gantt/SimpleWamraGantt';
import { GanttControls } from '@/components/gantt/GanttControls';
import { TaskEditor } from '@/components/gantt/TaskEditor';
import { useProjectStore } from '@/stores/projectStore';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

export default function ProjectGanttPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params?.id as string);
  
  // Store hooks
  const { selectedProject, fetchProject } = useProjectStore();
  const { tasks, fetchTasks, createTask, updateTask } = useTaskStore();
  const { user, initializeAuth, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { addNotification } = useNotificationStore();

  // Local state
  const [viewType, setViewType] = useState<GanttViewType>('month');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 認証を初期化
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // プロジェクトとタスクデータを取得
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchProject(projectId),
          fetchTasks({ project_id: projectId })
        ]);
      } catch (error) {
        console.error('Failed to load project data:', error);
        addNotification('error', 'プロジェクトデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId, fetchProject, fetchTasks, addNotification]);

  // プロジェクトの期間を計算
  const projectStartDate = selectedProject?.start_date 
    ? new Date(selectedProject.start_date)
    : new Date();
  
  const projectEndDate = selectedProject?.end_date 
    ? new Date(selectedProject.end_date)
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3ヶ月後

  // ガントチャートイベントハンドラー
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    try {
      const success = await updateTask(taskId, updates);
      if (success) {
        addNotification('success', 'タスクが更新されました');
      }
    } catch (error) {
      console.error('Task update failed:', error);
      addNotification('error', 'タスクの更新に失敗しました');
    }
  };

  const handleTaskSelect = (task: Task | null) => {
    setSelectedTask(task);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsTaskEditorOpen(true);
  };

  const handleEditTask = () => {
    if (selectedTask) {
      setIsTaskEditorOpen(true);
    }
  };

  const handleTaskSave = async (taskData: Partial<Task>) => {
    try {
      if (selectedTask) {
        // タスク更新
        const success = await updateTask(selectedTask.id, taskData);
        if (success) {
          addNotification('success', 'タスクが更新されました');
          setIsTaskEditorOpen(false);
        }
      } else {
        // 新しいタスク作成
        const success = await createTask({
          ...taskData,
          project_id: projectId
        });
        if (success) {
          addNotification('success', 'タスクが作成されました');
          setIsTaskEditorOpen(false);
        }
      }
    } catch (error) {
      console.error('Task save failed:', error);
      addNotification('error', 'タスクの保存に失敗しました');
    }
  };

  // ズーム処理（簡易版）
  const handleZoomIn = () => {
    const zoomOrder: GanttViewType[] = ['month', 'week', 'day'];
    const currentIndex = zoomOrder.indexOf(viewType);
    if (currentIndex < zoomOrder.length - 1) {
      setViewType(zoomOrder[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const zoomOrder: GanttViewType[] = ['day', 'week', 'month'];
    const currentIndex = zoomOrder.indexOf(viewType);
    if (currentIndex < zoomOrder.length - 1) {
      setViewType(zoomOrder[currentIndex + 1]);
    }
  };

  // エクスポート処理（簡易版）
  const handleExport = () => {
    addNotification('info', 'エクスポート機能は開発中です');
  };

  // 印刷処理（簡易版）
  const handlePrint = () => {
    window.print();
  };

  // 認証が完了していない場合は待機
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!isAuthenticated || !user) {
    router.push('/login');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">ログインページにリダイレクト中...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">プロジェクトが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-page h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="page-header bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedProject.name} - ガントチャート
            </h1>
            <p className="text-gray-600 mt-1">
              期間: {projectStartDate.toLocaleDateString()} - {projectEndDate.toLocaleDateString()}
            </p>
          </div>
          
          {/* アクションボタン */}
          <div className="flex items-center space-x-3">
            {selectedTask && (
              <button
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
                onClick={handleEditTask}
              >
                タスク編集
              </button>
            )}
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              onClick={handleAddTask}
            >
              新しいタスク
            </button>
          </div>
        </div>
      </div>

      {/* コントロールバー */}
      <GanttControls
        viewType={viewType}
        onViewTypeChange={setViewType}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onAddTask={handleAddTask}
        onExport={handleExport}
        onPrint={handlePrint}
      />

      {/* ガントチャート */}
      <div className="gantt-container flex-1 overflow-hidden">
        <SimpleWamraGantt
          tasks={tasks}
          projectId={projectId}
          onTaskUpdate={handleTaskUpdate}
          onTaskSelect={handleTaskSelect}
          selectedTaskId={selectedTask?.id}
          className="w-full h-full"
        />
      </div>

      {/* タスクエディター */}
      <TaskEditor
        task={selectedTask}
        isOpen={isTaskEditorOpen}
        onClose={() => setIsTaskEditorOpen(false)}
        onSave={handleTaskSave}
        projectId={projectId}
        allTasks={tasks}
      />

      {/* サイドバー情報（選択中のタスク） */}
      {selectedTask && (
        <div className="task-info-sidebar fixed right-0 top-0 w-80 h-full bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">タスク詳細</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setSelectedTask(null)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedTask.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500">ステータス</span>
                  <span className="text-gray-900">{selectedTask.status}</span>
                </div>
                <div>
                  <span className="block text-gray-500">優先度</span>
                  <span className="text-gray-900">{selectedTask.priority}</span>
                </div>
                <div>
                  <span className="block text-gray-500">進捗率</span>
                  <span className="text-gray-900">{selectedTask.progress_rate}%</span>
                </div>
                <div>
                  <span className="block text-gray-500">見積時間</span>
                  <span className="text-gray-900">{selectedTask.estimated_hours}h</span>
                </div>
              </div>

              {selectedTask.planned_start_date && (
                <div>
                  <span className="block text-gray-500 text-sm">開始日</span>
                  <span className="text-gray-900">{new Date(selectedTask.planned_start_date).toLocaleDateString()}</span>
                </div>
              )}

              {selectedTask.planned_end_date && (
                <div>
                  <span className="block text-gray-500 text-sm">終了日</span>
                  <span className="text-gray-900">{new Date(selectedTask.planned_end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}