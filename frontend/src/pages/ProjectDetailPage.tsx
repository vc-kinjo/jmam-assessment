import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { Task, Project } from '../types/index';
import { TaskCreateModal } from '../components/modals/TaskCreateModal';
import { TaskDetailModal } from '../components/modals/TaskDetailModal';

// 日付文字列を確実にローカル日付として解析
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // monthは0ベースなので-1
}

// タスクを階層順序でソートする関数
const sortTasksHierarchically = (tasks: Task[]): Task[] => {
  if (!Array.isArray(tasks)) {
    console.warn('sortTasksHierarchically: tasks is not an array:', tasks);
    return [];
  }

  const taskMap = new Map<number, Task>();
  const rootTasks: Task[] = [];
  const childTasks = new Map<number, Task[]>();

  // タスクをマップに格納し、親子関係を整理
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    if (task.parent_task === null || task.parent_task === undefined) {
      rootTasks.push(task);
    } else {
      if (!childTasks.has(task.parent_task)) {
        childTasks.set(task.parent_task, []);
      }
      childTasks.get(task.parent_task)!.push(task);
    }
  });

  // 階層順序でソート（深度優先探索）
  const sortedTasks: Task[] = [];

  const traverseTask = (task: Task, level: number = 0) => {
    const taskWithLevel = { ...task, level };
    sortedTasks.push(taskWithLevel);
    const children = childTasks.get(task.id) || [];
    // sort_orderがある場合はそれに従ってソート、なければIDでソート
    children.sort((a, b) => (a.sort_order || a.id) - (b.sort_order || b.id));
    children.forEach(child => traverseTask(child, level + 1));
  };

  // ルートタスクをソートしてから順次処理
  rootTasks.sort((a, b) => (a.sort_order || a.id) - (b.sort_order || b.id));
  rootTasks.forEach(task => traverseTask(task));

  return sortedTasks;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = parseInt(id as string);

  const { user, isAuthenticated, getCurrentUser } = useAuthStore();
  const { currentProject, fetchProject, isLoading: projectLoading, error: projectError } = useProjectStore();
  const { fetchTasksByProject, createTask, updateTask, deleteTask, isLoading: taskLoading } = useTaskStore();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ガントチャート設定
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>();
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 削除確認ダイアログ用の状態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // 認証チェック
  useEffect(() => {
    console.log('ProjectDetailPage auth useEffect triggered:', { isAuthenticated, user: !!user });
    let isMounted = true;

    const checkAuth = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      if (isAuthenticated && !user && isMounted) {
        try {
          console.log('ProjectDetailPage: Getting current user...');
          await getCurrentUser();
        } catch (error) {
          if (isMounted) {
            console.error('Failed to get current user:', error);
          }
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, navigate]);

  // データ取得
  useEffect(() => {
    console.log('ProjectDetailPage data useEffect triggered for projectId:', projectId);
    let isMounted = true;

    const fetchData = async () => {
      if (!projectId || isNaN(projectId)) {
        setError('無効なプロジェクトIDです');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching project data for ID:', projectId);

        // プロジェクト情報を取得
        await fetchProject(projectId);

        // タスク一覧を取得
        const projectTasks = await fetchTasksByProject(projectId);
        console.log('Fetched tasks:', projectTasks);
        console.log('First task assignments (if exists):', projectTasks[0]?.assignments);
        console.log('First task dependencies (if exists):', projectTasks[0]?.dependencies_as_successor);

        // コンポーネントがまだマウントされている場合のみ状態を更新
        if (isMounted) {
          // タスクを階層順序でソート
          const sortedTasks = sortTasksHierarchically(projectTasks);
          console.log('Sorted tasks:', sortedTasks);
          console.log('Sorted first task assignments:', sortedTasks[0]?.assignments);
          setTasks(sortedTasks);
        }

      } catch (err: any) {
        console.error('Project detail fetch error:', err);
        if (isMounted) {
          setError(err.message || 'データの取得に失敗しました');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [projectId]); // 依存関係を最小限に

  // プロジェクトデータの更新
  useEffect(() => {
    if (currentProject && currentProject.id === projectId) {
      setProject(currentProject);
    }
  }, [currentProject?.id, projectId]); // currentProjectの参照ではなくIDを監視

  // タスク更新
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    try {
      console.log('ProjectPage.handleTaskUpdate - taskId:', taskId, 'updates:', updates);

      const updatedTask = await updateTask(taskId, updates);

      console.log('ProjectPage.handleTaskUpdate - updatedTask:', updatedTask);

      // タスクリストを更新
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...updatedTask } : task
      ));

      // 選択中のタスクが更新されたタスクの場合、selectedTaskも更新
      setSelectedTask(prevSelected =>
        prevSelected && prevSelected.id === taskId ? { ...prevSelected, ...updatedTask } : prevSelected
      );

      return updatedTask;
    } catch (err: any) {
      console.error('タスク更新エラー:', err.message);
      throw err;
    }
  };

  // タスク選択（ガントチャート用）
  const handleTaskSelect = (task: Task | null) => {
    setSelectedTaskId(task?.id);
    if (task) {
      handleTaskClick(task);
    }
  };

  // タスク詳細モーダルを開く
  const handleTaskClick = (task: Task) => {
    console.log('ProjectPage.handleTaskClick - clicked task:', task);

    // タスクIDの有効性を確認
    if (!task || !task.id || task.id === undefined || task.id === null) {
      console.error('ProjectPage.handleTaskClick - Invalid task or task ID:', task);
      alert('無効なタスクです。');
      return;
    }

    // 他のモーダルを閉じる
    setShowTaskCreateModal(false);

    // 最新のタスク情報をtasksリストから取得
    const latestTask = tasks.find(t => t.id === task.id) || task;
    console.log('ProjectPage.handleTaskClick - latest task from tasks list:', latestTask);

    // 取得したタスクもIDを確認
    if (!latestTask.id) {
      console.error('ProjectPage.handleTaskClick - Latest task has no ID:', latestTask);
      alert('タスクIDが見つかりません。');
      return;
    }

    setSelectedTask(latestTask);
    setShowTaskDetailModal(true);
  };

  // タスク削除の確認ダイアログを開く
  const handleDeleteTask = (task: Task, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  // タスク削除の実行
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.id);

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
    setSelectedTask(null);
    setShowTaskCreateModal(true);
  };

  // サブタスク作成モーダルを開く
  const handleCreateSubtask = (parentTask: Task) => {
    setSelectedTask(parentTask);
    setShowTaskCreateModal(true);
  };

  // タスク作成完了ハンドラー
  const handleTaskCreated = (newTask: Task) => {
    // 即座にローカルリストに新しいタスクを追加してUIを更新
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, newTask];
      const sortedTasks = sortTasksHierarchically(updatedTasks);
      return sortedTasks;
    });

    // モーダル状態をリセット
    setSelectedTask(null);

    // バックグラウンドでサーバーから最新データを取得（担当者・先行タスク設定完了を待つ）
    setTimeout(async () => {
      try {
        console.log('handleTaskCreated: Fetching updated task list from server...');
        const response = await fetchTasksByProject(parseInt(projectId || '0'));
        if (response && Array.isArray(response)) {
          const sortedTasks = sortTasksHierarchically(response);
          setTasks(sortedTasks);
          console.log('handleTaskCreated: Task list updated with assignments and dependencies');
        }
      } catch (error) {
        console.error('Failed to sync with server:', error);
      }
    }, 500); // 担当者・先行タスク設定の完了を待つため遅延を増加
  };

  // タスク更新ハンドラー
  const handleTaskUpdated = async (updatedTask: Task) => {
    console.log('ProjectDetailPage: handleTaskUpdated called with:', updatedTask);
    console.log('ProjectDetailPage: updatedTask.assignments:', updatedTask.assignments);
    console.log('ProjectDetailPage: updatedTask.dependencies_as_successor:', updatedTask.dependencies_as_successor);

    // ローカルのタスクリストも即座に更新
    setTasks(prevTasks => {
      console.log('ProjectDetailPage: Before update - task data:');
      const targetTask = prevTasks.find(task => task.id === updatedTask.id);
      console.log('- Current assignments:', targetTask?.assignments);
      console.log('- New assignments:', updatedTask.assignments);
      console.log('- Current dependencies:', targetTask?.dependencies_as_successor);
      console.log('- New dependencies:', updatedTask.dependencies_as_successor);

      const updatedTasks = prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      );
      // 階層順序でソートして返す
      return sortTasksHierarchically(updatedTasks);
    });

    setSelectedTask(updatedTask);
    console.log('ProjectDetailPage: Task list and selected task updated');
  };

  // タスク削除ハンドラー
  const handleTaskDeleted = async (deletedTask: Task) => {
    try {
      console.log('ProjectDetailPage: Attempting to delete task:', deletedTask.id, deletedTask.name);
      await deleteTask(deletedTask.id);

      // ローカルリストから削除
      setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTask.id));

      // 選択中のタスクが削除されたタスクの場合、選択を解除
      if (selectedTaskId === deletedTask.id) {
        setSelectedTaskId(undefined);
      }
      if (selectedTask?.id === deletedTask.id) {
        setSelectedTask(null);
      }

      // モーダルを閉じる
      setShowTaskDetailModal(false);

      console.log('ProjectDetailPage: タスクが正常に削除されました:', deletedTask.name);

      // 成功メッセージを表示
      alert(`タスク「${deletedTask.name}」を削除しました。`);
    } catch (error: any) {
      console.error('ProjectDetailPage: Failed to delete task:', error);
      console.error('ProjectDetailPage: Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // エラーメッセージを表示
      let errorMessage = 'タスクの削除に失敗しました';

      if (error.response?.status === 500) {
        errorMessage = `タスク「${deletedTask.name}」の削除に失敗しました。\n\nサーバーエラー（500）: このタスクに関連する依存関係（先行タスク・後続タスク・担当者）が存在する可能性があります。\n\n先に関連する依存関係を削除してから、再度お試しください。`;
      } else if (error.response?.status === 404) {
        errorMessage = `タスク「${deletedTask.name}」は既に削除されています。`;
        // 404の場合はUIから削除
        setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTask.id));
        setShowTaskDetailModal(false);
      } else if (error.response?.data?.detail) {
        errorMessage = `タスク削除エラー: ${error.response.data.detail}`;
      }

      alert(errorMessage);
    }
  };

  // エクスポート
  const handleExport = () => {
    console.log('エクスポート');
  };

  // 印刷
  const handlePrint = () => {
    window.print();
  };


  // ローディング表示
  if (loading || projectLoading || taskLoading) {
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

  // エラー表示
  if (error || projectError || !project) {
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
            <p className="text-red-600 mb-4">{error || projectError || 'プロジェクトが見つかりません'}</p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/projects')}
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

  return (
    <div className="project-detail-page min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm">ダッシュボード</span>
                </button>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => navigate('/projects')}
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
        {/* タスク管理コントロール */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 mb-6">
          {/* 左側のコントロール */}
          <div className="left-controls flex items-center space-x-4">
            {/* タスク追加ボタン */}
            <button
              className="add-task-btn flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              onClick={handleAddTask}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">タスク追加</span>
            </button>

            {/* ガントチャートボタン */}
            <button
              onClick={() => navigate('/gantt')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">ガントチャート</span>
            </button>
          </div>

          {/* 右側の凡例 */}
          <div className="right-controls flex items-center space-x-3">
            <div className="legend flex items-center space-x-4 text-xs">
              <div className="legend-item flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span>未開始</span>
              </div>
              <div className="legend-item flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>進行中</span>
              </div>
              <div className="legend-item flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>完了</span>
              </div>
            </div>
          </div>
        </div>

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      担当者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      先行タスク
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
                        <div className="flex items-center" style={{ paddingLeft: `${((task.level as number) || 0) * 20}px` }}>
                          {(task.level || 0) > 0 && (
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                          )}
                          {task.is_milestone && (
                            <div className="w-3 h-3 bg-yellow-400 transform rotate-45 mr-2"></div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {(task.level || 0) > 0 && '↳ '}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.assignments && task.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.assignments.map(assignment => (
                              <div key={assignment.id} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {(assignment.user.username || 'U')[0]}
                                </div>
                                <span>{assignment.user.username}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">未設定</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.dependencies_as_successor && task.dependencies_as_successor.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.dependencies_as_successor.map(dependency => (
                              <div key={dependency.id} className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>{dependency.predecessor_name || `Task ${dependency.predecessor}`}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">未設定</span>
                        )}
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
          setSelectedTask(null);
        }}
        projectId={parseInt(projectId || '0')}
        onTaskCreated={handleTaskCreated}
        parentTask={selectedTask}
        projectTasks={tasks}
      />

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={() => {
          setShowTaskDetailModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onUpdate={handleTaskUpdated}
        onDelete={handleTaskDeleted}
        onCreateSubtask={(parentTask) => {
          setSelectedTask(parentTask);
          setShowTaskCreateModal(true);
          // TaskDetailModal側で既にonClose()が呼ばれるため、ここではsetShowTaskDetailModal(false)は不要
        }}
        allTasks={tasks}
      />

      {/* 削除確認ダイアログ */}
      {showDeleteDialog && taskToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">タスクの削除</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  「{taskToDelete.name}」を削除してもよろしいですか？この操作は取り消せません。
                </p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={confirmDeleteTask}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700"
                >
                  削除
                </button>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setTaskToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}