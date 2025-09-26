'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Task, TaskDependency } from '@/types/task';
import { GanttHeader } from './GanttHeader';
import { GanttBody } from './GanttBody';
import { TaskBar } from './TaskBar';
import { DateAxis } from './DateAxis';
import { CriticalPathHighlight } from './CriticalPathHighlight';
import { LightningLine } from './LightningLine';
import { calculateGanttData, generateDependencies, calculateCriticalPath, calculateDayWidth } from '@/utils/ganttUtils';
import type { GanttTask, GanttViewType, GanttDependency } from '@/types/gantt';

interface GanttChartProps {
  tasks: Task[];
  dependencies?: TaskDependency[];
  projectStartDate: Date;
  projectEndDate: Date;
  viewType?: GanttViewType;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showLightningLine?: boolean;
  baselineDate?: Date;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task | null) => void;
  selectedTaskId?: number;
  className?: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dependencies = [],
  projectStartDate,
  projectEndDate,
  viewType = 'month',
  showDependencies = true,
  showCriticalPath = true,
  showLightningLine = false,
  baselineDate = new Date(),
  onTaskUpdate,
  onTaskSelect,
  selectedTaskId,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [ganttDependencies, setGanttDependencies] = useState<GanttDependency[]>([]);
  const [criticalTasks, setCriticalTasks] = useState<number[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 600 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  // 初期状態では全ての親タスクを展開
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(() => {
    const initialExpanded = new Set<number>();
    tasks.forEach(task => {
      if (task.level === 0) {
        initialExpanded.add(task.id);
      }
    });
    return initialExpanded;
  });

  // tasksが変更されたときに展開状態を初期化
  useEffect(() => {
    const initialExpanded = new Set<number>();
    tasks.forEach(task => {
      if (task.level === 0) {
        initialExpanded.add(task.id);
      }
    });
    setExpandedTasks(initialExpanded);
  }, [tasks]);

  // ガントデータを計算
  useEffect(() => {
    const calculatedTasks = calculateGanttData(tasks, projectStartDate, projectEndDate, viewType, containerSize.width, expandedTasks);
    setGanttTasks(calculatedTasks);

    // 依存関係を生成
    console.log('Processing dependencies in GanttChart:', dependencies); // デバッグログ
    const calculatedDependencies = generateDependencies(calculatedTasks, dependencies);
    console.log('Generated gantt dependencies:', calculatedDependencies); // デバッグログ
    setGanttDependencies(calculatedDependencies);

    // クリティカルパスを計算
    if (showCriticalPath && calculatedDependencies.length > 0) {
      const critical = calculateCriticalPath(calculatedTasks, calculatedDependencies);
      setCriticalTasks(critical);
    } else {
      setCriticalTasks([]);
    }
  }, [tasks, dependencies, projectStartDate, projectEndDate, viewType, showCriticalPath, containerSize.width, expandedTasks]);

  // コンテナサイズを監視
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // スクロール処理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollPosition({
      x: target.scrollLeft,
      y: target.scrollTop
    });
  }, []);

  // タスクドラッグ処理
  const handleTaskDrag = useCallback((taskId: number, deltaX: number, deltaY: number) => {
    if (!onTaskUpdate) return;

    const task = ganttTasks.find(t => t.id === taskId);
    if (!task) return;

    // X軸の移動を日付変更に変換
    const dayWidth = calculateDayWidth(viewType, containerSize.width, projectStartDate, projectEndDate);
    const daysDelta = Math.round(deltaX / dayWidth);
    
    if (daysDelta !== 0) {
      const newStartDate = new Date(task.startDate);
      const newEndDate = new Date(task.endDate);
      
      newStartDate.setDate(newStartDate.getDate() + daysDelta);
      newEndDate.setDate(newEndDate.getDate() + daysDelta);

      onTaskUpdate(taskId, {
        planned_start_date: newStartDate.toISOString().split('T')[0],
        planned_end_date: newEndDate.toISOString().split('T')[0]
      });
    }
  }, [ganttTasks, onTaskUpdate, viewType, containerSize, projectStartDate, projectEndDate]);

  // タスク選択処理
  const handleTaskSelect = useCallback((task: GanttTask) => {
    const originalTask = tasks.find(t => t.id === task.id);
    onTaskSelect?.(originalTask || null);
  }, [tasks, onTaskSelect]);

  // タスク展開/折りたたみ処理
  const handleTaskExpand = useCallback((taskId: number, expanded: boolean) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`gantt-chart relative w-full h-full border border-gray-300 ${className}`}
    >
      {/* 凡例エリア */}
      {(showCriticalPath && criticalTasks.length > 0) || showLightningLine ? (
        <div className="gantt-legends bg-gray-50 border-b border-gray-300 p-2 flex items-center space-x-6">
          {/* クリティカルパス凡例 */}
          {showCriticalPath && criticalTasks.length > 0 && (
            <div className="critical-path-legend flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-2 bg-red-500 rounded-sm opacity-80" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'}}></div>
                <svg width="12" height="8">
                  <path d="M 0 4 L 8 4 M 6 2 L 8 4 L 6 6" stroke="#ef4444" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">クリティカルパス</span>
              <span className="text-xs text-gray-500">（最重要経路、遅延厳禁タスク）</span>
            </div>
          )}
          
          {/* イナズマ線凡例 */}
          {showLightningLine && (
            <div className="lightning-line-legend flex items-center space-x-2">
              <svg width="16" height="8">
                <path d="M 0 4 L 4 2 L 8 6 L 12 4 L 16 2" stroke="#fbbf24" strokeWidth="2" fill="none" strokeDasharray="2,2" />
              </svg>
              <span className="text-xs font-medium text-gray-700">イナズマ線</span>
              <span className="text-xs text-gray-500">（基準日からの進捗状況）</span>
            </div>
          )}
        </div>
      ) : null}

      {/* ヘッダー */}
      <div className="gantt-header-row flex">
        {/* タスク名ヘッダー（固定） - 正確なサイズ */}
        <div className="task-names-header flex-shrink-0 bg-gray-100 border-b border-gray-300 px-4 py-2 text-sm font-medium text-gray-700" style={{width: '240px'}}>
          タスク名
        </div>
        {/* 日付ヘッダー（スクロール） */}
        <div className="flex-1 overflow-hidden">
          <GanttHeader
            startDate={projectStartDate}
            endDate={projectEndDate}
            viewType={viewType}
            width={containerSize.width - 240}
            scrollX={scrollPosition.x}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="gantt-main flex" style={{ height: 'calc(100% - 120px)' }}>
        {/* タスク一覧（固定） */}
        <div className="task-sidebar flex-shrink-0 bg-gray-50 border-r border-gray-300 overflow-y-auto" style={{width: '240px'}}>
          {ganttTasks.map((task, index) => (
            <div
              key={`sidebar-${task.id}`}
              className={`task-row flex items-center px-3 py-2 text-sm border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${
                selectedTaskId === task.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              style={{
                height: 40,
                paddingLeft: 12 + (task.level * 20), // インデント
              }}
              onClick={() => handleTaskSelect(task)}
            >
              {/* 展開/折りたたみボタン */}
              {task.children && task.children.length > 0 && (
                <button 
                  className="expand-button mr-2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskExpand(task.id, !task.isExpanded);
                  }}
                  title={task.isExpanded ? '折りたたむ' : '展開する'}
                >
                  <span className="text-xs font-bold">
                    {task.isExpanded ? '−' : '+'}
                  </span>
                </button>
              )}

              {/* タスク名 */}
              <span className="task-name truncate flex-1" title={task.name}>
                {task.name}
              </span>

              {/* ステータス */}
              <div className="task-status ml-2">
                <span 
                  className={`inline-block w-2 h-2 rounded-full ${getStatusColor(task.status)}`}
                  title={getStatusLabel(task.status)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ガントチャート部分（スクロール可能） */}
        <div 
          className="gantt-content flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          <GanttBody
            tasks={ganttTasks}
            dependencies={ganttDependencies}
            criticalTasks={criticalTasks}
            startDate={projectStartDate}
            endDate={projectEndDate}
            viewType={viewType}
            width={containerSize.width - 240}
            showDependencies={showDependencies}
            showCriticalPath={showCriticalPath}
            onTaskDrag={handleTaskDrag}
            onTaskSelect={handleTaskSelect}
            onTaskExpand={handleTaskExpand}
            selectedTaskId={selectedTaskId}
          />

          {/* クリティカルパスハイライト */}
          {showCriticalPath && criticalTasks.length > 0 && (
            <CriticalPathHighlight
              tasks={ganttTasks}
              dependencies={ganttDependencies}
              criticalTasks={criticalTasks}
              containerWidth={containerSize.width - 240}
              containerHeight={ganttTasks.length * 40}
              taskSidebarWidth={0} // ガントチャート内では0に設定
            />
          )}

          {/* イナズマ線 */}
          {showLightningLine && (
            <LightningLine
              tasks={ganttTasks}
              baselineDate={baselineDate}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
              viewType={viewType}
              width={containerSize.width - 240}
              height={ganttTasks.length * 40}
              rowHeight={40}
              showLightningLine={showLightningLine}
            />
          )}
        </div>
      </div>

      {/* 日付軸（固定部分は空白、スクロール部分に日付軸） */}
      <div className="gantt-footer-row flex">
        <div className="flex-shrink-0" style={{width: '240px'}}></div> {/* 空白（タスク名エリア分） */}
        <div className="flex-1 overflow-hidden">
          <DateAxis
            startDate={projectStartDate}
            endDate={projectEndDate}
            viewType={viewType}
            width={containerSize.width - 240}
            scrollX={scrollPosition.x}
          />
        </div>
      </div>
    </div>
  );
};

// ユーティリティ関数
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'not_started':
      return 'bg-gray-400';
    case 'on_hold':
      return 'bg-yellow-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return '完了';
    case 'in_progress':
      return '進行中';
    case 'not_started':
      return '未開始';
    case 'on_hold':
      return '保留';
    case 'cancelled':
      return 'キャンセル';
    default:
      return '不明';
  }
}

