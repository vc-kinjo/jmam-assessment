'use client';

import React, { useState, useEffect } from 'react';
import { Task, TASK_STATUSES, TASK_PRIORITIES, ValidPredecessorTask } from '@/types/task';
import { useTaskStore } from '@/stores/taskStore';
import { TaskService } from '@/services/taskService';

interface TaskEditorProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  projectId?: number;
  allTasks?: Task[];
  className?: string;
}

export const TaskEditor: React.FC<TaskEditorProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  projectId,
  allTasks = [],
  className = ''
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableParentTasks, setAvailableParentTasks] = useState<Task[]>([]);
  const [availablePredecessors, setAvailablePredecessors] = useState<ValidPredecessorTask[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);

  // タスクデータが変更されたときにフォームデータを更新
  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        description: task.description || '',
        planned_start_date: task.planned_start_date || '',
        planned_end_date: task.planned_end_date || '',
        estimated_hours: task.estimated_hours || 0,
        priority: task.priority || 'medium',
        status: task.status || 'not_started',
        progress_rate: task.progress_rate || 0,
        category: task.category || '',
        is_milestone: task.is_milestone || false,
        parent_task_id: task.parent_task_id || null,
        level: task.level || 0,
      });
      setErrors({});
    } else {
      setFormData({
        name: '',
        description: '',
        planned_start_date: '',
        planned_end_date: '',
        estimated_hours: 0,
        priority: 'medium',
        status: 'not_started',
        progress_rate: 0,
        category: '',
        is_milestone: false,
        parent_task_id: null,
        level: 0,
      });
    }
  }, [task]);

  // 親タスクと先行タスクの選択肢を準備
  useEffect(() => {
    if (isOpen && projectId) {
      // 親タスク候補を設定（自分自身と自分の子タスクを除く）
      const parentCandidates = allTasks.filter(t => 
        t.id !== task?.id && // 自分自身は除く
        t.parent_task_id !== task?.id && // 自分の子タスクは除く
        t.level < 2 // 最大3レベルまでなので、レベル2以下のタスクのみ親になれる
      );
      setAvailableParentTasks(parentCandidates);

      // 先行タスクの候補を取得
      if (task?.id) {
        loadValidPredecessors(task.id);
      } else {
        // 新規タスクの場合は全てのタスクが先行タスク候補
        const predecessorCandidates = allTasks.map(t => ({
          id: t.id,
          name: t.name,
          level: t.level,
          parent_task_id: t.parent_task_id
        }));
        setAvailablePredecessors(predecessorCandidates);
      }
    }
  }, [isOpen, projectId, task, allTasks]);

  // 有効な先行タスク一覧を取得
  const loadValidPredecessors = async (taskId: number) => {
    if (!projectId) return;
    
    try {
      const response = await TaskService.getValidPredecessorsForGantt(taskId, projectId);
      if (response.success && response.data?.predecessors) {
        setAvailablePredecessors(response.data.predecessors);
      }
    } catch (error) {
      console.error('Failed to load valid predecessors:', error);
    }
  };

  // フォームデータの更新
  const handleInputChange = (field: keyof Task, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'タスク名は必須です';
    }

    if (formData.planned_start_date && formData.planned_end_date) {
      if (new Date(formData.planned_start_date) >= new Date(formData.planned_end_date)) {
        newErrors.planned_end_date = '終了日は開始日より後である必要があります';
      }
    }

    if (formData.progress_rate && (formData.progress_rate < 0 || formData.progress_rate > 100)) {
      newErrors.progress_rate = '進捗率は0-100の範囲で入力してください';
    }

    if (formData.estimated_hours && formData.estimated_hours < 0) {
      newErrors.estimated_hours = '見積時間は0以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存処理
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      
      // 先行タスクの依存関係を保存
      if (task?.id && selectedDependencies.length > 0) {
        for (const predecessorId of selectedDependencies) {
          try {
            await TaskService.createTaskDependency({
              predecessor_id: predecessorId,
              successor_id: task.id,
              dependency_type: 'finish_to_start',
              lag_days: 0
            });
          } catch (error) {
            console.error('Failed to create dependency:', error);
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Task save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // モーダルが閉じられている場合は何も表示しない
  if (!isOpen) return null;

  return (
    <div className={`task-editor fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* ヘッダー */}
        <div className="modal-header flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? 'タスク編集' : '新しいタスク'}
          </h2>
          <button
            className="close-button text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="modal-body p-6 space-y-6">
          {/* タスク名 */}
          <div className="form-group">
            <label htmlFor="task-name" className="block text-sm font-medium text-gray-700 mb-2">
              タスク名 *
            </label>
            <input
              id="task-name"
              type="text"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : ''
              }`}
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="タスク名を入力してください"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* 説明 */}
          <div className="form-group">
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              id="task-description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="タスクの説明を入力してください"
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                開始日
              </label>
              <input
                id="start-date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.planned_start_date || ''}
                onChange={(e) => handleInputChange('planned_start_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                終了日
              </label>
              <input
                id="end-date"
                type="date"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.planned_end_date ? 'border-red-500' : ''
                }`}
                value={formData.planned_end_date || ''}
                onChange={(e) => handleInputChange('planned_end_date', e.target.value)}
              />
              {errors.planned_end_date && <p className="mt-1 text-sm text-red-600">{errors.planned_end_date}</p>}
            </div>
          </div>

          {/* ステータスと優先度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                {TASK_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                優先度
              </label>
              <select
                id="priority"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.priority || ''}
                onChange={(e) => handleInputChange('priority', e.target.value)}
              >
                {TASK_PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 見積時間と進捗率 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="estimated-hours" className="block text-sm font-medium text-gray-700 mb-2">
                見積時間（時間）
              </label>
              <input
                id="estimated-hours"
                type="number"
                min="0"
                step="0.5"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.estimated_hours ? 'border-red-500' : ''
                }`}
                value={formData.estimated_hours || ''}
                onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)}
              />
              {errors.estimated_hours && <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="progress-rate" className="block text-sm font-medium text-gray-700 mb-2">
                進捗率（%）
              </label>
              <input
                id="progress-rate"
                type="number"
                min="0"
                max="100"
                step="1"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.progress_rate ? 'border-red-500' : ''
                }`}
                value={formData.progress_rate || ''}
                onChange={(e) => handleInputChange('progress_rate', parseInt(e.target.value) || 0)}
              />
              {errors.progress_rate && <p className="mt-1 text-sm text-red-600">{errors.progress_rate}</p>}
            </div>
          </div>

          {/* 親タスクと先行タスク */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="parent-task" className="block text-sm font-medium text-gray-700 mb-2">
                親タスク
              </label>
              <select
                id="parent-task"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.parent_task_id || ''}
                onChange={(e) => {
                  const parentId = e.target.value ? parseInt(e.target.value) : null;
                  const level = parentId ? (availableParentTasks.find(t => t.id === parentId)?.level || 0) + 1 : 0;
                  handleInputChange('parent_task_id', parentId);
                  handleInputChange('level', level);
                }}
              >
                <option value="">親タスクなし（ルートタスク）</option>
                {availableParentTasks.map(parentTask => (
                  <option key={parentTask.id} value={parentTask.id}>
                    {'  '.repeat(parentTask.level)}{parentTask.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="predecessors" className="block text-sm font-medium text-gray-700 mb-2">
                先行タスク
              </label>
              <select
                id="predecessors"
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                value={selectedDependencies.map(d => d.toString())}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setSelectedDependencies(selected);
                }}
              >
                {availablePredecessors.map(predecessor => (
                  <option key={predecessor.id} value={predecessor.id}>
                    {'  '.repeat(predecessor.level)}{predecessor.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Ctrl/Cmdキーを押しながらクリックで複数選択</p>
            </div>
          </div>

          {/* カテゴリーとマイルストーン */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー
              </label>
              <input
                id="category"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="カテゴリーを入力"
              />
            </div>
            <div className="form-group">
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={formData.is_milestone || false}
                  onChange={(e) => handleInputChange('is_milestone', e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">マイルストーン</span>
              </label>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="modal-footer flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            className="cancel-button px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            className="save-button px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};