import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Task } from '../../types/index';
import { GanttViewType } from './GanttControls';

interface SimpleWamraGanttProps {
  tasks: Task[];
  projectId: number;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task | null) => void;
  selectedTaskId?: number;
  className?: string;
  viewType?: GanttViewType;
}

// 日付フォーマット関数
const formatDateToJapanese = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export const SimpleWamraGantt: React.FC<SimpleWamraGanttProps> = ({
  tasks,
  projectId,
  onTaskUpdate,
  onTaskSelect,
  selectedTaskId,
  className = '',
  viewType = 'month'
}) => {
  // カラム幅の状態管理
  const [columnWidths, setColumnWidths] = useState({
    taskName: 200,
    startDate: 100,
    endDate: 100,
    estimatedHours: 80,
    dependencies: 80
  });

  // 機能表示のチェックボックス状態管理
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showProgressLine, setShowProgressLine] = useState(false);

  // 展開・折り畳み状態の管理
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // 日付範囲を計算
  const dateRange = useMemo(() => {
    if (!tasks.length) {
      const today = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      return { start: today, end };
    }

    const dates = tasks.flatMap(task => [
      task.planned_start_date ? new Date(task.planned_start_date) : null,
      task.planned_end_date ? new Date(task.planned_end_date) : null
    ]).filter(date => date !== null) as Date[];

    if (dates.length === 0) {
      const today = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      return { start: today, end };
    }

    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));

    // 少し余白を追加
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [tasks]);

  // 時間軸のヘッダーを生成
  const generateTimelineHeaders = useCallback(() => {
    const headers: string[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      if (viewType === 'day') {
        headers.push(formatDateToJapanese(current));
        current.setDate(current.getDate() + 1);
      } else if (viewType === 'week') {
        const weekNum = getWeekNumber(current);
        headers.push(`W${weekNum}`);
        current.setDate(current.getDate() + 7);
      } else { // month
        headers.push(`${current.getFullYear()}/${current.getMonth() + 1}`);
        current.setMonth(current.getMonth() + 1);
      }
    }

    return headers;
  }, [dateRange, viewType]);

  // 週番号を取得
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // タスクの位置とサイズを計算
  const calculateTaskBar = useCallback((task: Task) => {
    if (!task.planned_start_date || !task.planned_end_date) {
      return { left: 0, width: 0, visible: false };
    }

    const taskStart = new Date(task.planned_start_date);
    const taskEnd = new Date(task.planned_end_date);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (taskStart.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24);

    return {
      left: (startOffset / totalDays) * 100,
      width: (duration / totalDays) * 100,
      visible: true
    };
  }, [dateRange]);

  // カラム幅の調整ハンドラー
  const handleColumnResize = useCallback((column: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(50, width)
    }));
  }, []);

  // 展開・折り畳みハンドラー
  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(taskId)) {
        newExpanded.delete(taskId);
      } else {
        newExpanded.add(taskId);
      }
      return newExpanded;
    });
  }, []);

  const timelineHeaders = generateTimelineHeaders();
  const columnWidth = viewType === 'day' ? 65 : viewType === 'week' ? 90 : 120;
  const totalTimelineWidth = timelineHeaders.length * columnWidth;

  return (
    <div className={`simple-wamra-gantt ${className}`}>
      <style>{`
        .gantt-container {
          display: flex;
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
        }

        .gantt-task-list {
          border-right: 1px solid #e5e7eb;
          background: #f9fafb;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .gantt-timeline {
          flex: 1;
          overflow: auto;
        }

        .gantt-header {
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: #374151;
        }

        .gantt-row {
          border-bottom: 1px solid #e5e7eb;
          min-height: 50px;
          display: flex;
          align-items: center;
        }

        .gantt-row:nth-child(even) {
          background: #f9fafb;
        }

        .gantt-row:hover {
          background: #f3f4f6;
        }

        .task-bar {
          height: 24px;
          border-radius: 4px;
          position: relative;
          display: flex;
          align-items: center;
          font-size: 12px;
          color: white;
          padding: 0 8px;
          margin: 13px 0;
        }

        .task-bar.not-started {
          background: #9ca3af;
        }

        .task-bar.in-progress {
          background: #3b82f6;
        }

        .task-bar.completed {
          background: #10b981;
        }

        .task-bar.on-hold {
          background: #f59e0b;
        }

        .task-bar.milestone {
          width: 16px !important;
          height: 16px !important;
          background: #fbbf24;
          transform: rotate(45deg);
          border-radius: 0;
          margin: 17px 0;
        }

        .task-name-cell {
          padding: 12px 8px;
          display: flex;
          align-items: center;
          font-size: 14px;
        }

        .task-indent {
          margin-left: 20px;
        }

        .expand-button {
          margin-right: 8px;
          width: 16px;
          height: 16px;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
        }

        .resize-handle:hover {
          background: #3b82f6;
        }
      `}</style>

      <div className="gantt-container" style={{ height: '600px' }}>
        {/* タスクリスト */}
        <div
          className="gantt-task-list"
          style={{
            width: columnWidths.taskName + columnWidths.startDate + columnWidths.endDate + columnWidths.dependencies
          }}
        >
          {/* ヘッダー */}
          <div className="gantt-header" style={{ height: '50px', display: 'flex' }}>
            <div
              className="relative flex items-center px-3 border-r border-gray-300"
              style={{ width: columnWidths.taskName }}
            >
              タスク名
              <div
                className="resize-handle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = columnWidths.taskName;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth + (e.clientX - startX);
                    handleColumnResize('taskName', newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            </div>
            <div
              className="relative flex items-center px-3 border-r border-gray-300"
              style={{ width: columnWidths.startDate }}
            >
              開始日
              <div
                className="resize-handle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = columnWidths.startDate;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth + (e.clientX - startX);
                    handleColumnResize('startDate', newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            </div>
            <div
              className="relative flex items-center px-3 border-r border-gray-300"
              style={{ width: columnWidths.endDate }}
            >
              終了日
              <div
                className="resize-handle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = columnWidths.endDate;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = startWidth + (e.clientX - startX);
                    handleColumnResize('endDate', newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            </div>
            <div
              className="flex items-center px-3"
              style={{ width: columnWidths.dependencies }}
            >
              工数
            </div>
          </div>

          {/* タスク行 */}
          {tasks.map((task) => (
            <div key={task.id} className="gantt-row">
              <div
                className="task-name-cell border-r border-gray-300"
                style={{ width: columnWidths.taskName }}
              >
                <div
                  className={task.level ? `task-indent` : ''}
                  style={{ paddingLeft: `${(task.level || 0) * 20}px` }}
                >
                  {task.level && task.level > 0 && (
                    <span className="text-gray-400 mr-2">↳</span>
                  )}
                  <span className="truncate">{task.name}</span>
                </div>
              </div>
              <div
                className="flex items-center px-3 text-sm text-gray-600 border-r border-gray-300"
                style={{ width: columnWidths.startDate }}
              >
                {task.planned_start_date || '-'}
              </div>
              <div
                className="flex items-center px-3 text-sm text-gray-600 border-r border-gray-300"
                style={{ width: columnWidths.endDate }}
              >
                {task.planned_end_date || '-'}
              </div>
              <div
                className="flex items-center px-3 text-sm text-gray-600"
                style={{ width: columnWidths.dependencies }}
              >
                {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
              </div>
            </div>
          ))}
        </div>

        {/* タイムライン */}
        <div className="gantt-timeline">
          {/* タイムラインヘッダー */}
          <div
            className="gantt-header flex"
            style={{
              height: '50px',
              width: totalTimelineWidth,
              minWidth: '100%'
            }}
          >
            {timelineHeaders.map((header, index) => (
              <div
                key={index}
                className="flex items-center justify-center border-r border-gray-300 text-xs"
                style={{ width: columnWidth, minWidth: columnWidth }}
              >
                {header}
              </div>
            ))}
          </div>

          {/* タスクバー */}
          <div style={{ width: totalTimelineWidth, minWidth: '100%' }}>
            {tasks.map((task) => {
              const barInfo = calculateTaskBar(task);
              if (!barInfo.visible) return null;

              return (
                <div key={task.id} className="gantt-row relative">
                  <div
                    className={`task-bar ${task.status} ${task.is_milestone ? 'milestone' : ''}`}
                    style={{
                      left: `${barInfo.left}%`,
                      width: task.is_milestone ? '16px' : `${barInfo.width}%`,
                      position: 'absolute'
                    }}
                    onClick={() => onTaskSelect?.(task)}
                    title={`${task.name} (${task.planned_start_date} - ${task.planned_end_date})`}
                  >
                    {!task.is_milestone && (
                      <span className="truncate text-xs">{task.name}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 機能コントロール */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-6 text-sm">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showDependencies}
              onChange={(e) => setShowDependencies(e.target.checked)}
              className="rounded"
            />
            <span>依存関係を表示</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="rounded"
            />
            <span>クリティカルパスを表示</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showProgressLine}
              onChange={(e) => setShowProgressLine(e.target.checked)}
              className="rounded"
            />
            <span>イナズマ線を表示</span>
          </label>
        </div>
      </div>
    </div>
  );
};