'use client';

import React, { useMemo, useState } from 'react';
import { Gantt, Task as WamraTask } from '@wamra/gantt-task-react';
import { Task } from '@/types/task';
// date-fnsが利用できない場合の代替関数
const parseISO = (dateString: string): Date => new Date(dateString);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const format = (date: Date, formatString: string): string => {
  if (formatString === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  return date.toISOString();
};

interface WamraGanttChartProps {
  tasks: Task[];
  projectId: number;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task | null) => void;
  selectedTaskId?: number;
  className?: string;
}

export const WamraGanttChart: React.FC<WamraGanttChartProps> = ({
  tasks,
  projectId,
  onTaskUpdate,
  onTaskSelect,
  selectedTaskId,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // TaskをWamraTask形式に変換
  const wamraTasks: WamraTask[] = useMemo(() => {
    return tasks.map((task, index) => {
      // 日付の処理
      const startDate = task.planned_start_date 
        ? parseISO(task.planned_start_date)
        : new Date();
      
      const endDate = task.planned_end_date 
        ? parseISO(task.planned_end_date)
        : addDays(startDate, Math.max(task.estimated_hours || 1, 1));

      // タスクタイプの決定
      let type: 'task' | 'milestone' | 'project' = 'task';
      if (task.is_milestone) {
        type = 'milestone';
      } else if (task.level === 0 && tasks.some(t => t.parent_task_id === task.id)) {
        type = 'project';
      }

      return {
        start: startDate,
        end: endDate,
        name: task.name,
        id: task.id.toString(),
        type,
        progress: task.progress_rate / 100,
        isDisabled: task.status === 'completed' || task.status === 'cancelled',
        styles: {
          backgroundColor: getTaskColor(task),
          backgroundSelectedColor: getSelectedTaskColor(task),
          progressColor: getProgressColor(task),
          progressSelectedColor: getSelectedProgressColor(task),
        },
        dependencies: task.predecessor_task_ids?.map(id => id.toString()) || [],
        hideChildren: false,
        displayOrder: index,
      };
    });
  }, [tasks]);

  // タスクの色を決定する関数
  const getTaskColor = (task: Task): string => {
    switch (task.priority) {
      case 'high':
        return '#ef4444'; // red-500
      case 'medium':
        return '#f59e0b'; // amber-500
      case 'low':
        return '#10b981'; // emerald-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const getSelectedTaskColor = (task: Task): string => {
    const baseColor = getTaskColor(task);
    // 選択時は少し暗くする
    switch (task.priority) {
      case 'high':
        return '#dc2626'; // red-600
      case 'medium':
        return '#d97706'; // amber-600
      case 'low':
        return '#059669'; // emerald-600
      default:
        return '#4b5563'; // gray-600
    }
  };

  const getProgressColor = (task: Task): string => {
    switch (task.status) {
      case 'completed':
        return '#059669'; // emerald-600
      case 'in_progress':
        return '#3b82f6'; // blue-500
      case 'on_hold':
        return '#f59e0b'; // amber-500
      default:
        return '#9ca3af'; // gray-400
    }
  };

  const getSelectedProgressColor = (task: Task): string => {
    const baseColor = getProgressColor(task);
    // 選択時は少し暗くする
    switch (task.status) {
      case 'completed':
        return '#047857'; // emerald-700
      case 'in_progress':
        return '#2563eb'; // blue-600
      case 'on_hold':
        return '#d97706'; // amber-600
      default:
        return '#6b7280'; // gray-500
    }
  };

  // イベントハンドラー
  const handleTaskChange = (task: WamraTask) => {
    const taskId = parseInt(task.id);
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (!originalTask || !onTaskUpdate) return;

    const updates: Partial<Task> = {
      name: task.name,
      planned_start_date: format(task.start, 'yyyy-MM-dd'),
      planned_end_date: format(task.end, 'yyyy-MM-dd'),
      progress_rate: Math.round(task.progress * 100),
    };

    onTaskUpdate(taskId, updates);
  };

  const handleTaskDelete = (task: WamraTask) => {
    // 削除確認は親コンポーネントで処理
    console.log('Task delete requested:', task.name);
  };

  const handleTaskSelect = (task: WamraTask, isSelected: boolean) => {
    if (isSelected && onTaskSelect) {
      const originalTask = tasks.find(t => t.id.toString() === task.id);
      onTaskSelect(originalTask || null);
    } else if (!isSelected && onTaskSelect) {
      onTaskSelect(null);
    }
  };

  const handleExpanderClick = (task: WamraTask) => {
    console.log('Expander clicked:', task.name);
  };

  // スタイリングオプション
  const stylingOptions = {
    headerHeight: 50,
    columnWidth: 65,
    listCellWidth: '155px',
    rowHeight: 50,
    ganttHeight: 0, // 自動調整
    barCornerRadius: 3,
    handleWidth: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    barProgressColor: '#3b82f6',
    barProgressSelectedColor: '#2563eb',
    barBackgroundColor: '#e5e7eb',
    barBackgroundSelectedColor: '#d1d5db',
    projectProgressColor: '#059669',
    projectProgressSelectedColor: '#047857',
    projectBackgroundColor: '#f3f4f6',
    projectBackgroundSelectedColor: '#e5e7eb',
    milestoneBackgroundColor: '#f59e0b',
    milestoneBackgroundSelectedColor: '#d97706',
    rtl: false,
  };

  // 表示オプション
  const displayOptions = {
    viewMode: 'Day' as const,
    preStepsCount: 1,
    locale: 'ja',
  };

  // イベントオプション
  const eventOptions = {
    timeStep: 300000, // 5分
    onDateChange: handleTaskChange,
    onDelete: handleTaskDelete,
    onSelect: handleTaskSelect,
    onExpanderClick: handleExpanderClick,
  };

  if (tasks.length === 0) {
    return (
      <div className={`gantt-empty-state bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">タスクがありません</h3>
        <p className="text-gray-600">新しいタスクを作成してプロジェクトを開始しましょう</p>
      </div>
    );
  }

  return (
    <div className={`wamra-gantt-container ${className}`}>
      <style jsx global>{`
        .gantt-task-content {
          color: white;
          text-align: center;
          line-height: 1.2;
          font-weight: 500;
        }
        
        .gantt-table {
          font-family: Inter, system-ui, sans-serif;
        }
        
        .gantt-table-header {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .gantt-row-selected {
          background-color: #eff6ff !important;
        }
        
        .gantt-today-line {
          stroke: #ef4444;
          stroke-width: 2;
        }
      `}</style>
      
      <Gantt
        tasks={wamraTasks}
        viewMode={displayOptions.viewMode}
        preStepsCount={displayOptions.preStepsCount}
        locale={displayOptions.locale}
        onDateChange={eventOptions.onDateChange}
        onDelete={eventOptions.onDelete}
        onSelect={eventOptions.onSelect}
        onExpanderClick={eventOptions.onExpanderClick}
        headerHeight={stylingOptions.headerHeight}
        columnWidth={stylingOptions.columnWidth}
        listCellWidth={stylingOptions.listCellWidth}
        rowHeight={stylingOptions.rowHeight}
        barCornerRadius={stylingOptions.barCornerRadius}
        handleWidth={stylingOptions.handleWidth}
        fontFamily={stylingOptions.fontFamily}
        fontSize={stylingOptions.fontSize}
      />
    </div>
  );
};