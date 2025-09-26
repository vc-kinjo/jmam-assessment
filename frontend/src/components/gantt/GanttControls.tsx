'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GanttViewType } from '@/types/gantt';

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

        {/* ズームコントロール */}
        {/* <div className="zoom-controls flex items-center space-x-1">
          <button
            className="zoom-out-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            onClick={onZoomOut}
            title="ズームアウト"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            className="zoom-in-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            onClick={onZoomIn}
            title="ズームイン"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div> */}

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
          href="/gantt"
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
          {/* <div className="legend-item flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded transform rotate-45"></div>
            <span>マイルストーン</span>
          </div> */}
        </div>

        {/* アクションボタン */}
        {/* <div className="action-buttons flex items-center space-x-2">
          {onExport && (
            <button
              className="export-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              onClick={onExport}
              title="エクスポート"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}

          {onPrint && (
            <button
              className="print-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              onClick={onPrint}
              title="印刷"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          )}

          <button
            className="filter-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            title="フィルター"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          <button
            className="settings-btn p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            title="設定"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div> */}
      </div>
    </div>
  );
};