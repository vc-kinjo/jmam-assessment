'use client';

import React, { useState, useEffect } from 'react';
import { TaskCreateRequest, TASK_PRIORITIES, Task, MAX_TASK_LEVEL } from '@/types/task';
import { User } from '@/types/user';
import { TaskService } from '@/services/taskService';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: TaskCreateRequest) => void;
  projectId: number;
  parentTasks?: Task[];
  users?: User[];
  selectedParentTask?: Task | null;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  projectId,
  parentTasks = [],
  users = [],
  selectedParentTask = null
}) => {
  const [formData, setFormData] = useState<TaskCreateRequest>(() => ({
    project_id: projectId,
    parent_task_id: selectedParentTask?.id,
    level: selectedParentTask ? selectedParentTask.level + 1 : 0,
    name: '',
    description: '',
    planned_start_date: '',
    planned_end_date: '',
    estimated_hours: 8,
    priority: 'medium',
    category: '',
    is_milestone: false,
    predecessor_task_ids: []
  }));

  const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
  const [predecessorTaskId, setPredecessorTaskId] = useState<number | null>(null);
  const [availablePredecessors, setAvailablePredecessors] = useState<Task[]>([]);

  // selectedParentTaskが変更された時にformDataを更新
  useEffect(() => {
    if (selectedParentTask) {
      setFormData(prev => ({
        ...prev,
        parent_task_id: selectedParentTask.id,
        level: selectedParentTask.level + 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        parent_task_id: undefined,
        level: 0
      }));
    }
  }, [selectedParentTask]);

  // 利用可能な先行タスクをフィルタリング
  useEffect(() => {
    const availableTasks = parentTasks.filter(task => {
      // 自分自身と子タスクは除外
      if (formData.parent_task_id) {
        const currentParent = parentTasks.find(t => t.id === formData.parent_task_id);
        if (currentParent && (task.level === currentParent.level || task.parent_task_id === formData.parent_task_id)) {
          return true; // 同じレベルまたは兄弟タスク
        }
        if (currentParent && task.level <= currentParent.level && !task.parent_task_id) {
          return true; // 上位レベルのルートタスク
        }
        return false;
      }
      return task.level === 0; // ルートタスクの場合は他のルートタスクのみ
    });
    setAvailablePredecessors(availableTasks);
  }, [parentTasks, formData.parent_task_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 先行タスクをformDataに含めてタスク作成
    const taskDataWithPredecessors = {
      ...formData,
      predecessor_task_ids: predecessorTaskId ? [predecessorTaskId] : []
    };
    
    console.log('TaskCreateModal submitting:', taskDataWithPredecessors); // デバッグログ
    
    try {
      // 先行タスクを含めてタスクを作成
      const result = await onCreate(taskDataWithPredecessors);
      console.log('Task created with predecessors, result:', result); // デバッグログ
      
      onClose();
      
      // フォームをリセット
      setFormData({
        project_id: projectId,
        parent_task_id: selectedParentTask?.id,
        level: selectedParentTask ? selectedParentTask.level + 1 : 0,
        name: '',
        description: '',
        planned_start_date: '',
        planned_end_date: '',
        estimated_hours: 8,
        priority: 'medium',
        category: '',
        is_milestone: false,
        predecessor_task_ids: []
      });
      setAssignedUsers([]);
      setPredecessorTaskId(null);
    } catch (error) {
      console.error('タスク作成エラー:', error);
      // エラー処理は呼び出し元で行う
      onCreate(formData);
      onClose();
    }
  };

  const handleInputChange = (field: keyof TaskCreateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUserAssignmentChange = (userId: number, assigned: boolean) => {
    if (assigned) {
      setAssignedUsers(prev => [...prev, userId]);
    } else {
      setAssignedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <div className="fixed inset-0 bg-black bg-opacity-60"></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedParentTask ? `${selectedParentTask.name} のサブタスクを作成` : '新しいタスクを作成'}
            </h2>
            {selectedParentTask && (
              <p className="text-sm text-gray-600 mt-1">
                レベル {selectedParentTask.level + 1} のサブタスクとして作成されます
              </p>
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
              {/* タスク名 */}
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
                  placeholder="タスク名を入力してください"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="タスクの詳細を入力してください"
                />
              </div>

              {/* 親タスク選択 */}
              {!selectedParentTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    親タスク
                  </label>
                  <select
                    value={formData.parent_task_id || ''}
                    onChange={(e) => {
                      const parentId = e.target.value ? Number(e.target.value) : undefined;
                      const parentTask = parentTasks.find(task => task.id === parentId);
                      const level = parentTask ? parentTask.level + 1 : 0;
                      handleInputChange('parent_task_id', parentId);
                      handleInputChange('level', level);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ルートタスクとして作成</option>
                    {parentTasks
                      .filter(task => TaskService.canCreateSubtask(task))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          {'  '.repeat(task.level)}{task.name} (レベル {task.level})
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

              {/* 見積もり時間と優先度 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    見積もり時間（時間）
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

              {/* カテゴリ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：開発、設計、テスト"
                />
              </div>

              {/* 先行タスク */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  先行タスク
                </label>
                <select
                  value={predecessorTaskId || ''}
                  onChange={(e) => setPredecessorTaskId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">先行タスクなし</option>
                  {availablePredecessors.map(task => (
                    <option key={task.id} value={task.id}>
                      {'  '.repeat(task.level)}{task.name} (レベル {task.level})
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
                  checked={formData.is_milestone}
                  onChange={(e) => handleInputChange('is_milestone', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_milestone" className="ml-2 text-sm text-gray-700">
                  このタスクをマイルストーンとして設定
                </label>
              </div>

              {/* 担当者選択 */}
              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    担当者
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={assignedUsers.includes(user.id)}
                          onChange={(e) => handleUserAssignmentChange(user.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`user-${user.id}`} className="ml-2 text-sm text-gray-700">
                          {user.full_name || user.username}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              >
                タスクを作成
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};