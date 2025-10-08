'use client';

import React from 'react';
import { GanttTask } from '@/types/gantt';

export interface LightningLinePoint {
  taskId: number;
  x: number;
  y: number;
  isDelayed: boolean;
  isOnTime: boolean;
  progress: number;
  actualProgress: number;
}

interface LightningLineProps {
  tasks: GanttTask[];
  baselineDate: Date;
  projectStartDate: Date;
  projectEndDate: Date;
  viewType: 'day' | 'week' | 'month';
  width: number;
  height: number;
  rowHeight: number;
  showLightningLine: boolean;
  className?: string;
}

export const LightningLine: React.FC<LightningLineProps> = ({
  tasks,
  baselineDate,
  projectStartDate,
  projectEndDate,
  viewType,
  width,
  height,
  rowHeight,
  showLightningLine,
  className = ''
}) => {
  if (!showLightningLine || tasks.length === 0) return null;

  // 日付から座標計算のヘルパー関数
  const getXPosition = (date: Date): number => {
    const totalDays = (projectEndDate.getTime() - projectStartDate.getTime()) / (24 * 60 * 60 * 1000);
    const daysPassed = (date.getTime() - projectStartDate.getTime()) / (24 * 60 * 60 * 1000);
    return (daysPassed / totalDays) * width;
  };

  // 基準日の X 座標
  const baselineX = getXPosition(baselineDate);

  // イナズマ線のポイントを計算
  const lightningPoints: LightningLinePoint[] = tasks
    .filter(task => task.progress !== undefined && task.progress >= 0)
    .map((task, index) => {
      const taskY = (index + 0.5) * rowHeight;
      
      // 予定進捗率を計算（基準日時点での予定進捗）
      const taskStartTime = task.startDate.getTime();
      const taskEndTime = task.endDate.getTime();
      const baselineTime = baselineDate.getTime();
      
      let expectedProgress = 0;
      if (baselineTime >= taskEndTime) {
        expectedProgress = 100;
      } else if (baselineTime > taskStartTime) {
        expectedProgress = ((baselineTime - taskStartTime) / (taskEndTime - taskStartTime)) * 100;
      }
      
      const actualProgress = task.progress || 0;
      const isDelayed = actualProgress < expectedProgress;
      const isOnTime = actualProgress >= expectedProgress;
      
      return {
        taskId: task.id,
        x: baselineX,
        y: taskY,
        isDelayed,
        isOnTime,
        progress: expectedProgress,
        actualProgress
      };
    });

  // 遅延タスクと順調なタスクに分別
  const delayedPoints = lightningPoints.filter(p => p.isDelayed);
  const onTimePoints = lightningPoints.filter(p => p.isOnTime);

  // SVGパス生成
  const generatePath = (points: LightningLinePoint[]): string => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // 予定線のパス生成（基準日から右端まで）
  const plannedPath = `M ${baselineX} 0 L ${baselineX} ${height}`;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg width={width} height={height} className="absolute inset-0">
        <defs>
          {/* 遅延線用のマーカー */}
          <marker
            id="delay-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#EF4444" />
          </marker>
          
          {/* 順調線用のマーカー */}
          <marker
            id="ontime-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
          </marker>
        </defs>
        
        {/* 基準日の縦線（破線） */}
        <line
          x1={baselineX}
          y1={0}
          x2={baselineX}
          y2={height}
          stroke="#6B7280"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.7"
        />
        
        {/* 基準日ラベル */}
        <text
          x={baselineX + 5}
          y={15}
          fontSize="12"
          fill="#6B7280"
          className="font-medium"
        >
          基準日: {baselineDate.toLocaleDateString('ja-JP')}
        </text>
        
        {/* 遅延タスクのイナズマ線（赤色実線） */}
        {delayedPoints.length > 0 && (
          <g>
            {delayedPoints.map((point, index) => (
              <g key={`delayed-${point.taskId}`}>
                {/* 遅延ポイント */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#EF4444"
                  stroke="#FFF"
                  strokeWidth="2"
                />
                
                {/* 遅延線（基準日から遅延ポイントまで） */}
                {index > 0 && (
                  <line
                    x1={delayedPoints[index - 1].x}
                    y1={delayedPoints[index - 1].y}
                    x2={point.x}
                    y2={point.y}
                    stroke="#EF4444"
                    strokeWidth="3"
                    markerEnd="url(#delay-arrow)"
                  />
                )}
                
                {/* 進捗表示 */}
                <text
                  x={point.x + 10}
                  y={point.y + 3}
                  fontSize="10"
                  fill="#EF4444"
                  className="font-medium"
                >
                  {point.actualProgress.toFixed(0)}% (予定: {point.progress.toFixed(0)}%)
                </text>
              </g>
            ))}
          </g>
        )}
        
        {/* 順調タスクのイナズマ線（緑色実線） */}
        {onTimePoints.length > 0 && (
          <g>
            {onTimePoints.map((point, index) => (
              <g key={`ontime-${point.taskId}`}>
                {/* 順調ポイント */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#10B981"
                  stroke="#FFF"
                  strokeWidth="2"
                />
                
                {/* 順調線（基準日から順調ポイントまで） */}
                {index > 0 && (
                  <line
                    x1={onTimePoints[index - 1].x}
                    y1={onTimePoints[index - 1].y}
                    x2={point.x}
                    y2={point.y}
                    stroke="#10B981"
                    strokeWidth="3"
                    markerEnd="url(#ontime-arrow)"
                  />
                )}
                
                {/* 進捗表示 */}
                <text
                  x={point.x + 10}
                  y={point.y + 3}
                  fontSize="10"
                  fill="#10B981"
                  className="font-medium"
                >
                  {point.actualProgress.toFixed(0)}% (予定: {point.progress.toFixed(0)}%)
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
      
      {/* 凡例 */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">イナズマ線</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>遅延タスク</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>順調なタスク</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-gray-500" style={{ strokeDasharray: '2,2' }}></div>
            <span>基準日</span>
          </div>
        </div>
      </div>
    </div>
  );
};