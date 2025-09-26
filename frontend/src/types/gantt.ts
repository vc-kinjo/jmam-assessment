// ガントチャート関連の型定義

import { Task } from './task';

export type GanttViewType = 'day' | 'week' | 'month';

export interface GanttTask extends Task {
  // ガントチャート表示用の追加プロパティ
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  x: number;          // X座標
  y: number;          // Y座標
  width: number;      // バーの幅
  height: number;     // バーの高さ
  level: number;      // 階層レベル（親子関係）
  children?: GanttTask[];
  isExpanded: boolean;
  color: string;      // バーの色
  textColor: string;  // テキストの色
}

export interface GanttTimespan {
  start: Date;
  end: Date;
  label: string;
  x: number;
  width: number;
}

export interface GanttConfig {
  rowHeight: number;
  headerHeight: number;
  taskBarHeight: number;
  taskBarMargin: number;
  minTaskWidth: number;
  maxTaskWidth: number;
  gridLineColor: string;
  weekendColor: string;
  todayLineColor: string;
  colors: {
    notStarted: string;
    inProgress: string;
    completed: string;
    milestone: string;
    critical: string;
  };
}

export interface GanttDependency {
  id: string;
  fromTask: number;
  toTask: number;
  type: 'fs' | 'ss' | 'ff' | 'sf'; // finish-start, start-start, finish-finish, start-finish
  lagDays: number;
  points: { x: number; y: number }[];
}

export interface GanttScale {
  unit: 'day' | 'week' | 'month';
  step: number;
  format: string;
  width: number;
}

export interface GanttPosition {
  x: number;
  y: number;
}

export interface GanttSize {
  width: number;
  height: number;
}

export interface GanttViewport {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface GanttDragState {
  isDragging: boolean;
  dragType: 'move' | 'resize-left' | 'resize-right' | null;
  startPosition: GanttPosition;
  currentPosition: GanttPosition;
  taskId: number | null;
}

export interface GanttSelection {
  selectedTasks: number[];
  selectedDependencies: string[];
}

export interface GanttZoom {
  level: number;
  scale: number;
  minLevel: number;
  maxLevel: number;
}

// デフォルト設定
export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  rowHeight: 40,
  headerHeight: 80,
  taskBarHeight: 24,
  taskBarMargin: 8,
  minTaskWidth: 20,
  maxTaskWidth: 500,
  gridLineColor: '#e5e5e5',
  weekendColor: '#f5f5f5',
  todayLineColor: '#ff4444',
  colors: {
    notStarted: '#94a3b8',
    inProgress: '#3b82f6',
    completed: '#10b981',
    milestone: '#f59e0b',
    critical: '#ef4444'
  }
};