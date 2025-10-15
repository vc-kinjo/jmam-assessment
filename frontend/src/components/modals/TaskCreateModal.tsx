import React, { useState, useEffect } from 'react';
import { Task, User } from '../../types/index';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { userAPI, taskAPI, projectAPI } from '../../services/api';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  onTaskCreated?: (task: Task) => void;
  parentTask?: Task | null;
  projectTasks?: Task[];
  availableUsers?: User[];
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onTaskCreated,
  parentTask,
  projectTasks = [],
  availableUsers = []
}) => {
  const { createTask, tasks } = useTaskStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_task: parentTask?.id || null,
    planned_start_date: '',
    planned_end_date: '',
    estimated_hours: '8',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: '',
    predecessor_tasks: [] as number[],
    is_milestone: false,
    assigned_users: [] as number[]
  });

  // parentTaskが変更された時にフォームデータを更新
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      parent_task: parentTask?.id || null
    }));
  }, [parentTask]);

  // ユーザー一覧を取得（プロパティで渡された場合はそれを使用）
  useEffect(() => {
    if (isOpen) {
      if (availableUsers.length > 0) {
        // プロパティでユーザーが渡されている場合はそれを使用
        console.log('TaskCreateModal: Using provided users:', availableUsers);
        setUsers(availableUsers);
        return;
      }

      // フォールバック: 現在のユーザーのみを設定
      const currentUser = user;
      if (currentUser) {
        const fallbackUsers = [{
          id: currentUser.id,
          username: currentUser.username,
          full_name: currentUser.full_name || currentUser.username,
          email: currentUser.email
        }];
        setUsers(fallbackUsers);
        console.log('TaskCreateModal: Using current user as fallback:', fallbackUsers);
      } else {
        console.warn('TaskCreateModal: No users available');
        setUsers([]);
      }
    }
  }, [isOpen, availableUsers, user]);

  // モーダルが開かれた時にフォームをリセット
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        parent_task: parentTask?.id || null,
        planned_start_date: '',
        planned_end_date: '',
        estimated_hours: '8',
        priority: 'medium',
        category: '',
        predecessor_tasks: [],
        is_milestone: false,
        assigned_users: []
      });
      setError(null);
    }
  }, [isOpen, parentTask]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleUserSelection = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_users: prev.assigned_users.includes(userId)
        ? prev.assigned_users.filter(id => id !== userId)
        : [...prev.assigned_users, userId]
    }));
  };

  const handlePredecessorSelection = (taskId: number) => {
    setFormData(prev => ({
      ...prev,
      predecessor_tasks: prev.predecessor_tasks.includes(taskId)
        ? prev.predecessor_tasks.filter(id => id !== taskId)
        : [...prev.predecessor_tasks, taskId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('タスク名は必須です');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const taskData: any = {
        project: projectId,
        parent_task: formData.parent_task,
        name: formData.name,
        description: formData.description,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        priority: formData.priority,
        category: formData.category,
        is_milestone: formData.is_milestone,
        status: 'not_started',
        predecessor_tasks: formData.predecessor_tasks,
        assigned_users: formData.assigned_users
      };

      console.log('TaskCreateModal: Creating task with data:', taskData);
      console.log('TaskCreateModal: Predecessor tasks:', formData.predecessor_tasks);
      console.log('TaskCreateModal: Assigned users:', formData.assigned_users);

      // 空の値を削除
      Object.keys(taskData).forEach(key => {
        if (taskData[key] === '' || taskData[key] === null || taskData[key] === undefined) {
          delete taskData[key];
        }
      });

      const newTask = await createTask(taskData);

      console.log('TaskCreateModal: Raw task creation response:', newTask);
      console.log('TaskCreateModal: newTask type:', typeof newTask);
      console.log('TaskCreateModal: newTask keys:', newTask ? Object.keys(newTask) : 'null');
      console.log('TaskCreateModal: newTask.id:', newTask?.id);

      if (!newTask) {
        throw new Error('タスクの作成に失敗しました - 応答が空です');
      }

      // タスク作成が成功したかを確認（IDが必須）
      if (!newTask.id) {
        console.error('TaskCreateModal: Task creation response:', newTask);
        console.error('TaskCreateModal: Full response details:', JSON.stringify(newTask, null, 2));
        throw new Error('タスクの作成に失敗しました - IDが返されませんでした');
      }

      console.log('TaskCreateModal: Task created successfully:', newTask);

      // 担当者・先行タスク設定は既にTaskCreateSerializerで処理されているので削除
      // newTaskには既に完全なデータが含まれている
      console.log('TaskCreateModal: Task created with all data:', newTask);
      let finalTask = newTask;

      // 親コンポーネントにタスク作成完了を通知
      if (onTaskCreated) {
        onTaskCreated(finalTask);
      }

      // タスク作成成功後にモーダルを閉じる
      onClose();

    } catch (error: any) {
      console.error('Task creation failed:', error);
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.message ||
                          'タスクの作成に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // プロジェクト内のタスク一覧（先行タスク選択用）
  // projectTasksプロパティを優先し、フォールバックとしてTaskStoreのtasksを使用
  const availableTasks = projectTasks.length > 0
    ? projectTasks
    : tasks.filter(task => task.project === projectId);

  // console.log('TaskCreateModal: Available tasks for predecessors:', availableTasks);
  // console.log('TaskCreateModal: Current users state:', users);
  // console.log('TaskCreateModal: Users length:', users.length);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <div className="fixed inset-0 bg-black bg-opacity-60"></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {parentTask ? `${parentTask.name} のサブタスクを作成` : '新しいタスクを作成'}
          </h2>
          {parentTask && (
            <p className="text-sm text-gray-600 mt-1">
              レベル {parentTask.level ? parentTask.level + 1 : 1} のサブタスクとして作成されます
            </p>
          )}
          {parentTask && parentTask.level >= 1 && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                このタスクは子タスクのため、これ以上サブタスクを作成することはできません。
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

            {/* タスク名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タスク名 <span className="text-red-500">*</span>
              </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="タスク名を入力してください"
              required
            />
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="タスクの詳細を入力してください"
            />
            </div>

            {/* 親タスク選択 */}
            {!parentTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  親タスク
                </label>
                <select
                  value={formData.parent_task || ''}
                  onChange={(e) => {
                    const parentId = e.target.value ? Number(e.target.value) : null;
                    setFormData(prev => ({
                      ...prev,
                      parent_task: parentId
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">ルートタスクとして作成</option>
                  {availableTasks
                    .filter(task => task.id !== undefined)
                    .map(task => (
                      <option key={task.id} value={task.id}>
                        {'  '.repeat((task.level || 0))}{task.name} (レベル {task.level || 0})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 日程 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始予定日
                </label>
              <input
                type="date"
                name="planned_start_date"
                value={formData.planned_start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了予定日
                </label>
              <input
                type="date"
                name="planned_end_date"
                value={formData.planned_end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              </div>
            </div>

            {/* 見積もり時間と優先度 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  見積もり時間（時間）
                </label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleInputChange}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度
                </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              </div>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ
              </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：開発、設計、テスト"
            />
            </div>

            {/* 先行タスク */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                先行タスク
              </label>
              <select
                value={formData.predecessor_tasks[0] || ''}
                onChange={(e) => {
                  const taskId = e.target.value ? parseInt(e.target.value) : null;
                  setFormData(prev => ({
                    ...prev,
                    predecessor_tasks: taskId ? [taskId] : []
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">先行タスクなし</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {'  '.repeat((task.level || 0))}{task.name} (レベル {task.level || 0})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                このタスクの前に完了する必要があるタスクを選択
              </p>
            </div>

            {/* マイルストーン */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_milestone"
                name="is_milestone"
                checked={formData.is_milestone}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_milestone" className="ml-2 text-sm text-gray-700">
                このタスクをマイルストーンとして設定
              </label>
            </div>


            {/* 担当者選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                担当者
              </label>

              {/* 現在の担当者リスト */}
              {formData.assigned_users.length > 0 && (
                <div className="mb-3">
                  <div className="space-y-2">
                    {formData.assigned_users
                      .map(userId => users.find(u => u.id === userId))
                      .filter((user): user is NonNullable<typeof user> => user !== undefined)
                      .map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {(user.username || user.full_name || 'U')[0]}
                            </div>
                            <span className="text-sm text-gray-900">{user.username} ({user.full_name})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUserSelection(user.id)}
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
                {users.length > 0 ? (
                  users
                    .filter(user => !formData.assigned_users.includes(user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.full_name})
                      </option>
                    ))
                ) : (
                  <option value="" disabled>ユーザー情報を読み込み中...</option>
                )}
              </select>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || (parentTask && parentTask.level >= 1)}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '作成中...' : 'タスクを作成'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};