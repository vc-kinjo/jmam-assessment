'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskUpdateRequest, TASK_STATUSES, TASK_PRIORITIES, TaskCreateRequest, MAX_TASK_LEVEL } from '@/types/task';
import { User } from '@/types/user';
import { TaskService } from '@/services/taskService';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: (taskId: number, updates: TaskUpdateRequest) => Promise<Task>;
  onDelete?: (task: Task) => void;
  users?: User[];
  parentTasks?: Task[];
  onCreateSubtask?: (parentTask: Task) => void;
  allTasks?: Task[]; // 全タスクリストを追加
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  users = [],
  parentTasks = [],
  onCreateSubtask,
  allTasks = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TaskUpdateRequest>({});
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [predecessorTasks, setPredecessorTasks] = useState<Task[]>([]);
  const [availablePredecessors, setAvailablePredecessors] = useState<Task[]>([]);

  // 利用可能な先行タスクを取得
  useEffect(() => {
    if (task && parentTasks.length > 0) {
      // 自分自身と子タスクを除外
      const available = parentTasks.filter(t => 
        t.id !== task.id && 
        t.parent_task_id !== task.id &&
        !task.predecessor_task_ids?.includes(t.id)
      );
      setAvailablePredecessors(available);
    }
  }, [task, parentTasks]);

  useEffect(() => {
    if (task) {
      setCurrentTask(task);
      setFormData({
        name: task.name,
        description: task.description,
        planned_start_date: task.planned_start_date,
        planned_end_date: task.planned_end_date,
        actual_start_date: task.actual_start_date,
        actual_end_date: task.actual_end_date,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        progress_rate: task.progress_rate,
        priority: task.priority,
        status: task.status,
        category: task.category,
        is_milestone: task.is_milestone,
        predecessor_task_ids: task.predecessor_task_ids || []
      });

      // 先行タスクの詳細情報を取得（allTasksから取得）
      console.log('TaskDetailModal - task.predecessor_task_ids:', task.predecessor_task_ids);
      console.log('TaskDetailModal - allTasks:', allTasks);
      
      if (task.predecessor_task_ids && task.predecessor_task_ids.length > 0) {
        console.log('TaskDetailModal - 先行タスク詳細をallTasksから取得中:', task.predecessor_task_ids);
        
        const predecessors = task.predecessor_task_ids
          .map(id => allTasks.find(t => t.id === id))
          .filter(t => t !== undefined) as Task[];
        
        console.log('TaskDetailModal - 取得した先行タスク詳細:', predecessors);
        setPredecessorTasks(predecessors);
      } else {
        console.log('TaskDetailModal - 先行タスクなし');
        setPredecessorTasks([]);
      }
    }
  }, [task, allTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    try {
      setLoading(true);
      
      // デバッグ: 送信するデータをコンソールに出力
      console.log('TaskDetailModal - 送信するformData:', formData);
      console.log('TaskDetailModal - predecessor_task_ids:', formData.predecessor_task_ids);
      
      const updatedTask = await onUpdate(currentTask.id, formData);
      
      // 更新されたタスクデータで現在のタスク情報を更新
      console.log('=== TASKDETAILMODAL UPDATE DIAGNOSIS ===');
      console.log('1. Original updatedTask from API:', updatedTask);
      console.log('2. updatedTask.predecessor_task_ids:', updatedTask.predecessor_task_ids);
      console.log('3. formData.predecessor_task_ids:', formData.predecessor_task_ids);
      
      // 更新されたタスクから先行タスクIDを取得（APIが返さない場合はフォームデータから）
      const finalPredecessorIds = updatedTask.predecessor_task_ids || formData.predecessor_task_ids || [];
      
      const taskWithPredecessors = {
        ...updatedTask,
        predecessor_task_ids: finalPredecessorIds
      };
      
      console.log('4. Final taskWithPredecessors:', taskWithPredecessors);
      console.log('5. taskWithPredecessors.predecessor_task_ids:', taskWithPredecessors.predecessor_task_ids);
      console.log('====================================');
      
      // currentTaskを更新（これによりuseEffectが再実行されて先行タスク詳細が更新される）
      setCurrentTask(taskWithPredecessors);
      
      // formDataも更新（編集画面とデータを同期）
      setFormData(prev => ({
        ...prev,
        predecessor_task_ids: finalPredecessorIds
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error('タスク更新エラー:', error);
      alert('タスクの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TaskUpdateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddPredecessor = (predecessorId: number) => {
    const currentIds = formData.predecessor_task_ids || [];
    if (!currentIds.includes(predecessorId)) {
      const newIds = [...currentIds, predecessorId];
      console.log('TaskDetailModal - 先行タスク追加:', predecessorId, 'new IDs:', newIds);
      
      setFormData(prev => ({
        ...prev,
        predecessor_task_ids: newIds
      }));

      // 先行タスクの詳細をallTasksから取得して表示用リストに追加
      const predecessorTask = allTasks.find(t => t.id === predecessorId);
      if (predecessorTask) {
        setPredecessorTasks(prev => [...prev, predecessorTask]);
      }
    }
  };

  const handleRemovePredecessor = (predecessorId: number) => {
    const currentIds = formData.predecessor_task_ids || [];
    const newIds = currentIds.filter(id => id !== predecessorId);
    console.log('TaskDetailModal - 先行タスク削除:', predecessorId, 'new IDs:', newIds);
    
    setFormData(prev => ({
      ...prev,
      predecessor_task_ids: newIds
    }));

    // 表示用リストからも削除
    setPredecessorTasks(prev => prev.filter(task => task.id !== predecessorId));
  };

  const handleCreateSubtask = () => {
    if (currentTask && onCreateSubtask) {
      onCreateSubtask(currentTask);
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

  if (!isOpen || !currentTask) return null;

  return (
    <div className="fixed inset-0 z-[40] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {currentTask.is_milestone && (
                <div className="w-4 h-4 bg-yellow-400 transform rotate-45"></div>
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'タスクを編集' : 'タスクの詳細'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && currentTask && TaskService.canCreateSubtask(currentTask) && onCreateSubtask && (
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
                  {onDelete && currentTask && (
                    <button
                      onClick={() => onDelete(currentTask)}
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
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
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
                        value={formData.name || ''}
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
                        value={formData.description || ''}
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
                        value={formData.category || ''}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_milestone_edit"
                        checked={formData.is_milestone || false}
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
                          value={formData.status || ''}
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
                          value={formData.priority || ''}
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
                          value={formData.planned_start_date || ''}
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
                          value={formData.planned_end_date || ''}
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
                          value={formData.actual_start_date || ''}
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
                          value={formData.actual_end_date || ''}
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
                          value={formData.estimated_hours || 0}
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
                          value={formData.actual_hours || 0}
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
                          value={formData.progress_rate || 0}
                          onChange={(e) => handleInputChange('progress_rate', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 先行タスクの編集セクション */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        先行タスク
                      </label>
                      
                      {/* 現在の先行タスクリスト */}
                      {predecessorTasks.length > 0 && (
                        <div className="mb-3">
                          <div className="space-y-2">
                            {predecessorTasks.map(predecessor => (
                              <div key={predecessor.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                                <span className="text-sm text-gray-900">{predecessor.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePredecessor(predecessor.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 先行タスク追加 */}
                      {availablePredecessors.length > 0 && (
                        <div>
                          <select
                            onChange={(e) => {
                              const predecessorId = parseInt(e.target.value);
                              if (predecessorId) {
                                handleAddPredecessor(predecessorId);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue=""
                          >
                            <option value="">-- 先行タスクを追加 --</option>
                            {availablePredecessors.map(task => (
                              <option key={task.id} value={task.id}>
                                {task.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: currentTask.name,
                        description: currentTask.description,
                        planned_start_date: currentTask.planned_start_date,
                        planned_end_date: currentTask.planned_end_date,
                        actual_start_date: currentTask.actual_start_date,
                        actual_end_date: currentTask.actual_end_date,
                        estimated_hours: currentTask.estimated_hours,
                        actual_hours: currentTask.actual_hours,
                        progress_rate: currentTask.progress_rate,
                        priority: currentTask.priority,
                        status: currentTask.status,
                        category: currentTask.category,
                        is_milestone: currentTask.is_milestone,
                        predecessor_task_ids: currentTask.predecessor_task_ids || []
                      });
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
                          <p className="text-gray-900 mt-1">{currentTask.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">階層レベル:</span>
                          <div className="flex items-center mt-1">
                            <span className="text-gray-900">レベル {currentTask.level}</span>
                            {currentTask.parent_task_id && (
                              <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                サブタスク
                              </span>
                            )}
                            {currentTask.level === 0 && (
                              <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                ルートタスク
                              </span>
                            )}
                          </div>
                        </div>
                        {currentTask.description && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">説明:</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap">{currentTask.description}</p>
                          </div>
                        )}
                        {currentTask.category && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">カテゴリ:</span>
                            <p className="text-gray-900 mt-1">{currentTask.category}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">担当者</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {currentTask.assignments && currentTask.assignments.length > 0 ? (
                          <div className="space-y-2">
                            {currentTask.assignments.map(assignment => (
                              <div key={assignment.id} className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {(assignment.user?.full_name || assignment.user?.username || 'U')[0]}
                                </div>
                                <span className="text-gray-900">
                                  {assignment.user?.full_name || assignment.user?.username || '不明'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">担当者が設定されていません</p>
                        )}
                      </div>
                    </div>

                    {/* 先行タスクの表示セクション */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">先行タスク</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {predecessorTasks.length > 0 ? (
                          <div className="space-y-2">
                            {predecessorTasks.map(predecessor => (
                              <div key={predecessor.id} className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-gray-900">{predecessor.name}</span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  ID: {predecessor.id}
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
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentTask.status)}`}>
                            {TASK_STATUSES.find(s => s.value === currentTask.status)?.label || currentTask.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">優先度:</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(currentTask.priority)}`}>
                            {TASK_PRIORITIES.find(p => p.value === currentTask.priority)?.label || currentTask.priority}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">進捗率:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${currentTask.progress_rate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">{currentTask.progress_rate}%</span>
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
                            <p className="text-gray-900 mt-1">{formatDate(currentTask.planned_start_date)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">終了予定日:</span>
                            <p className="text-gray-900 mt-1">{formatDate(currentTask.planned_end_date)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-600">実開始日:</span>
                            <p className="text-gray-900 mt-1">{formatDate(currentTask.actual_start_date)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">実終了日:</span>
                            <p className="text-gray-900 mt-1">{formatDate(currentTask.actual_end_date)}</p>
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
                            <p className="text-gray-900 mt-1">{currentTask.estimated_hours}h</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">実績時間:</span>
                            <p className="text-gray-900 mt-1">{currentTask.actual_hours}h</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* サブタスク */}
                {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">サブタスク</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {currentTask.subtasks.map(subtask => (
                          <div key={subtask.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center space-x-2">
                              <span className={`w-3 h-3 rounded-full ${
                                subtask.status === 'completed' ? 'bg-green-500' : 
                                subtask.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                              }`}></span>
                              <span className="text-gray-900">{subtask.name}</span>
                            </div>
                            <span className="text-sm text-gray-500">{subtask.progress_rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};