// ガントチャートユーティリティ関数

import { Task } from '@/types/task';
import { GanttTask, GanttViewType, DEFAULT_GANTT_CONFIG } from '@/types/gantt';

/**
 * YYYY-MM-DD形式の日付文字列を確実にローカル日付として解析
 */
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // monthは0ベースなので-1
}

/**
 * タスクデータをガントチャート表示用に変換
 */
export function calculateGanttData(
  tasks: Task[],
  projectStartDate: Date,
  projectEndDate: Date,
  viewType: GanttViewType,
  containerWidth: number = 1200,
  expandedTasks: Set<number> = new Set()
): GanttTask[] {
  if (!tasks.length) return [];

  // タスクを階層構造に変換
  const taskMap = new Map<number, GanttTask>();
  const rootTasks: GanttTask[] = [];

  // 基本的なGanttTaskに変換
  tasks.forEach(task => {
    const ganttTask: GanttTask = {
      ...task,
      startDate: task.planned_start_date ? parseLocalDate(task.planned_start_date) : projectStartDate,
      endDate: task.planned_end_date ? parseLocalDate(task.planned_end_date) : projectEndDate,
      actualStartDate: task.actual_start_date ? parseLocalDate(task.actual_start_date) : undefined,
      actualEndDate: task.actual_end_date ? parseLocalDate(task.actual_end_date) : undefined,
      x: 0,
      y: 0,
      width: 0,
      height: DEFAULT_GANTT_CONFIG.taskBarHeight,
      level: 0,
      children: [],
      isExpanded: expandedTasks.has(task.id),
      color: getTaskColor(task),
      textColor: getTaskTextColor(task)
    };

    taskMap.set(task.id, ganttTask);

    if (!task.parent_task_id) {
      rootTasks.push(ganttTask);
    }
  });

  // 親子関係を構築
  tasks.forEach(task => {
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id);
      const child = taskMap.get(task.id);
      if (parent && child) {
        parent.children?.push(child);
        child.level = parent.level + 1;
      }
    }
  });

  // 表示用の座標とサイズを計算
  const flatTasks = flattenTasks(rootTasks);
  calculateTaskPositions(flatTasks, projectStartDate, projectEndDate, viewType, containerWidth);

  return flatTasks;
}

/**
 * 階層構造のタスクを平坦化
 */
function flattenTasks(tasks: GanttTask[]): GanttTask[] {
  const result: GanttTask[] = [];
  
  function traverse(taskList: GanttTask[]) {
    taskList.forEach(task => {
      result.push(task);
      if (task.children && task.children.length > 0 && task.isExpanded) {
        traverse(task.children);
      }
    });
  }
  
  traverse(tasks);
  return result;
}

/**
 * タスクの位置とサイズを計算
 */
function calculateTaskPositions(
  tasks: GanttTask[],
  projectStartDate: Date,
  projectEndDate: Date,
  viewType: GanttViewType,
  containerWidth: number
) {
  const dayWidth = calculateDayWidth(viewType, containerWidth, projectStartDate, projectEndDate);
  
  tasks.forEach((task, index) => {
    // Y座標（行位置）
    task.y = index * DEFAULT_GANTT_CONFIG.rowHeight;
    
    // X座標とWidth（期間）- ローカル日付での計算
    const projectStartTime = new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), projectStartDate.getDate()).getTime();
    const taskStartTime = new Date(task.startDate.getFullYear(), task.startDate.getMonth(), task.startDate.getDate()).getTime();
    const taskEndTime = new Date(task.endDate.getFullYear(), task.endDate.getMonth(), task.endDate.getDate()).getTime();
    
    const startOffset = Math.round((taskStartTime - projectStartTime) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.round((taskEndTime - taskStartTime) / (1000 * 60 * 60 * 24)) + 1);
    
    task.x = startOffset * dayWidth;
    task.width = Math.max(DEFAULT_GANTT_CONFIG.minTaskWidth, duration * dayWidth);
    
    // デバッグログ
    if (task.name.includes('設計作業')) {
      console.log(`=== Task Position Debug ===`);
      console.log(`Task: ${task.name}`);
      console.log(`View Type: ${viewType}`);
      console.log(`Project Start: ${projectStartDate.toISOString().split('T')[0]}`);
      console.log(`Task Start: ${task.startDate.toISOString().split('T')[0]}`);
      console.log(`Project Start Time: ${projectStartTime}`);
      console.log(`Task Start Time: ${taskStartTime}`);
      console.log(`Start Offset Days: ${startOffset}`);
      console.log(`Day Width: ${dayWidth}`);
      console.log(`Task X Position: ${task.x}`);
      console.log(`Container Width: ${containerWidth}`);
      console.log(`===========================`);
    }
  });
}

/**
 * ビュータイプに基づく1日の幅を計算
 * コンテナサイズと期間を考慮した動的な計算
 */
export function calculateDayWidth(viewType: GanttViewType, containerWidth: number, startDate: Date, endDate: Date): number {
  const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const totalDays = Math.round((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1;
  
  // ビューモードに応じた固定幅を使用（一貫性を保つため）
  switch (viewType) {
    case 'day':
      return 50; // 1日50px（十分な幅を確保）
    case 'week':
      return 25; // 1日25px（視認性を向上）
    case 'month':
    default:
      return 20; // 1日20px（半角2文字分の幅を確保）
  }
}

/**
 * 簡易版の日幅計算（後方互換性のため）
 */
function calculateDayWidthSimple(viewType: GanttViewType, totalDays: number): number {
  switch (viewType) {
    case 'day':
      return 40; // 1日40px
    case 'week':
      return 20; // 1日20px
    case 'month':
    default:
      return 10; // 1日10px
  }
}

/**
 * タスクの状態に基づく色を取得
 */
function getTaskColor(task: Task): string {
  if (task.is_milestone) {
    return DEFAULT_GANTT_CONFIG.colors.milestone;
  }
  
  switch (task.status) {
    case 'completed':
      return DEFAULT_GANTT_CONFIG.colors.completed;
    case 'in_progress':
      return DEFAULT_GANTT_CONFIG.colors.inProgress;
    case 'not_started':
    default:
      return DEFAULT_GANTT_CONFIG.colors.notStarted;
  }
}

/**
 * タスクの状態に基づくテキスト色を取得
 */
function getTaskTextColor(task: Task): string {
  return '#ffffff'; // 白色固定
}

/**
 * 日付範囲内の週末日を取得
 */
export function getWeekendDays(startDate: Date, endDate: Date): Date[] {
  const weekends: Date[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 日曜日または土曜日
      weekends.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekends;
}

/**
 * 今日の日付ラインの位置を計算
 */
export function getTodayPosition(
  projectStartDate: Date,
  projectEndDate: Date,
  viewType: GanttViewType,
  containerWidth: number
): number {
  const today = new Date();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const projectStartTime = new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), projectStartDate.getDate()).getTime();
  
  if (todayTime < projectStartTime) return -1;
  
  const daysSinceStart = Math.round((todayTime - projectStartTime) / (1000 * 60 * 60 * 24));
  const dayWidth = calculateDayWidth(viewType, containerWidth, projectStartDate, projectEndDate);
  
  return daysSinceStart * dayWidth;
}

/**
 * 時間軸のスケールラベルを生成
 */
export function generateTimeLabels(
  startDate: Date,
  endDate: Date,
  viewType: GanttViewType,
  containerWidth: number
): { date: Date; label: string; x: number; width: number }[] {
  const labels: { date: Date; label: string; x: number; width: number }[] = [];
  const dayWidth = calculateDayWidth(viewType, containerWidth, startDate, endDate);
  
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  switch (viewType) {
    case 'day':
      // 日表示：毎日のラベル
      let dayIndex = 0;
      while (current <= end) {
        labels.push({
          date: new Date(current),
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          x: dayIndex * dayWidth,
          width: dayWidth
        });
        current.setDate(current.getDate() + 1);
        dayIndex++;
      }
      break;
      
    case 'week':
      // 週表示：開始日から7日間単位で表示
      let weekStart = new Date(current);
      let weekIndex = 0;
      
      while (weekStart <= end) {
        // 週の開始日のラベル
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 6); // 6日後が週の終了日
        
        labels.push({
          date: new Date(weekStart),
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}〜`,
          x: weekIndex * 7 * dayWidth,
          width: 7 * dayWidth
        });
        
        // 次の週へ
        weekStart.setDate(weekStart.getDate() + 7);
        weekIndex++;
      }
      break;
      
    case 'month':
    default:
      // 月表示：開始日から月単位で表示
      const monthStart = new Date(current.getFullYear(), current.getMonth(), current.getDate()); // 開始日の年月日を使用
      const actualStartTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
      
      while (monthStart <= end) {
        // 開始日からの日数を正確に計算
        const monthStartTime = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate()).getTime();
        const daysSinceStart = Math.round((monthStartTime - actualStartTime) / (1000 * 60 * 60 * 24));
        
        // その月の末日を取得
        const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, monthStart.getDate());
        const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0); // 前月の末日
        
        // 表示期間内の日数を計算
        const monthEndTime = Math.min(endOfMonth.getTime(), new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime());
        const daysInMonth = Math.round((monthEndTime - monthStartTime) / (1000 * 60 * 60 * 24)) + 1;
        
        // 月表示は年月を簡略化
        const monthLabel = viewType === 'month' && daysInMonth * dayWidth < 80 
          ? `${monthStart.getMonth() + 1}月` 
          : `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`;
        
        labels.push({
          date: new Date(monthStart),
          label: monthLabel,
          x: Math.max(0, daysSinceStart * dayWidth),
          width: Math.max(dayWidth, daysInMonth * dayWidth)
        });
        
        // 次の月の同日に移動
        monthStart.setMonth(monthStart.getMonth() + 1);
      }
      break;
  }
  
  return labels;
}

/**
 * マイルストーンかどうかを判定
 */
export function isMilestone(task: Task): boolean {
  return task.is_milestone || task.estimated_hours === 0;
}

/**
 * 重要タスク（クリティカルパス）かどうかを判定
 */
export function isCriticalPath(task: Task, allTasks: Task[]): boolean {
  // 簡易的な判定（実際のクリティカルパス計算は複雑）
  return task.priority === 'high' && task.status !== 'completed';
}

/**
 * タスク依存関係からガント表示用の依存関係データを生成
 */
export function generateDependencies(
  tasks: GanttTask[],
  dependencies: TaskDependency[]
): GanttDependency[] {
  const taskMap = new Map<number, GanttTask>();
  tasks.forEach(task => taskMap.set(task.id, task));

  return dependencies
    .map((dep, index) => {
      const fromTask = taskMap.get(dep.predecessor_id);
      const toTask = taskMap.get(dep.successor_id);
      
      if (!fromTask || !toTask) return null;

      return {
        id: `dep-${index}`,
        fromTask: dep.predecessor_id,
        toTask: dep.successor_id,
        type: mapDependencyType(dep.dependency_type),
        lagDays: dep.lag_days,
        points: [] // 実際の描画時に計算
      };
    })
    .filter((dep): dep is GanttDependency => dep !== null);
}

/**
 * 依存関係タイプをマップ
 */
function mapDependencyType(dbType: string): 'fs' | 'ss' | 'ff' | 'sf' {
  switch (dbType) {
    case 'finish_to_start':
      return 'fs';
    case 'start_to_start':
      return 'ss';
    case 'finish_to_finish':
      return 'ff';
    case 'start_to_finish':
      return 'sf';
    default:
      return 'fs';
  }
}

/**
 * クリティカルパスを計算（CPM: Critical Path Method）
 */
export function calculateCriticalPath(
  tasks: GanttTask[],
  dependencies: GanttDependency[]
): number[] {
  const taskMap = new Map<number, GanttTask>();
  const dependencyMap = new Map<number, GanttDependency[]>();
  const reverseDependencyMap = new Map<number, GanttDependency[]>();
  
  // マップを構築
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    dependencyMap.set(task.id, []);
    reverseDependencyMap.set(task.id, []);
  });
  
  dependencies.forEach(dep => {
    dependencyMap.get(dep.fromTask)?.push(dep);
    reverseDependencyMap.get(dep.toTask)?.push(dep);
  });

  // 早期開始時間（ES）と早期完了時間（EF）を計算
  const earlyStart = new Map<number, number>();
  const earlyFinish = new Map<number, number>();
  const duration = new Map<number, number>();
  
  tasks.forEach(task => {
    const taskDuration = task.endDate.getTime() - task.startDate.getTime();
    duration.set(task.id, taskDuration / (1000 * 60 * 60 * 24)); // 日数
  });

  // トポロジカルソート（依存関係の順序で処理）
  const visited = new Set<number>();
  const processing = new Set<number>();
  
  function calculateES(taskId: number): number {
    if (earlyStart.has(taskId)) return earlyStart.get(taskId)!;
    
    if (processing.has(taskId)) {
      // 循環依存が検出された場合
      console.warn(`Circular dependency detected involving task ${taskId}`);
      return 0;
    }
    
    processing.add(taskId);
    
    let maxES = 0;
    const predecessors = reverseDependencyMap.get(taskId) || [];
    
    for (const dep of predecessors) {
      const predES = calculateES(dep.fromTask);
      const predDuration = duration.get(dep.fromTask) || 0;
      const lagDays = dep.lagDays || 0;
      
      let requiredStart: number;
      switch (dep.type) {
        case 'fs':
          requiredStart = predES + predDuration + lagDays;
          break;
        case 'ss':
          requiredStart = predES + lagDays;
          break;
        case 'ff':
          const currentDuration = duration.get(taskId) || 0;
          requiredStart = predES + predDuration + lagDays - currentDuration;
          break;
        case 'sf':
          requiredStart = predES + lagDays - (duration.get(taskId) || 0);
          break;
        default:
          requiredStart = predES + predDuration + lagDays;
      }
      
      maxES = Math.max(maxES, requiredStart);
    }
    
    processing.delete(taskId);
    earlyStart.set(taskId, maxES);
    earlyFinish.set(taskId, maxES + (duration.get(taskId) || 0));
    
    return maxES;
  }

  // 全タスクのESを計算
  tasks.forEach(task => calculateES(task.id));

  // 遅延開始時間（LS）と遅延完了時間（LF）を計算
  const lateStart = new Map<number, number>();
  const lateFinish = new Map<number, number>();
  
  // プロジェクト終了時間を取得
  const projectFinish = Math.max(...Array.from(earlyFinish.values()));
  
  function calculateLS(taskId: number): number {
    if (lateStart.has(taskId)) return lateStart.get(taskId)!;
    
    const successors = dependencyMap.get(taskId) || [];
    
    if (successors.length === 0) {
      // 終端タスク
      const ef = earlyFinish.get(taskId) || 0;
      lateFinish.set(taskId, projectFinish);
      lateStart.set(taskId, projectFinish - (duration.get(taskId) || 0));
      return lateStart.get(taskId)!;
    }
    
    let minLF = Infinity;
    for (const dep of successors) {
      const succLS = calculateLS(dep.toTask);
      const lagDays = dep.lagDays || 0;
      
      let requiredFinish: number;
      switch (dep.type) {
        case 'fs':
          requiredFinish = succLS - lagDays;
          break;
        case 'ss':
          const currentDuration = duration.get(taskId) || 0;
          requiredFinish = succLS + currentDuration - lagDays;
          break;
        case 'ff':
          const succDuration = duration.get(dep.toTask) || 0;
          requiredFinish = succLS + succDuration - lagDays;
          break;
        case 'sf':
          requiredFinish = succLS + (duration.get(dep.toTask) || 0) - lagDays;
          break;
        default:
          requiredFinish = succLS - lagDays;
      }
      
      minLF = Math.min(minLF, requiredFinish);
    }
    
    lateFinish.set(taskId, minLF);
    lateStart.set(taskId, minLF - (duration.get(taskId) || 0));
    
    return lateStart.get(taskId)!;
  }

  // 全タスクのLSを計算
  tasks.forEach(task => calculateLS(task.id));

  // クリティカルパスを特定（スラック = 0 のタスク）
  const criticalTasks: number[] = [];
  
  tasks.forEach(task => {
    const es = earlyStart.get(task.id) || 0;
    const ls = lateStart.get(task.id) || 0;
    const slack = ls - es;
    
    if (Math.abs(slack) < 0.01) { // 浮動小数点の誤差を考慮
      criticalTasks.push(task.id);
    }
  });

  return criticalTasks;
}

// 型定義のインポートを追加
import { TaskDependency } from '@/types/task';
import { GanttDependency } from '@/types/gantt';