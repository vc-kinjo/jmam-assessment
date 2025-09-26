'use client';

import React, { useState, useRef } from 'react';
import { GanttTask } from '@/types/gantt';
import { isMilestone } from '@/utils/ganttUtils';

interface TaskBarProps {
  task: GanttTask;
  isSelected: boolean;
  onSelect: (task: GanttTask) => void;
  onDrag: (taskId: number, deltaX: number, deltaY: number) => void;
  onResize: (taskId: number, direction: 'left' | 'right', deltaX: number) => void;
  className?: string;
}

export const TaskBar: React.FC<TaskBarProps> = ({
  task,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragStart({ x: e.clientX, y: e.clientY });
    
    // リサイズハンドルかどうかをチェック
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle-left')) {
      setIsResizing('left');
    } else if (target.classList.contains('resize-handle-right')) {
      setIsResizing('right');
    } else {
      setIsDragging(true);
    }

    // タスクを選択
    onSelect(task);

    // グローバルなマウスイベントを設定
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ドラッグ中
  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (isDragging) {
      onDrag(task.id, deltaX, deltaY);
    } else if (isResizing) {
      onResize(task.id, isResizing, deltaX);
    }
  };

  // ドラッグ終了
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // 進捗率の表示幅を計算
  const progressWidth = Math.max(0, (task.progress_rate / 100) * task.width);

  // マイルストーンの場合は菱形で表示
  if (isMilestone(task)) {
    return (
      <div
        ref={barRef}
        className={`task-bar milestone absolute cursor-pointer select-none ${className} ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{
          left: task.x,
          top: task.y + 8,
          width: 20,
          height: 20,
          backgroundColor: task.color,
          transform: 'rotate(45deg)',
          borderRadius: '2px',
        }}
        onMouseDown={handleMouseDown}
        title={`${task.name} (マイルストーン)`}
      />
    );
  }

  return (
    <div
      ref={barRef}
      className={`task-bar absolute cursor-pointer select-none ${className} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: task.x,
        top: task.y + 8,
        width: task.width,
        height: task.height,
        backgroundColor: task.color,
        borderRadius: '4px',
        boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseDown={handleMouseDown}
      title={`${task.name} (${task.progress_rate}%)`}
    >
      {/* 進捗バー */}
      {task.progress_rate > 0 && (
        <div
          className="progress-bar absolute top-0 left-0 h-full rounded-l-4px opacity-80"
          style={{
            width: `${progressWidth}px`,
            backgroundColor: task.progress_rate === 100 ? '#10b981' : '#60a5fa',
            borderRadius: '4px 0 0 4px',
          }}
        />
      )}

      {/* タスク名 */}
      <div 
        className="task-label absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
        style={{ color: task.textColor }}
      >
        {task.name}
      </div>

      {/* リサイズハンドル（左） */}
      {isSelected && !isMilestone(task) && (
        <div
          className="resize-handle-left absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
          style={{ borderRadius: '4px 0 0 4px' }}
        />
      )}

      {/* リサイズハンドル（右） */}
      {isSelected && !isMilestone(task) && (
        <div
          className="resize-handle-right absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
          style={{ borderRadius: '0 4px 4px 0' }}
        />
      )}

      {/* 遅延インジケーター */}
      {task.actual_end_date && task.planned_end_date && 
       new Date(task.actual_end_date) > new Date(task.planned_end_date) && (
        <div
          className="delay-indicator absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full transform translate-x-1 -translate-y-1"
          title="遅延"
        />
      )}

      {/* 優先度インジケーター */}
      {task.priority === 'high' && (
        <div
          className="priority-indicator absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1 -translate-y-1"
          title="高優先度"
        />
      )}
    </div>
  );
};