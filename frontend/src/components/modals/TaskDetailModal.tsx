import React, { useState, useEffect } from 'react';
import { Task, User } from '../../types/index';
import { useTaskStore } from '../../stores/taskStore';
import { userAPI, taskAPI } from '../../services/api';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onCreateSubtask?: (parentTask: Task) => void;
  allTasks?: Task[];
}

const TASK_STATUSES = [
  { value: 'not_started', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'on_hold', label: '保留' },
  { value: 'cancelled', label: '中止' }
];

const TASK_PRIORITIES = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  onCreateSubtask,
  allTasks = []
}) => {
  const { updateTask, fetchTask, currentTask: storeCurrentTask } = useTaskStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [error, setError] = useState<string | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    estimated_hours: 0,
    actual_hours: 0,
    progress_rate: 0,
    priority: 'medium',
    status: 'not_started',
    category: '',
    is_milestone: false,
    assigned_users: [] as number[],
    predecessor_tasks: [] as number[]
  });

  // ユーザー一覧を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userAPI.getUsers();
        console.log('TaskDetailModal: Users response:', response);
        // レスポンスが配列かどうかを確認し、適切に処理
        if (Array.isArray(response.data)) {
          setUsers(response.data);
        } else if (response.data && Array.isArray(response.data.results)) {
          setUsers(response.data.results);
        } else {
          console.warn('TaskDetailModal: Unexpected users data format:', response.data);
          setUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // タスクデータでフォームを初期化
  useEffect(() => {
    let isMounted = true;

    const fetchTaskDetails = async () => {
      if (task && isOpen && isMounted) {
        // IDの有効性を確認
        if (!task.id || task.id === undefined || task.id === null) {
          console.error('TaskDetailModal: Invalid task ID:', task.id);
          setError('無効なタスクIDです');
          return;
        }

        try {
          console.log('TaskDetailModal: Fetching detailed task data for ID:', task.id);
          await fetchTask(task.id);
        } catch (error: any) {
          if (isMounted) {
            console.error('TaskDetailModal: Failed to fetch task details:', error);
            // 404エラーの場合はタスクが削除されているため、モーダルを閉じる
            if (error.response?.status === 404) {
              console.log('TaskDetailModal: Task not found during fetch, closing modal');
              onClose();
              return;
            }
            setError('タスクの詳細情報の取得に失敗しました');
          }
        }
      }
    };

    fetchTaskDetails();

    return () => {
      isMounted = false;
    };
  }, [task?.id, isOpen]);

  // ストアのcurrentTaskが更新された時にフォームデータを設定
  useEffect(() => {
    // currentTaskがnullになった場合（削除された場合）はモーダルを閉じる
    // ただし、taskプロパティに有効なIDがある場合は継続
    if (task && storeCurrentTask === null && isOpen) {
      // taskプロパティに有効なIDがない場合のみ閉じる
      if (!task.id || task.id === undefined || task.id === null) {
        console.log('TaskDetailModal: Current task is null and no valid task ID, closing modal');
        onClose();
        return;
      }
      console.log('TaskDetailModal: Current task is null but task prop has valid ID, continuing with task prop');
    }

    if (storeCurrentTask && task && storeCurrentTask.id === task.id) {
      console.log('TaskDetailModal: Got detailed task data:', storeCurrentTask);
      console.log('TaskDetailModal: Task fields:');
      console.log('- name:', storeCurrentTask.name);
      console.log('- description:', storeCurrentTask.description);
      console.log('- category:', storeCurrentTask.category);
      console.log('- planned_start_date:', storeCurrentTask.planned_start_date);
      console.log('- planned_end_date:', storeCurrentTask.planned_end_date);
      console.log('- actual_start_date:', storeCurrentTask.actual_start_date);
      console.log('- actual_end_date:', storeCurrentTask.actual_end_date);
      console.log('- estimated_hours:', storeCurrentTask.estimated_hours);
      console.log('- actual_hours:', storeCurrentTask.actual_hours);
      console.log('- progress_rate:', storeCurrentTask.progress_rate);
      console.log('- priority:', storeCurrentTask.priority);
      console.log('- status:', storeCurrentTask.status);
      console.log('- is_milestone:', storeCurrentTask.is_milestone);
      console.log('- assignments:', storeCurrentTask.assignments);
      console.log('- dependencies_as_successor:', storeCurrentTask.dependencies_as_successor);

      setCurrentTask(storeCurrentTask);

      // 担当ユーザーIDの配列を作成
      const assignedUserIds = Array.isArray(storeCurrentTask.assignments)
        ? storeCurrentTask.assignments.map(assignment => assignment.user.id)
        : [];

      // 先行タスクIDの配列を作成
      const predecessorTaskIds = Array.isArray(storeCurrentTask.dependencies_as_successor)
        ? storeCurrentTask.dependencies_as_successor.map(dep => dep.predecessor)
        : [];

      console.log('TaskDetailModal: Assigned user IDs:', assignedUserIds);
      console.log('TaskDetailModal: Predecessor task IDs:', predecessorTaskIds);

      const formDataToSet = {
        name: storeCurrentTask.name || '',
        description: storeCurrentTask.description || '',
        planned_start_date: storeCurrentTask.planned_start_date || '',
        planned_end_date: storeCurrentTask.planned_end_date || '',
        actual_start_date: storeCurrentTask.actual_start_date || '',
        actual_end_date: storeCurrentTask.actual_end_date || '',
        estimated_hours: storeCurrentTask.estimated_hours ?? 0,
        actual_hours: storeCurrentTask.actual_hours ?? 0,
        progress_rate: storeCurrentTask.progress_rate || 0,
        priority: storeCurrentTask.priority || 'medium',
        status: storeCurrentTask.status || 'not_started',
        category: storeCurrentTask.category || '',
        is_milestone: storeCurrentTask.is_milestone || false,
        assigned_users: assignedUserIds,
        predecessor_tasks: predecessorTaskIds
      };

      console.log('TaskDetailModal: Setting form data:', formDataToSet);
      setFormData(formDataToSet);
      setError(null);
    }
  }, [storeCurrentTask, task]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => parseInt(option.value));
    setFormData(prev => ({
      ...prev,
      assigned_users: selectedOptions
    }));
  };

  const handlePredecessorSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => parseInt(option.value));
    setFormData(prev => ({
      ...prev,
      predecessor_tasks: selectedOptions
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('TaskDetailModal: handleSubmit called');
    if (!displayTask) return;

    if (!formData.name.trim()) {
      setError('タスク名は必須です');
      return;
    }

    console.log('TaskDetailModal: Form data at submit:', {
      assigned_users: formData.assigned_users,
      predecessor_tasks: formData.predecessor_tasks
    });

    console.log('TaskDetailModal: Current task assignments:', displayTask.assignments);

    setLoading(true);
    setError(null);

    try {
      // バックエンドAPI用のデータ形式に変換
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : '',
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        actual_start_date: formData.actual_start_date || null,
        actual_end_date: formData.actual_end_date || null,
        estimated_hours: Number(formData.estimated_hours) || 0,
        actual_hours: Number(formData.actual_hours) || 0,
        progress_rate: formData.progress_rate || 0,
        priority: formData.priority,
        status: formData.status,
        category: formData.category ? formData.category.trim() : '',
        is_milestone: formData.is_milestone,
        assigned_users: formData.assigned_users,
        predecessor_tasks: formData.predecessor_tasks
      };

      // 空文字列はnullではなく空文字列として送信（Django側で適切に処理）
      console.log('TaskDetailModal: Updating task with data:', updateData);

      // 担当者と先行タスクの変更を専用APIで処理
      const originalAssignments = Array.isArray(displayTask.assignments)
        ? displayTask.assignments.map(a => a.user.id)
        : [];
      const originalPredecessors = Array.isArray(displayTask.dependencies_as_successor)
        ? displayTask.dependencies_as_successor.map(d => d.predecessor)
        : [];

      console.log('TaskDetailModal: Original assignments:', originalAssignments);
      console.log('TaskDetailModal: New assignments:', updateData.assigned_users);
      console.log('TaskDetailModal: Original predecessors:', originalPredecessors);
      console.log('TaskDetailModal: New predecessors:', updateData.predecessor_tasks);

      // 変更があるかチェック
      const assignmentChangesExist = JSON.stringify(originalAssignments.sort()) !== JSON.stringify(updateData.assigned_users.sort());
      const dependencyChangesExist = JSON.stringify(originalPredecessors.sort()) !== JSON.stringify(updateData.predecessor_tasks.sort());
      console.log('TaskDetailModal: Assignment changes exist:', assignmentChangesExist);
      console.log('TaskDetailModal: Dependency changes exist:', dependencyChangesExist);

      // 基本情報を更新（担当者と先行タスクは除く）
      const basicUpdateData = {
        name: updateData.name,
        description: updateData.description,
        planned_start_date: updateData.planned_start_date,
        planned_end_date: updateData.planned_end_date,
        actual_start_date: updateData.actual_start_date,
        actual_end_date: updateData.actual_end_date,
        estimated_hours: updateData.estimated_hours,
        actual_hours: updateData.actual_hours,
        progress_rate: updateData.progress_rate,
        priority: updateData.priority,
        status: updateData.status,
        category: updateData.category,
        is_milestone: updateData.is_milestone
      };

      const updatedTask = await updateTask(displayTask.id, basicUpdateData);
      console.log('TaskDetailModal: Task updated successfully:', updatedTask);

      // 担当者の変更を処理
      const assignmentChanges = {
        toAdd: updateData.assigned_users.filter(id => !originalAssignments.includes(id)),
        toRemove: originalAssignments.filter(id => !updateData.assigned_users.includes(id))
      };

      console.log('TaskDetailModal: Assignment changes:', assignmentChanges);

      // 担当者を追加
      for (const userId of assignmentChanges.toAdd) {
        try {
          await taskAPI.addTaskAssignment(displayTask.id, { user_id: userId });
          console.log('TaskDetailModal: Added assignment for user:', userId);
        } catch (error) {
          console.error('TaskDetailModal: Failed to add assignment for user:', userId, error);
        }
      }

      // 担当者を削除
      for (const userId of assignmentChanges.toRemove) {
        try {
          await taskAPI.removeTaskAssignment(displayTask.id, userId);
          console.log('TaskDetailModal: Removed assignment for user:', userId);
        } catch (error) {
          console.error('TaskDetailModal: Failed to remove assignment for user:', userId, error);
        }
      }

      // 先行タスクの変更を処理
      const dependencyChanges = {
        toAdd: updateData.predecessor_tasks.filter(id => !originalPredecessors.includes(id)),
        toRemove: originalPredecessors.filter(id => !updateData.predecessor_tasks.includes(id))
      };

      console.log('TaskDetailModal: Dependency changes:', dependencyChanges);

      // 先行タスクを追加
      for (const predecessorId of dependencyChanges.toAdd) {
        try {
          await taskAPI.addTaskDependency(displayTask.id, { predecessor: predecessorId });
          console.log('TaskDetailModal: Added dependency for task:', predecessorId);
        } catch (error) {
          console.error('TaskDetailModal: Failed to add dependency for task:', predecessorId, error);
        }
      }

      console.log('TaskDetailModal: Building updated assignments');
      console.log('- updateData.assigned_users:', updateData.assigned_users);
      console.log('- available users:', users);

      // 担当者情報を再構築
      const updatedAssignments = Array.isArray(users) ? users
        .filter(user => {
          const included = updateData.assigned_users.includes(user.id);
          console.log(`- User ${user.username} (${user.id}): ${included ? 'included' : 'excluded'}`);
          return included;
        })
        .map((user, index) => ({
          id: index + 1, // 仮のID
          user: user,
          assigned_at: new Date().toISOString()
        })) : [];

      console.log('TaskDetailModal: Updated assignments built:', updatedAssignments);

      // 先行タスク情報を再構築
      const updatedDependencies = Array.isArray(projectTasks) ? projectTasks
        .filter(task => updateData.predecessor_tasks.includes(task.id))
        .map((task, index) => ({
          id: index + 1, // 仮のID
          predecessor: task.id,
          predecessor_name: task.name,
          successor: displayTask.id
        })) : [];

      // 更新されたタスクでcurrentTaskを更新（フォームデータもマージ）
      const mergedTask = {
        ...displayTask,
        ...updatedTask,
        // フォームで入力したデータも確実に反映
        name: updateData.name,
        description: updateData.description,
        category: updateData.category,
        planned_start_date: updateData.planned_start_date,
        planned_end_date: updateData.planned_end_date,
        actual_start_date: updateData.actual_start_date,
        actual_end_date: updateData.actual_end_date,
        estimated_hours: updateData.estimated_hours,
        actual_hours: updateData.actual_hours,
        progress_rate: updateData.progress_rate,
        priority: updateData.priority,
        status: updateData.status,
        is_milestone: updateData.is_milestone,
        // 関係データも更新
        assignments: updatedAssignments,
        dependencies_as_successor: updatedDependencies
      };

      console.log('TaskDetailModal: Final mergedTask assignments:', mergedTask.assignments);

      // ローカル状態を更新
      setCurrentTask(mergedTask);

      // 即座に親コンポーネントを更新（UI反映のため）
      onUpdate?.(mergedTask);

      // バックグラウンドでサーバーから最新データを取得して同期（UIには影響しない）
      setTimeout(async () => {
        try {
          await fetchTask(displayTask.id);
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log('TaskDetailModal: Task not found during background sync, closing modal');
            onClose();
            return;
          }
          console.warn('TaskDetailModal: Failed to sync task data in background:', error);
        }
      }, 100);

      setIsEditing(false);

      // 更新成功後にモーダルを閉じる
      console.log('TaskDetailModal: Task update completed successfully, closing modal');
      onClose();
    } catch (error: any) {
      console.error('TaskDetailModal: Failed to update task:', error);
      console.error('TaskDetailModal: Error response:', error.response);
      console.error('TaskDetailModal: Error data:', error.response?.data);
      console.error('TaskDetailModal: Request data:', formData);

      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.response?.data?.error ||
                          'タスクの更新に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (displayTask && onDelete) {
      if (confirm('このタスクを削除しますか？この操作は取り消せません。')) {
        onDelete(displayTask);
      }
    }
  };

  const handleCreateSubtask = () => {
    if (displayTask && onCreateSubtask) {
      onClose();
      onCreateSubtask(displayTask);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  // currentTaskがない場合は、taskプロパティから表示
  const displayTask = currentTask || task;
  if (!displayTask) {
    console.log('TaskDetailModal: No displayTask available');
    return null;
  }

  // displayTaskのIDが有効かチェック
  if (!displayTask.id || displayTask.id === undefined || displayTask.id === null) {
    console.error('TaskDetailModal: displayTask has invalid ID:', displayTask);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-4">エラー</h2>
            <p className="text-gray-700 mb-4">無効なタスクIDです。</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  // プロジェクト内のタスク一覧（先行タスク選択用）
  const projectTasks = Array.isArray(allTasks) && displayTask ? allTasks.filter(t =>
    t.project && displayTask.project && t.project === displayTask.project &&
    t.id !== displayTask.id
  ) : [];

  // 担当ユーザー情報を取得
  const assignedUsers = Array.isArray(users) ? users.filter(user =>
    formData.assigned_users.includes(user.id)
  ) : [];

  // 先行タスク情報を取得
  const predecessorTasksInfo = Array.isArray(projectTasks) ? projectTasks.filter(t =>
    formData.predecessor_tasks.includes(t.id)
  ) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {displayTask.is_milestone && (
              <div className="w-4 h-4 bg-yellow-400 transform rotate-45"></div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'タスクを編集' : 'タスクの詳細'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && onCreateSubtask && (
              <button
                onClick={handleCreateSubtask}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                title="このタスクのサブタスクを作成"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>サブタスク作成</span>
              </button>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  編集
                </button>
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="タスクを削除"
                  >
                    削除
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タスク名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      説明
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_milestone_edit"
                      checked={formData.is_milestone}
                      onChange={(e) => handleInputChange('is_milestone', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_milestone_edit" className="ml-2 text-sm text-gray-700">
                      マイルストーン
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ステータス
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TASK_STATUSES.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        優先度
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TASK_PRIORITIES.map(priority => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始予定日
                      </label>
                      <input
                        type="date"
                        value={formData.planned_start_date}
                        onChange={(e) => handleInputChange('planned_start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了予定日
                      </label>
                      <input
                        type="date"
                        value={formData.planned_end_date}
                        onChange={(e) => handleInputChange('planned_end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        実開始日
                      </label>
                      <input
                        type="date"
                        value={formData.actual_start_date}
                        onChange={(e) => handleInputChange('actual_start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        実終了日
                      </label>
                      <input
                        type="date"
                        value={formData.actual_end_date}
                        onChange={(e) => handleInputChange('actual_end_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        見積時間（時間）
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimated_hours}
                        onChange={(e) => handleInputChange('estimated_hours', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        実績時間（時間）
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.actual_hours}
                        onChange={(e) => handleInputChange('actual_hours', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        進捗率（%）
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progress_rate}
                        onChange={(e) => handleInputChange('progress_rate', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 担当者選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      担当者
                    </label>

                    {/* 現在の担当者リスト */}
                    {assignedUsers.length > 0 && (
                      <div className="mb-3">
                        <div className="space-y-2">
                          {assignedUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {(user.username || 'U')[0]}
                                </div>
                                <span className="text-sm text-gray-900">{user.username} ({user.full_name})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    assigned_users: prev.assigned_users.filter(id => id !== user.id)
                                  }));
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 担当者追加プルダウン */}
                    {Array.isArray(users) && users.length > 0 && users.filter(user => !formData.assigned_users.includes(user.id)).length > 0 && (
                      <div>
                        <select
                          onChange={(e) => {
                            const userId = parseInt(e.target.value);
                            if (userId && !formData.assigned_users.includes(userId)) {
                              setFormData(prev => ({
                                ...prev,
                                assigned_users: [...prev.assigned_users, userId]
                              }));
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          defaultValue=""
                        >
                          <option value="">-- 担当者を追加 --</option>
                          {users
                            .filter(user => !formData.assigned_users.includes(user.id))
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.username} ({user.full_name})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 先行タスク選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      先行タスク
                    </label>

                    {/* 現在の先行タスクリスト */}
                    {predecessorTasksInfo.length > 0 && (
                      <div className="mb-3">
                        <div className="space-y-2">
                          {predecessorTasksInfo.map(predecessor => (
                            <div key={predecessor.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                              <span className="text-sm text-gray-900">{predecessor.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    predecessor_tasks: prev.predecessor_tasks.filter(id => id !== predecessor.id)
                                  }));
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 先行タスク追加プルダウン */}
                    {Array.isArray(projectTasks) && projectTasks.length > 0 && projectTasks.filter(task => !formData.predecessor_tasks.includes(task.id)).length > 0 ? (
                      <div>
                        <select
                          onChange={(e) => {
                            const taskId = parseInt(e.target.value);
                            if (taskId && !formData.predecessor_tasks.includes(taskId)) {
                              setFormData(prev => ({
                                ...prev,
                                predecessor_tasks: [...prev.predecessor_tasks, taskId]
                              }));
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          defaultValue=""
                        >
                          <option value="">-- 先行タスクを追加 --</option>
                          {projectTasks
                            .filter(task => !formData.predecessor_tasks.includes(task.id))
                            .map(task => (
                              <option key={task.id} value={task.id}>
                                {task.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">利用可能な先行タスクがありません</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? '更新中...' : '更新'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* タスク情報表示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">基本情報</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">タスク名:</span>
                        <p className="text-gray-900 mt-1">{displayTask.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">階層レベル:</span>
                        <div className="flex items-center mt-1">
                          <span className="text-gray-900">レベル {displayTask.level || 0}</span>
                          {displayTask.parent_task && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              サブタスク
                            </span>
                          )}
                          {(displayTask.level || 0) === 0 && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              ルートタスク
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">説明:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{displayTask.description || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">カテゴリ:</span>
                        <p className="text-gray-900 mt-1">{displayTask.category || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">担当者</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {displayTask.assignments && displayTask.assignments.length > 0 ? (
                        <div className="space-y-2">
                          {displayTask.assignments.map(assignment => (
                            <div key={assignment.id} className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {(assignment.user.username || 'U')[0]}
                              </div>
                              <span className="text-gray-900">
                                {assignment.user.username} ({assignment.user.full_name})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">担当者が設定されていません</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">先行タスク</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {displayTask.dependencies_as_successor && displayTask.dependencies_as_successor.length > 0 ? (
                        <div className="space-y-2">
                          {displayTask.dependencies_as_successor.map(dependency => (
                            <div key={dependency.id} className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-gray-900">{dependency.predecessor_name}</span>
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                ID: {dependency.predecessor}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">先行タスクが設定されていません</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">ステータス・優先度</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">ステータス:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(displayTask.status)}`}>
                          {TASK_STATUSES.find(s => s.value === displayTask.status)?.label || displayTask.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">優先度:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(displayTask.priority)}`}>
                          {TASK_PRIORITIES.find(p => p.value === displayTask.priority)?.label || displayTask.priority}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">進捗率:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${displayTask.progress_rate || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{displayTask.progress_rate || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">日程</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">開始予定日:</span>
                          <p className="text-gray-900 mt-1">{formatDate(displayTask.planned_start_date || undefined)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">終了予定日:</span>
                          <p className="text-gray-900 mt-1">{formatDate(displayTask.planned_end_date || undefined)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">実開始日:</span>
                          <p className="text-gray-900 mt-1">{formatDate(displayTask.actual_start_date || undefined)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">実終了日:</span>
                          <p className="text-gray-900 mt-1">{formatDate(displayTask.actual_end_date || undefined)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">工数</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">見積時間:</span>
                          <p className="text-gray-900 mt-1">{displayTask.estimated_hours ? `${displayTask.estimated_hours}h` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">実績時間:</span>
                          <p className="text-gray-900 mt-1">{displayTask.actual_hours ? `${displayTask.actual_hours}h` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};