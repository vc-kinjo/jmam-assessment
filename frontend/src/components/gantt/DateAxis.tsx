'use client';

import React from 'react';
import { GanttViewType } from '@/types/gantt';
import { calculateDayWidth } from '@/utils/ganttUtils';

interface DateAxisProps {
  startDate: Date;
  endDate: Date;
  viewType: GanttViewType;
  width: number;
  scrollX: number;
  className?: string;
}

export const DateAxis: React.FC<DateAxisProps> = ({
  startDate,
  endDate,
  viewType,
  width,
  scrollX,
  className = ''
}) => {
  // ローカル日付で正確な日数を計算
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const totalDays = Math.round((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1;
  const dayWidth = calculateDayWidth(viewType, width, startDate, endDate);
  const totalWidth = Math.max(width, totalDays * dayWidth);

  // 日付軸のティック（目盛り）を生成
  const ticks = generateDateTicks(startDate, endDate, viewType, dayWidth);

  return (
    <div 
      className={`date-axis relative h-6 bg-gray-50 border-t border-gray-300 ${className}`}
    >
      <div
        className="axis-content relative h-full"
        style={{
          width: totalWidth,
          transform: `translateX(-${scrollX}px)`,
        }}
      >
        {/* 目盛り線とラベル */}
        {ticks.map((tick, index) => (
          <div
            key={index}
            className="tick absolute top-0 bottom-0 flex flex-col items-center justify-center"
            style={{ left: tick.position }}
          >
            {/* 目盛り線 */}
            <div className="tick-line w-px h-2 bg-gray-400" />
            
            {/* ラベル */}
            <span className="tick-label text-xs text-gray-600 mt-0.5">
              {tick.label}
            </span>
          </div>
        ))}

        {/* グリッド線（縦線） */}
        {Array.from({ length: totalDays + 1 }, (_, i) => (
          <div
            key={`grid-${i}`}
            className="grid-line absolute top-0 bottom-0 w-px bg-gray-200 opacity-50"
            style={{ left: i * dayWidth }}
          />
        ))}
      </div>
    </div>
  );
};

// 日付軸の目盛りを生成（簡素化したバージョン）
function generateDateTicks(
  startDate: Date, 
  endDate: Date, 
  viewType: GanttViewType, 
  dayWidth: number
) {
  const ticks: { position: number; label: string; date: Date }[] = [];
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const totalDays = Math.round((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1;

  // ビュータイプに応じて目盛り間隔を決定
  let tickInterval: number;
  let labelFormat: (date: Date) => string;

  switch (viewType) {
    case 'day':
      tickInterval = 1; // 毎日
      labelFormat = (date) => `${date.getDate()}日`;
      break;
    case 'week':
      tickInterval = 7; // 週毎
      labelFormat = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
      break;
    case 'month':
    default:
      tickInterval = Math.max(1, Math.floor(totalDays / 10)); // 適度な間隔で
      labelFormat = (date) => `${date.getDate()}`;
      break;
  }

  // 目盛りを生成
  for (let i = 0; i < totalDays; i += tickInterval) {
    const tickDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    tickDate.setDate(tickDate.getDate() + i);
    
    ticks.push({
      position: i * dayWidth,
      label: labelFormat(tickDate),
      date: new Date(tickDate)
    });
  }

  return ticks;
}

// ユーティリティ関数