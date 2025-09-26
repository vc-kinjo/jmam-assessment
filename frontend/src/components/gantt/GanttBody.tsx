'use client';

import React from 'react';
import { GanttTask, DEFAULT_GANTT_CONFIG, GanttViewType, GanttDependency } from '@/types/gantt';
import { TaskBar } from './TaskBar';
import { DependencyArrow } from './DependencyArrow';
import { getWeekendDays, getTodayPosition, calculateDayWidth } from '@/utils/ganttUtils';

interface GanttBodyProps {
  tasks: GanttTask[];
  dependencies?: GanttDependency[];
  criticalTasks?: number[];
  startDate: Date;
  endDate: Date;
  viewType: GanttViewType;
  width: number;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  onTaskDrag: (taskId: number, deltaX: number, deltaY: number) => void;
  onTaskSelect: (task: GanttTask) => void;
  onTaskExpand?: (taskId: number, expanded: boolean) => void;
  selectedTaskId?: number;
  className?: string;
}

export const GanttBody: React.FC<GanttBodyProps> = ({
  tasks,
  dependencies = [],
  criticalTasks = [],
  startDate,
  endDate,
  viewType,
  width,
  showDependencies = true,
  showCriticalPath = true,
  onTaskDrag,
  onTaskSelect,
  onTaskExpand,
  selectedTaskId,
  className = ''
}) => {
  // ローカル日付で正確な日数計算
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const totalDays = Math.round((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1;
  const dayWidth = calculateDayWidth(viewType, width, startDate, endDate);
  const totalWidth = Math.max(width, totalDays * dayWidth);
  const totalHeight = tasks.length * DEFAULT_GANTT_CONFIG.rowHeight;

  // 週末の日付を取得
  const weekendDays = getWeekendDays(startDate, endDate);

  // 今日のライン位置
  const todayPosition = getTodayPosition(startDate, endDate, viewType, width);
  
  // デバッグログ
  console.log(`Today Position: ${todayPosition}`);

  // タスクリサイズ処理
  const handleTaskResize = (taskId: number, direction: 'left' | 'right', deltaX: number) => {
    // リサイズロジック（簡易版）
    console.log(`Resizing task ${taskId} ${direction} by ${deltaX}px`);
    // 実際の実装では日付の計算を行う
  };

  return (
    <div 
      className={`gantt-body relative ${className}`}
      style={{
        width: totalWidth,
        height: totalHeight,
        minHeight: '400px',
      }}
    >
      {/* 背景グリッド */}
      <div className="gantt-grid absolute inset-0">
        {/* 縦線（日付グリッド） */}
        {Array.from({ length: totalDays + 1 }, (_, i) => (
          <div
            key={`vline-${i}`}
            className="grid-line-vertical absolute top-0 bottom-0 w-px"
            style={{
              left: i * dayWidth,
              backgroundColor: DEFAULT_GANTT_CONFIG.gridLineColor,
            }}
          />
        ))}

        {/* 横線（タスクグリッド） */}
        {Array.from({ length: tasks.length + 1 }, (_, i) => (
          <div
            key={`hline-${i}`}
            className="grid-line-horizontal absolute left-0 right-0 h-px"
            style={{
              top: i * DEFAULT_GANTT_CONFIG.rowHeight,
              backgroundColor: DEFAULT_GANTT_CONFIG.gridLineColor,
            }}
          />
        ))}

        {/* 週末背景 */}
        {weekendDays.map((weekend, index) => {
          const weekendTime = new Date(weekend.getFullYear(), weekend.getMonth(), weekend.getDate()).getTime();
          const daysSinceStart = Math.round((weekendTime - startDateTime) / (1000 * 60 * 60 * 24));
          return (
            <div
              key={`weekend-${index}`}
              className="weekend-bg absolute top-0 bottom-0 opacity-50"
              style={{
                left: daysSinceStart * dayWidth,
                width: dayWidth,
                backgroundColor: DEFAULT_GANTT_CONFIG.weekendColor,
              }}
            />
          );
        })}

        {/* 今日のライン */}
        {todayPosition >= 0 && (
          <div
            className="today-line absolute top-0 bottom-0 w-0.5 z-10"
            style={{
              left: todayPosition,
              backgroundColor: DEFAULT_GANTT_CONFIG.todayLineColor,
            }}
          />
        )}
      </div>

      {/* タスクバー */}
      <div className="task-bars absolute inset-0">
        {tasks.map((task) => {
          const isCritical = showCriticalPath && criticalTasks.includes(task.id);
          return (
            <TaskBar
              key={task.id}
              task={{
                ...task,
                color: isCritical ? DEFAULT_GANTT_CONFIG.colors.critical : task.color
              }}
              isSelected={selectedTaskId === task.id}
              onSelect={onTaskSelect}
              onDrag={onTaskDrag}
              onResize={handleTaskResize}
              className={isCritical ? 'critical-task' : ''}
            />
          );
        })}
      </div>

      {/* 依存関係の矢印 */}
      {showDependencies && dependencies.length > 0 && (
        <div className="dependency-arrows absolute inset-0">
          {dependencies.map((dependency) => {
            const fromTask = tasks.find(t => t.id === dependency.fromTask);
            const toTask = tasks.find(t => t.id === dependency.toTask);
            
            if (!fromTask || !toTask) return null;
            
            return (
              <DependencyArrow
                key={dependency.id}
                dependency={dependency}
                fromTask={fromTask}
                toTask={toTask}
                containerWidth={totalWidth}
                containerHeight={totalHeight}
              />
            );
          })}
        </div>
      )}

    </div>
  );
};

