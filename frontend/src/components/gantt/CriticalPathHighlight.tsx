'use client';

import React from 'react';
import { GanttTask, GanttDependency } from '@/types/gantt';

interface CriticalPathHighlightProps {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  criticalTasks: number[];
  containerWidth: number;
  containerHeight: number;
  taskSidebarWidth?: number;
  className?: string;
}

export const CriticalPathHighlight: React.FC<CriticalPathHighlightProps> = ({
  tasks,
  dependencies,
  criticalTasks,
  containerWidth,
  containerHeight,
  taskSidebarWidth = 240,
  className = ''
}) => {
  // クリティカルパスの依存関係のみを抽出
  const criticalDependencies = dependencies.filter(dep =>
    criticalTasks.includes(dep.fromTask) && criticalTasks.includes(dep.toTask)
  );

  // クリティカルパスのタスクマップを作成
  const criticalTaskMap = new Map<number, GanttTask>();
  tasks.forEach(task => {
    if (criticalTasks.includes(task.id)) {
      criticalTaskMap.set(task.id, task);
    }
  });

  return (
    <div className={`critical-path-highlight absolute inset-0 pointer-events-none ${className}`}>
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
        style={{ zIndex: 15 }}
      >
        {/* クリティカルパスの定義 */}
        <defs>
          {/* クリティカルパスのグラデーション */}
          <linearGradient id="criticalPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#dc2626" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.8" />
          </linearGradient>

          {/* クリティカルパスの矢印マーカー（→ 左から右向き） */}
          <marker
            id="criticalArrowhead"
            markerWidth="12"
            markerHeight="8"
            refX="11"
            refY="4"
            orient="auto"
            fill="#ef4444"
          >
            <polygon points="0,0 12,4 0,8" />
          </marker>

          {/* アニメーション効果用のフィルター */}
          <filter id="criticalGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>

        {/* クリティカルパスのタスクバーのオーバーレイ（TaskBarと正確に重ねる） */}
        {criticalTasks.map(taskId => {
          const task = criticalTaskMap.get(taskId);
          if (!task) return null;

          return (
            <g key={`critical-task-${taskId}`}>
              {/* タスクバーと完全に同じ位置・サイズの半透明オーバーレイ */}
              <rect
                x={task.x}
                y={task.y + 8}
                width={task.width}
                height={task.height}
                fill="#ef4444"
                opacity="0.5"
                rx="4"
                className="critical-overlay"
              />

              {/* クリティカルパスの点線ボーダー */}
              <rect
                x={task.x}
                y={task.y + 8}
                width={task.width}
                height={task.height}
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="4,2"
                rx="4"
                opacity="1.0"
                className="critical-border"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;6"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </rect>

              {/* CRITICALラベル */}
              <text
                x={task.x + task.width / 2}
                y={task.y + 8 + task.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#ffffff"
                fontWeight="bold"
                className="critical-label"
              >
                CRITICAL
              </text>
            </g>
          );
        })}

        {/* クリティカルパスの依存関係 */}
        {criticalDependencies.map(dependency => {
          const fromTask = criticalTaskMap.get(dependency.fromTask);
          const toTask = criticalTaskMap.get(dependency.toTask);
          
          if (!fromTask || !toTask) return null;

          const path = generateCriticalPath(fromTask, toTask, dependency.type);

          return (
            <g key={`critical-dep-${dependency.id}`}>
              {/* メインのクリティカルパス線 */}
              <path
                d={path}
                stroke="#ef4444"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#criticalArrowhead)"
                filter="url(#criticalGlow)"
              />

              {/* パルス効果 */}
              <path
                d={path}
                stroke="#ff6b6b"
                strokeWidth="1"
                fill="none"
                opacity="0.6"
              >
                <animate
                  attributeName="stroke-width"
                  values="1;4;1"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.6;0.2;0.6"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </path>
            </g>
          );
        })}

        {/* クリティカルパスのレジェンドは外側に移動するため削除 */}
      </svg>
    </div>
  );
};

// クリティカルパス用のパス生成（左から右向きを強制）
function generateCriticalPath(fromTask: GanttTask, toTask: GanttTask, depType: string): string {
  const fromRect = {
    x: fromTask.x,
    y: fromTask.y + 8,
    width: fromTask.width,
    height: fromTask.height
  };

  const toRect = {
    x: toTask.x,
    y: toTask.y + 8,
    width: toTask.width,
    height: toTask.height
  };

  let startX: number, startY: number, endX: number, endY: number;

  // 常に左から右への矢印になるよう調整
  switch (depType) {
    case 'fs': // Finish to Start - 最も一般的
      startX = fromRect.x + fromRect.width; // 前タスクの右端
      startY = fromRect.y + fromRect.height / 2; // 前タスクの中央
      endX = toRect.x; // 次タスクの左端
      endY = toRect.y + toRect.height / 2; // 次タスクの中央
      break;
    case 'ss': // Start to Start
      startX = fromRect.x; // 前タスクの左端
      startY = fromRect.y + fromRect.height / 2;
      endX = toTask.x; // 次タスクの左端（開始）
      endY = toRect.y + toRect.height / 2;
      break;
    case 'ff': // Finish to Finish
      startX = fromRect.x + fromRect.width; // 前タスクの右端
      startY = fromRect.y + fromRect.height / 2;
      endX = toRect.x + toRect.width; // 次タスクの右端
      endY = toRect.y + toRect.height / 2;
      break;
    case 'sf': // Start to Finish
      startX = fromRect.x; // 前タスクの左端
      startY = fromRect.y + fromRect.height / 2;
      endX = toRect.x + toRect.width; // 次タスクの右端
      endY = toRect.y + toRect.height / 2;
      break;
    default:
      // デフォルトはFS（Finish to Start）
      startX = fromRect.x + fromRect.width;
      startY = fromRect.y + fromRect.height / 2;
      endX = toRect.x;
      endY = toRect.y + toRect.height / 2;
  }

  // 矢印が確実に左から右向きになるようパス生成
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  if (Math.abs(deltaY) < 10 && deltaX > 0) {
    // 水平で左から右の場合は直線
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  } else {
    // 階段状のパス（確実に左から右向き）
    const midX = startX + Math.max(25, Math.abs(deltaX) / 2);
    return `M ${startX} ${startY} 
            L ${midX} ${startY} 
            L ${midX} ${endY} 
            L ${endX} ${endY}`;
  }
}