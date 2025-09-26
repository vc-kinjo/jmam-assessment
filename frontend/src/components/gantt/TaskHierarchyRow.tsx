'use client';

import React, { useState } from 'react';
import { Task, TaskHierarchy } from '@/types/task';
import { TaskService } from '@/services/taskService';

interface TaskHierarchyRowProps {
  task: TaskHierarchy;
  onTaskClick?: (task: TaskHierarchy) => void;
  onCreateSubtask?: (parentTask: TaskHierarchy) => void;
  onDeleteTask?: (taskId: number) => void;
  level?: number;
}

export const TaskHierarchyRow: React.FC<TaskHierarchyRowProps> = ({
  task,
  onTaskClick,
  onCreateSubtask,
  onDeleteTask,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const indent = TaskService.getTaskIndent(task.level);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const canCreateSubtask = TaskService.canCreateSubtask(task as any);

  const getStatusColor = (status: string) => {
    const colors = {
      'not_started': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'not_started': '未開始',
      'in_progress': '進行中',
      'completed': '完了',
      'on_hold': '保留',
      'cancelled': 'キャンセル'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <>
      <div 
        className="flex items-center py-2 px-4 hover:bg-gray-50 border-b border-gray-100"
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        {/* 展開/縮小ボタン */}
        <div className="w-6 flex justify-center">
          {hasSubtasks && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* タスク名 */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {task.name}
            </h3>
            <span className="ml-2 text-xs text-gray-500">
              レベル {task.level}
            </span>
          </div>
        </div>

        {/* ステータス */}
        <div className="ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        {/* 進捗率 */}
        <div className="ml-4 w-20">
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${task.progress_rate}%` }}
              />
            </div>
            <span className="ml-2 text-xs text-gray-600">{task.progress_rate}%</span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="ml-4 flex items-center space-x-2">
          {canCreateSubtask && (
            <button
              onClick={() => onCreateSubtask?.(task)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="サブタスクを作成"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDeleteTask?.(task.id)}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="タスクを削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* サブタスクを再帰的に表示 */}
      {isExpanded && hasSubtasks && (
        <>
          {task.subtasks.map((subtask) => (
            <TaskHierarchyRow
              key={subtask.id}
              task={subtask}
              onTaskClick={onTaskClick}
              onCreateSubtask={onCreateSubtask}
              onDeleteTask={onDeleteTask}
              level={level + 1}
            />
          ))}
        </>
      )}
    </>
  );
};