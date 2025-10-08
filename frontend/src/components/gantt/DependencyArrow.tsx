'use client';

import React from 'react';
import { GanttDependency, GanttTask } from '@/types/gantt';

interface DependencyArrowProps {
  dependency: GanttDependency;
  fromTask: GanttTask;
  toTask: GanttTask;
  containerWidth: number;
  containerHeight: number;
  className?: string;
}

export const DependencyArrow: React.FC<DependencyArrowProps> = ({
  dependency,
  fromTask,
  toTask,
  containerWidth,
  containerHeight,
  className = ''
}) => {
  // 依存関係のタイプに基づいて接続点を計算
  const calculateConnectionPoints = () => {
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

    let startPoint: { x: number; y: number };
    let endPoint: { x: number; y: number };

    switch (dependency.type) {
      case 'fs': // Finish to Start (完了-開始) - 確実に左から右向き
        startPoint = {
          x: fromRect.x + fromRect.width, // 前タスクの右端から
          y: fromRect.y + fromRect.height / 2
        };
        endPoint = {
          x: toRect.x, // 次タスクの左端へ
          y: toRect.y + toRect.height / 2
        };
        // 座標の確認: endPoint.x > startPoint.x になることを保証
        if (endPoint.x <= startPoint.x) {
          // 位置が逆の場合は強制的に調整
          endPoint.x = startPoint.x + Math.max(50, toRect.width); // 最低50px、またはタスク幅分右に
        }
        break;

      case 'ss': // Start to Start (開始-開始)
        startPoint = {
          x: fromRect.x,
          y: fromRect.y + fromRect.height / 2
        };
        endPoint = {
          x: toRect.x,
          y: toRect.y + toRect.height / 2
        };
        // 左から右向きを保証
        if (endPoint.x <= startPoint.x) {
          endPoint.x = startPoint.x + Math.max(50, toRect.width);
        }
        break;

      case 'ff': // Finish to Finish (完了-完了)
        startPoint = {
          x: fromRect.x + fromRect.width,
          y: fromRect.y + fromRect.height / 2
        };
        endPoint = {
          x: toRect.x + toRect.width,
          y: toRect.y + toRect.height / 2
        };
        // 左から右向きを保証
        if (endPoint.x <= startPoint.x) {
          endPoint.x = startPoint.x + Math.max(50, toRect.width);
        }
        break;

      case 'sf': // Start to Finish (開始-完了)
        startPoint = {
          x: fromRect.x,
          y: fromRect.y + fromRect.height / 2
        };
        endPoint = {
          x: toRect.x + toRect.width,
          y: toRect.y + toRect.height / 2
        };
        // 左から右向きを保証
        if (endPoint.x <= startPoint.x) {
          endPoint.x = startPoint.x + Math.max(50, toRect.width);
        }
        break;

      default:
        startPoint = { x: 0, y: 0 };
        endPoint = { x: 0, y: 0 };
    }

    return { startPoint, endPoint };
  };

  const { startPoint, endPoint } = calculateConnectionPoints();

  // パスの生成（左から右向きを保証）
  const generatePath = () => {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    
    // 常に左から右向きになるよう調整
    if (Math.abs(deltaY) < 10 && deltaX > 0) {
      // 水平で左から右の場合は直線
      return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
    } else {
      // 階段状のパス（左から右向きを保証）
      const midX = startPoint.x + Math.max(30, Math.abs(deltaX) / 2);
      
      return `M ${startPoint.x} ${startPoint.y} 
              L ${midX} ${startPoint.y} 
              L ${midX} ${endPoint.y} 
              L ${endPoint.x} ${endPoint.y}`;
    }
  };

  // 矢印のマーカーを生成（→ 確実に左から右向きの矢印）
  const arrowMarker = (
    <defs>
      <marker
        id={`arrowhead-${dependency.id}`}
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        fill={getDependencyColor(dependency.type)}
      >
        <polygon points="0,0 10,3.5 0,7" />
      </marker>
    </defs>
  );

  // 遅延（ラグ）がある場合の表示
  const lagLabel = dependency.lagDays !== 0 && (
    <text
      x={(startPoint.x + endPoint.x) / 2}
      y={(startPoint.y + endPoint.y) / 2 - 5}
      className="dependency-lag-label text-xs fill-current text-gray-600"
      textAnchor="middle"
    >
      {dependency.lagDays > 0 ? `+${dependency.lagDays}日` : `${dependency.lagDays}日`}
    </text>
  );

  return (
    <svg
      className={`dependency-arrow absolute inset-0 pointer-events-none ${className}`}
      width={containerWidth}
      height={containerHeight}
      style={{ zIndex: 10 }}
    >
      {arrowMarker}
      
      {/* 依存関係の線 */}
      <path
        d={generatePath()}
        stroke={getDependencyColor(dependency.type)}
        strokeWidth="2"
        fill="none"
        markerEnd={`url(#arrowhead-${dependency.id})`}
        className="dependency-line"
      />

      {/* 遅延ラベル */}
      {lagLabel}

      {/* ホバー用の太い透明線 */}
      <path
        d={generatePath()}
        stroke="transparent"
        strokeWidth="8"
        fill="none"
        className="dependency-hover-area cursor-pointer pointer-events-auto"
        title={getDependencyTooltip(dependency, fromTask, toTask)}
      />
    </svg>
  );
};

// 依存関係タイプ別の色を取得
function getDependencyColor(type: string): string {
  switch (type) {
    case 'fs':
      return '#3b82f6'; // 青色 (最も一般的)
    case 'ss':
      return '#10b981'; // 緑色
    case 'ff':
      return '#f59e0b'; // オレンジ色
    case 'sf':
      return '#ef4444'; // 赤色 (稀)
    default:
      return '#6b7280'; // グレー
  }
}

// 依存関係のツールチップテキストを生成
function getDependencyTooltip(dependency: GanttDependency, fromTask: GanttTask, toTask: GanttTask): string {
  const typeLabels = {
    fs: '完了-開始',
    ss: '開始-開始', 
    ff: '完了-完了',
    sf: '開始-完了'
  };
  
  const typeLabel = typeLabels[dependency.type] || '不明';
  const lagText = dependency.lagDays !== 0 
    ? ` (${dependency.lagDays > 0 ? '+' : ''}${dependency.lagDays}日)`
    : '';
  
  return `${fromTask.name} → ${toTask.name}\n${typeLabel}${lagText}`;
}