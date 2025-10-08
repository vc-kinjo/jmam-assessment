'use client';

import React, { useState, useEffect } from 'react';
import { ProjectTemplate, TemplateTask } from '@/types/template';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TemplateCustomizerProps {
  template: any; // PREDEFINED_TEMPLATES の型
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectData: any) => void;
  className?: string;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  template,
  isOpen,
  onClose,
  onConfirm,
  className = ''
}) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [category, setCategory] = useState('');
  const [adjustedTasks, setAdjustedTasks] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<'tasks' | 'timeline'>('tasks');

  // テンプレートが変更されたときの初期化
  useEffect(() => {
    if (template) {
      setProjectName(`${template.name} - ${format(new Date(), 'yyyy/MM/dd', { locale: ja })}`);
      setProjectDescription(template.description || '');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setCategory(template.category);
      setAdjustedTasks(template.tasks.map((task: any) => ({
        ...task,
        estimated_hours: task.estimated_hours || 8,
        priority: task.priority || 'medium'
      })));
    }
  }, [template]);

  // タスクの調整
  const handleTaskAdjustment = (taskId: string, field: string, value: any) => {
    setAdjustedTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
  };

  // プロジェクト作成の確認
  const handleConfirm = () => {
    const projectData = {
      name: projectName,
      description: projectDescription,
      start_date: startDate,
      category,
      template,
      adjustedTasks
    };
    
    onConfirm(projectData);
  };

  // 期間計算
  const calculateProjectDuration = () => {
    if (adjustedTasks.length === 0) return 0;
    return Math.max(...adjustedTasks.map(task => task.start_offset_days + task.duration_days));
  };

  // 終了日計算
  const calculateEndDate = () => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const duration = calculateProjectDuration();
    const end = new Date(start.getTime() + (duration * 24 * 60 * 60 * 1000));
    return format(end, 'yyyy年MM月dd日', { locale: ja });
  };

  if (!isOpen || !template) return null;

  return (
    <div className={`template-customizer fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="modal-content bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 h-5/6 flex flex-col">
        {/* ヘッダー */}
        <div className="modal-header flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">プロジェクトをカスタマイズ</h2>
            <p className="text-gray-600 mt-1">テンプレート: {template.name}</p>
          </div>
          <button
            className="close-button text-gray-400 hover:text-gray-600 p-2"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body flex-1 flex overflow-hidden">
          {/* 左パネル: プロジェクト設定 */}
          <div className="settings-panel w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">プロジェクト設定</h3>
            
            <div className="space-y-4">
              {/* プロジェクト名 */}
              <div>
                <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                  プロジェクト名 *
                </label>
                <input
                  id="project-name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  id="project-description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              {/* 開始日 */}
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                  開始日 *
                </label>
                <input
                  id="start-date"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* カテゴリ */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <input
                  id="category"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              {/* プロジェクト概要 */}
              <div className="project-summary bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">プロジェクト概要</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>タスク数:</span>
                    <span>{adjustedTasks.length}個</span>
                  </div>
                  <div className="flex justify-between">
                    <span>予定期間:</span>
                    <span>{calculateProjectDuration()}日</span>
                  </div>
                  <div className="flex justify-between">
                    <span>終了予定:</span>
                    <span>{calculateEndDate()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>総見積時間:</span>
                    <span>{adjustedTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)}時間</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右パネル: タスクプレビュー */}
          <div className="preview-panel flex-1 p-6 overflow-y-auto">
            <div className="preview-header flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">タスクプレビュー</h3>
              <div className="preview-controls flex space-x-2">
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'tasks' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setPreviewMode('tasks')}
                >
                  タスク一覧
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setPreviewMode('timeline')}
                >
                  タイムライン
                </button>
              </div>
            </div>

            {previewMode === 'tasks' ? (
              <div className="task-list space-y-3">
                {adjustedTasks.map((task, index) => (
                  <div key={task.id} className="task-item bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{task.name}</h4>
                      {task.is_milestone && (
                        <span className="milestone-badge px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          マイルストーン
                        </span>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="task-properties grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="block text-gray-500 mb-1">期間</label>
                        <input
                          type="number"
                          min="1"
                          value={task.duration_days}
                          onChange={(e) => handleTaskAdjustment(task.id, 'duration_days', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-xs text-gray-400">日</span>
                      </div>
                      
                      <div>
                        <label className="block text-gray-500 mb-1">見積時間</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={task.estimated_hours}
                          onChange={(e) => handleTaskAdjustment(task.id, 'estimated_hours', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-xs text-gray-400">時間</span>
                      </div>

                      <div>
                        <label className="block text-gray-500 mb-1">優先度</label>
                        <select
                          value={task.priority}
                          onChange={(e) => handleTaskAdjustment(task.id, 'priority', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-500 mb-1">開始日オフセット</label>
                        <div className="text-sm text-gray-600">
                          {task.start_offset_days}日目から
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="timeline-view">
                <div className="timeline-chart bg-gray-50 rounded-lg p-4 h-96 overflow-x-auto">
                  <div className="timeline-header mb-4">
                    <div className="flex space-x-2 text-sm text-gray-600">
                      {Array.from({ length: Math.ceil(calculateProjectDuration() / 7) }, (_, weekIndex) => (
                        <div key={weekIndex} className="timeline-week flex-shrink-0 w-20 text-center">
                          Week {weekIndex + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="timeline-tasks space-y-2">
                    {adjustedTasks.map((task, index) => (
                      <div key={task.id} className="timeline-task-row flex items-center">
                        <div className="task-name w-32 flex-shrink-0 text-sm truncate pr-4">
                          {task.name}
                        </div>
                        <div className="task-bar-container flex-1 relative h-6">
                          <div
                            className={`task-bar absolute top-1 h-4 rounded ${
                              task.is_milestone 
                                ? 'bg-yellow-400' 
                                : task.priority === 'high' 
                                  ? 'bg-red-400' 
                                  : task.priority === 'medium'
                                    ? 'bg-blue-400'
                                    : 'bg-gray-400'
                            }`}
                            style={{
                              left: `${(task.start_offset_days / calculateProjectDuration()) * 100}%`,
                              width: `${(task.duration_days / calculateProjectDuration()) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="modal-footer flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            className="px-6 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            onClick={handleConfirm}
            disabled={!projectName.trim() || !startDate}
          >
            プロジェクトを作成
          </button>
        </div>
      </div>
    </div>
  );
};