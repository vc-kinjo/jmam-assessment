'use client';

import React from 'react';
import { GanttViewType, DEFAULT_GANTT_CONFIG } from '@/types/gantt';
import { generateTimeLabels, calculateDayWidth } from '@/utils/ganttUtils';

interface GanttHeaderProps {
  startDate: Date;
  endDate: Date;
  viewType: GanttViewType;
  width: number;
  scrollX: number;
  className?: string;
}

export const GanttHeader: React.FC<GanttHeaderProps> = ({
  startDate,
  endDate,
  viewType,
  width,
  scrollX,
  className = ''
}) => {
  // ローカル日付での正確な日数計算
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const totalDays = Math.round((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1;
  const dayWidth = calculateDayWidth(viewType, width, startDate, endDate);
  const totalWidth = Math.max(width, totalDays * dayWidth);
  
  // 時間軸ラベルを生成
  const timeLabels = generateTimeLabels(startDate, endDate, viewType, width);

  return (
    <div 
      className={`gantt-header relative bg-gray-100 border-b border-gray-300 ${className}`}
      style={{ height: DEFAULT_GANTT_CONFIG.headerHeight }}
    >
      {/* 時間軸ヘッダー（サイドバー削除） */}
      <div 
        className="timeline-header relative bg-gray-100"
        style={{
          width: totalWidth,
          height: DEFAULT_GANTT_CONFIG.headerHeight,
          transform: `translateX(-${scrollX}px)`,
        }}
      >
        {/* メイン時間軸 */}
        <div className="main-timeline h-10 border-b border-gray-300 flex">
          {timeLabels.map((label, index) => (
            <div
              key={index}
              className="timeline-label flex items-center justify-center text-gray-700 border-r border-gray-300 overflow-hidden"
              style={{
                width: label.width,
                minWidth: label.width,
                fontSize: viewType === 'month' ? '10px' : viewType === 'week' ? '11px' : '12px',
                fontWeight: viewType === 'month' ? 'normal' : 'semibold',
                padding: '0 2px', // 左右のパディングを追加
              }}
            >
              <span className="block text-center truncate w-full">
                {label.label}
              </span>
            </div>
          ))}
        </div>

        {/* サブ時間軸（日単位） */}
        {viewType !== 'day' && (
          <div className="sub-timeline h-8 flex">
            {Array.from({ length: totalDays }, (_, i) => {
              const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
              currentDate.setDate(currentDate.getDate() + i);
              
              return (
                <div
                  key={i}
                  className="day-cell flex items-center justify-center text-xs text-gray-600 border-r border-gray-200"
                  style={{
                    width: dayWidth,
                    minWidth: dayWidth,
                    backgroundColor: isWeekend(currentDate) ? '#f9f9f9' : 'transparent',
                  }}
                >
                  <span className="block text-center truncate" style={{fontSize: '10px', padding: '0 1px'}}>
                    {currentDate.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 今日のマーカー */}
        {isToday(startDate, endDate) && (
          <div
            className="today-marker absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{
              left: getTodayOffset(startDate, dayWidth),
            }}
          />
        )}
      </div>

      {/* ビュー切り替えボタン */}
      <div className="view-controls absolute top-2 right-4 flex space-x-2">
        <ViewButton viewType="day" currentView={viewType} />
        <ViewButton viewType="week" currentView={viewType} />
        <ViewButton viewType="month" currentView={viewType} />
      </div>
    </div>
  );
};

// ビュー切り替えボタンコンポーネント
interface ViewButtonProps {
  viewType: GanttViewType;
  currentView: GanttViewType;
}

const ViewButton: React.FC<ViewButtonProps> = ({ viewType, currentView }) => {
  const isActive = viewType === currentView;
  const labels = {
    day: '日',
    week: '週',
    month: '月'
  };

  return (
    <button
      className={`px-3 py-1 text-xs rounded ${
        isActive
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {labels[viewType]}
    </button>
  );
};

// ユーティリティ関数
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isToday(startDate: Date, endDate: Date): boolean {
  const today = new Date();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  return todayTime >= startDateTime && todayTime <= endDateTime;
}

function getTodayOffset(startDate: Date, dayWidth: number): number {
  const today = new Date();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const daysSinceStart = Math.round((todayTime - startDateTime) / (1000 * 60 * 60 * 24));
  return daysSinceStart * dayWidth;
}