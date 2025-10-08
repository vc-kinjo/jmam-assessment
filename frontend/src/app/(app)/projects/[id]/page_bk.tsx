'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import { apiService } from '@/services/apiService';
import { SimpleWamraGantt } from '@/components/gantt/SimpleWamraGantt';
import { GanttControls } from '@/components/gantt/GanttControls';
import { TaskCreateModal } from '@/components/modals/TaskCreateModal';
import { TaskDetailModal } from '@/components/modals/TaskDetailModal';
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';
import { GanttViewType } from '@/types/gantt';
import { User } from '@/types/user';
import { TaskCreateRequest } from '@/types/task';
import { TaskService } from '@/services/taskService';

// 日付文字列を確実にローカル日付として解析
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // monthは0ベースなので-1
}

// タスクを階層順序でソートする関数
const sortTasksHierarchically = (tasks: Task[]): Task[] => {
  const taskMap = new Map<number, Task>();
  const rootTasks: Task[] = [];
  const childTasks = new Map<number, Task[]>();

  // タスクをマップに格納し、親子関係を整理
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    if (task.parent_task_id === null || task.parent_task_id === undefined) {
      rootTasks.push(task);
    } else {
      if (!childTasks.has(task.parent_task_id)) {
        childTasks.set(task.parent_task_id, []);
      }
      childTasks.get(task.parent_task_id)!.push(task);
    }
  });

  // 階層順序でソート（深度優先探索）
  const sortedTasks: Task[] = [];
  
  const traverseTask = (task: Task) => {
    sortedTasks.push(task);
    const children = childTasks.get(task.id) || [];
    // sort_orderがある場合はそれに従ってソート、なければIDでソート
    children.sort((a, b) => (a.sort_order || a.id) - (b.sort_order || b.id));
    children.forEach(child => traverseTask(child));
  };

  // ルートタスクをソートしてから順次処理
  rootTasks.sort((a, b) => (a.sort_order || a.id) - (b.sort_order || b.id));
  rootTasks.forEach(task => traverseTask(task));

  return sortedTasks;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ガントチャート設定
  const [viewType, setViewType] = useState<GanttViewType>('month');
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>();
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // 削除確認ダイアログ用の状態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // プロジェクト情報、タスク一覧、依存関係、ユーザー一覧を並行取得
        const [projectData, tasksData, dependenciesData, usersData] = await Promise.all([
          apiService.getProject(projectId),
          apiService.getTasks({ project_id: projectId }),
          apiService.getTaskDependencies(projectId),
          apiService.getUsers()
        ]);
        
        console.log('Fetched dependencies:', dependenciesData); // デバッグログ
        
        // タスクを階層順序でソート
        const sortedTasks = sortTasksHierarchically(tasksData);
        console.log('Sorted tasks:', sortedTasks); // デバッグログ
        
        // タスクに先行タスクIDを設定
        const tasksWithPredecessors = sortedTasks.map(task => {
          const predecessors = dependenciesData
            .filter(dep => dep.successor_id === task.id)
            .map(dep => dep.predecessor_id);
          
          if (predecessors.length > 0) {
            console.log(`Task "${task.name}" (ID: ${task.id}) has predecessors:`, predecessors);
          }
          
          return {
            ...task,
            predecessor_task_ids: predecessors.length > 0 ? predecessors : []
          };
        });
        
        console.log('Tasks with predecessors:', tasksWithPredecessors);
        
        // 依存関係データも詳細をログ出力
        console.log('Dependencies data details:', dependenciesData); // デバッグログ
        
        setProject(projectData);
        setTasks(tasksWithPredecessors);
        setDependencies(dependenciesData);
        setUsers(usersData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && !isNaN(projectId)) {
      fetchData();
    } else {
      setError('無効なプロジェクトIDです');
      setLoading(false);
    }
  }, [projectId]);

  // タスク更新
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    try {
      console.log('ProjectPage.handleTaskUpdate - taskId:', taskId, 'updates:', updates);
      console.log('ProjectPage.handleTaskUpdate - predecessor_task_ids:', updates.predecessor_task_ids);
      
      const updatedTask = await apiService.updateTask(taskId, updates);
      
      console.log('ProjectPage.handleTaskUpdate - updatedTask:', updatedTask);
      
      // predecessor_task_idsが更新された場合、依存関係データを再取得
      if (updates.predecessor_task_ids !== undefined) {
        try {
          console.log('ProjectPage.handleTaskUpdate - Refreshing dependencies after task update');
          const refreshedDependencies = await apiService.getTaskDependencies(projectId);
          console.log('ProjectPage.handleTaskUpdate - Refreshed dependencies:', refreshedDependencies);
          
          setDependencies(refreshedDependencies);
          
          // 全タスクの先行タスクIDを更新
          setTasks(prevTasks => {
            return prevTasks.map(task => {
              const predecessors = refreshedDependencies
                .filter(dep => dep.successor_id === task.id)
                .map(dep => dep.predecessor_id);
              
              return {
                ...task,
                predecessor_task_ids: predecessors.length > 0 ? predecessors : [],
                // 更新されたタスクの場合は、他の更新内容も反映
                ...(task.id === taskId ? updatedTask : {})
              };
            });
          });
          
          // 更新されたタスクの最新の先行タスク情報を取得
          const updatedPredecessors = refreshedDependencies
            .filter(dep => dep.successor_id === taskId)
            .map(dep => dep.predecessor_id);
          
          const taskWithLatestPredecessors = {
            ...updatedTask,
            predecessor_task_ids: updatedPredecessors
          };
          
          console.log('ProjectPage.handleTaskUpdate - Task with latest predecessors:', taskWithLatestPredecessors);
          
          // 現在選択されているタスクが更新されたタスクの場合、selectedTaskも更新
          setSelectedTask(prevSelected => 
            prevSelected && prevSelected.id === taskId ? taskWithLatestPredecessors : prevSelected
          );
          
          return taskWithLatestPredecessors;
        } catch (depError) {
          console.error('依存関係の再取得に失敗:', depError);
          // 依存関係取得に失敗した場合はフォールバック処理
          const taskWithPredecessors = {
            ...updatedTask,
            predecessor_task_ids: updates.predecessor_task_ids || []
          };
          
          setTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, ...taskWithPredecessors } : task
          ));
          
          setSelectedTask(prevSelected => 
            prevSelected && prevSelected.id === taskId ? taskWithPredecessors : prevSelected
          );
          
          return taskWithPredecessors;
        }
      } else {
        // predecessor_task_idsが更新されていない場合は通常の処理
        const taskWithPredecessors = {
          ...updatedTask,
          predecessor_task_ids: updatedTask.predecessor_task_ids || []
        };
        
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...taskWithPredecessors } : task
        ));
        
        setSelectedTask(prevSelected => 
          prevSelected && prevSelected.id === taskId ? taskWithPredecessors : prevSelected
        );
        
        return taskWithPredecessors;
      }
    } catch (err: any) {
      console.error('タスク更新エラー:', err.message);
      throw err; // エラーを再投げしてモーダル側でキャッチできるようにする
    }
  };

  // タスク選択（ガントチャート用）
  const handleTaskSelect = (task: Task | null) => {
    setSelectedTaskId(task?.id);
    // ガントチャートからのタスク選択時も詳細モーダルを開く
    if (task) {
      handleTaskClick(task);
    }
  };

  // タスク詳細モーダルを開く
  const handleTaskClick = (task: Task) => {
    console.log('ProjectPage.handleTaskClick - clicked task:', task);
    
    // 他のモーダルを閉じる
    setShowTaskCreateModal(false);
    
    // 最新のタスク情報をtasksリストから取得
    const latestTask = tasks.find(t => t.id === task.id) || task;
    console.log('ProjectPage.handleTaskClick - latest task from tasks list:', latestTask);
    
    setSelectedTask(latestTask);
    setShowTaskDetailModal(true);
  };

  // タスク削除の確認ダイアログを開く
  const handleDeleteTask = (task: Task, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // テーブル行のクリックイベントを防ぐ
    }
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  // タスク削除の実行
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await apiService.deleteTask(taskToDelete.id);
      
      // タスクリストから削除
      setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
      
      // 選択中のタスクが削除されたタスクだった場合、選択を解除
      if (selectedTaskId === taskToDelete.id) {
        setSelectedTaskId(undefined);
      }
      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null);
        setShowTaskDetailModal(false);
      }
      
      console.log('タスクが削除されました:', taskToDelete.name);
    } catch (err: any) {
      console.error('タスク削除エラー:', err.message);
      alert('タスクの削除に失敗しました: ' + err.message);
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  // タスク追加モーダルを開く
  const handleAddTask = () => {
    setSelectedTask(null); // 親タスクをクリア
    setShowTaskCreateModal(true);
  };

  // サブタスク作成モーダルを開く
  const handleCreateSubtask = (parentTask: Task) => {
    setSelectedTask(parentTask); // 親タスクを設定
    setShowTaskCreateModal(true);
  };

  // タスクを作成
  const handleCreateTask = async (taskData: TaskCreateRequest) => {
    try {
      console.log('Creating task with data:', taskData); // デバッグログ
      const newTask = await apiService.createTask(taskData);
      console.log('Created task:', newTask); // デバッグログ
      
      // levelフィールドと先行タスクIDが不足している場合は補完
      const taskWithLevel = {
        ...newTask,
        level: newTask.level !== undefined ? newTask.level : (taskData.level || 0),
        parent_task_id: newTask.parent_task_id !== undefined ? newTask.parent_task_id : taskData.parent_task_id,
        predecessor_task_ids: newTask.predecessor_task_ids || taskData.predecessor_task_ids || []
      };
      
      console.log('Created task with predecessors:', taskWithLevel); // デバッグログ
      
      // タスク一覧を更新（階層順序でソートして追加）
      setTasks(prev => {
        const updatedTasks = [...prev, taskWithLevel];
        return sortTasksHierarchically(updatedTasks);
      });
      
      // 依存関係を再取得
      try {
        const updatedDependencies = await apiService.getTaskDependencies(projectId);
        console.log('Updated dependencies after task creation:', updatedDependencies); // デバッグログ
        setDependencies(updatedDependencies);
      } catch (depError) {
        console.error('依存関係の取得に失敗:', depError);
      }
      
      return taskWithLevel; // TaskCreateModalに返す
      
    } catch (error) {
      console.error('タスク作成エラー:', error);
      alert('タスクの作成に失敗しました');
      throw error;
    }
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
    if (!project || tasks.length === 0) {
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      return { startDate: today, endDate };
    }

    const startDates = tasks
      .filter(task => task.planned_start_date)
      .map(task => parseLocalDate(task.planned_start_date!));
    
    const endDates = tasks
      .filter(task => task.planned_end_date)
      .map(task => parseLocalDate(task.planned_end_date!));

    const projectStartDate = parseLocalDate(project.start_date);
    const projectEndDate = parseLocalDate(project.end_date);

    const startDate = startDates.length > 0 
      ? new Date(Math.min(projectStartDate.getTime(), ...startDates.map(d => d.getTime())))
      : projectStartDate;

    const endDate = endDates.length > 0
      ? new Date(Math.max(projectEndDate.getTime(), ...endDates.map(d => d.getTime())))
      : projectEndDate;

    return { startDate, endDate };
  };

  if (loading) {
    return (
      <div className="project-detail-page min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="project-detail-page min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
            <p className="text-red-600 mb-4">{error || 'プロジェクトが見つかりません'}</p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/projects')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                プロジェクト一覧に戻る
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { startDate, endDate } = getProjectDateRange();

  return (
    <div className="project-detail-page min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm">ダッシュボード</span>
                </button>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => router.push('/projects')}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm">プロジェクト一覧</span>
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            
            {/* プロジェクト情報 */}
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
              <div className="flex items-center space-x-2">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {project.status === 'active' ? '進行中' :
                   project.status === 'completed' ? '完了' :
                   project.status === 'on_hold' ? '保留' : '中止'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
            <SimpleWamraGantt
              tasks={tasks}
              projectId={projectId}
              onTaskUpdate={handleTaskUpdate}
              onTaskSelect={handleTaskSelect}
              selectedTaskId={selectedTaskId}
              viewType={viewType}
              className="min-h-96"
            />
            {/* デバッグ用：依存関係データ表示 */}
            {/* {process.env.NODE_ENV === 'development' && dependencies.length > 0 && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Dependencies Debug:</strong> {JSON.stringify(dependencies, null, 2)}
              </div>
            )} */}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">タスクがありません</h3>
            <p className="text-gray-600 mb-4">新しいタスクを作成してプロジェクトを開始しましょう</p>
            <button
              onClick={handleAddTask}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              タスクを追加
            </button>
          </div>
        )}

        {/* タスク一覧テーブル */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 mt-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">タスク一覧</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タスク名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      優先度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      開始日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      終了予定日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      見積時間
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr 
                      key={task.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedTaskId === task.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center" style={{ paddingLeft: `${task.level * 20}px` }}>
                          {task.level > 0 && (
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                          )}
                          {task.is_milestone && (
                            <div className="w-3 h-3 bg-yellow-400 transform rotate-45 mr-2"></div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {task.level > 0 && '↳ '}
                              {task.name}
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? '完了' :
                           task.status === 'in_progress' ? '進行中' :
                           task.status === 'on_hold' ? '保留' : '未開始'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority === 'high' ? '高' :
                           task.priority === 'medium' ? '中' : '低'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.planned_start_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.planned_end_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => handleDeleteTask(task, e)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded transition-colors"
                          title="タスクを削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* タスク作成モーダル */}
      <TaskCreateModal
        isOpen={showTaskCreateModal}
        onClose={() => {
          setShowTaskCreateModal(false);
          setSelectedTask(null); // 親タスクをクリア
        }}
        onCreate={handleCreateTask}
        projectId={projectId}
        parentTasks={tasks}
        users={users}
        selectedParentTask={selectedTask}
      />

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={() => {
          setShowTaskDetailModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
        onDelete={handleDeleteTask}
        users={users}
        parentTasks={tasks.filter(t => t.id !== selectedTask?.id)}
        onCreateSubtask={handleCreateSubtask}
        allTasks={tasks}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="タスクの削除"
        message={`「${taskToDelete?.name}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={confirmDeleteTask}
        onCancel={() => setShowDeleteDialog(false)}
        isDestructive={true}
      />
    </div>
  );
}