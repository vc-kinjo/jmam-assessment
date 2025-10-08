import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export type GanttViewType = 'day' | 'week' | 'month';

interface GanttControlsProps {
  viewType: GanttViewType;
  showDependencies: boolean;
  showCriticalPath: boolean;
  showLightningLine: boolean;
  baselineDate: Date;
  onViewTypeChange: (viewType: GanttViewType) => void;
  onToggleDependencies: () => void;
  onToggleCriticalPath: () => void;
  onToggleLightningLine: () => void;
  onBaselineDateChange: (date: Date) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAddTask: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  className?: string;
}

export const GanttControls: React.FC<GanttControlsProps> = ({
  viewType,
  showDependencies,
  showCriticalPath,
  showLightningLine,
  baselineDate,
  onViewTypeChange,
  onToggleDependencies,
  onToggleCriticalPath,
  onToggleLightningLine,
  onBaselineDateChange,
  onZoomIn,
  onZoomOut,
  onAddTask,
  onExport,
  onPrint,
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const viewOptions = [
    { value: 'day' as GanttViewType, label: '日表示', icon: '📅' },
    { value: 'week' as GanttViewType, label: '週表示', icon: '📊' },
    { value: 'month' as GanttViewType, label: '月表示', icon: '📈' }
  ];

  return (
    <div className={`gantt-controls flex items-center justify-between p-4 bg-white border-b border-gray-200 ${className}`}>
      {/* 左側のコントロール */}
      <div className="left-controls flex items-center space-x-4">
        {/* ビュー切り替え */}
        <div className="view-selector relative">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{viewOptions.find(opt => opt.value === viewType)?.icon}</span>
            <span className="text-sm font-medium">
              {viewOptions.find(opt => opt.value === viewType)?.label}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                    viewType === option.value ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                  onClick={() => {
                    onViewTypeChange(option.value);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* イナズマ線設定 */}
        {showLightningLine && (
          <div className="lightning-settings flex items-center space-x-2">
            <label className="text-sm text-gray-600">基準日:</label>
            <input
              type="date"
              value={baselineDate.toISOString().split('T')[0]}
              onChange={(e) => onBaselineDateChange(new Date(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        )}

        {/* タスク追加ボタン */}
        <button
          className="add-task-btn flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          onClick={onAddTask}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm font-medium">タスク追加</span>
        </button>

        {/* ガントチャートボタン */}
        <Link
          to="/gantt"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium">ガントチャート</span>
        </Link>
      </div>

      {/* 右側のコントロール */}
      <div className="right-controls flex items-center space-x-3">
        {/* 凡例 */}
        <div className="legend flex items-center space-x-4 text-xs">
          <div className="legend-item flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>未開始</span>
          </div>
          <div className="legend-item flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>進行中</span>
          </div>
          <div className="legend-item flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>完了</span>
          </div>
        </div>
      </div>
    </div>
  );
};