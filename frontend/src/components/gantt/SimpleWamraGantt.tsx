'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Gantt, Task as WamraTask, ViewMode } from '@wamra/gantt-task-react';
import '@wamra/gantt-task-react/dist/style.css';
import { Task } from '@/types/task';
import { GanttViewType } from '@/types/gantt';

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
    taskName: 150,
    startDate: 100,
    endDate: 100,
    estimatedHours: 80,
    dependencies: 80
  });

  // 機能表示のチェックボックス状態管理
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showProgressLine, setShowProgressLine] = useState(false);

  // 展開・折り畳み状態の管理（デフォルトで全ての親タスクを展開）
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    tasks.forEach(task => {
      const hasChildren = tasks.some(t => t.parent_task_id === task.id);
      if (hasChildren) {
        initialExpanded.add(task.id.toString());
      }
    });
    return initialExpanded;
  });

  // チェックボックス状態に応じてDOMを動的に更新
  useEffect(() => {
    const updateGanttDisplay = () => {
      // 複数の可能性のあるセレクターで依存関係の矢印を検索
      const possibleSelectors = [
        '.gantt-arrow',
        '[class*="arrow"]',
        'path[stroke*="#3b82f6"]',
        'line[class*="dependency"]',
        'svg path[marker-end*="arrow"]'
      ];

      let arrows: NodeListOf<Element> | null = null;
      for (const selector of possibleSelectors) {
        arrows = document.querySelectorAll(selector);
        if (arrows.length > 0) break;
      }

      // 依存関係の矢印表示/非表示
      if (arrows && arrows.length > 0) {
        arrows.forEach((arrow: Element) => {
          const svgElement = arrow as SVGElement;
          if (showDependencies) {
            svgElement.style.opacity = '1';
            svgElement.style.visibility = 'visible';
            svgElement.style.stroke = '#3b82f6';
            arrow.classList.remove('hidden');
          } else {
            svgElement.style.opacity = '0';
            svgElement.style.visibility = 'hidden';
            svgElement.style.stroke = 'transparent';
            arrow.classList.add('hidden');
          }
        });
      }

      // クリティカルパス表示/非表示
      const bars = document.querySelectorAll('[class*="bar"], .gantt-bar');
      bars.forEach((bar: Element) => {
        const barElement = bar as HTMLElement;
        if (showCriticalPath) {
          // ここでクリティカルパスの判定ロジックを実装
          // 仮実装として、最初のタスクをクリティカルパスとして設定
          if (bar.getAttribute('data-task-id') === '1' || 
              bar.closest('[data-task-id="1"]')) {
            barElement.style.backgroundColor = '#dc2626';
            bar.classList.add('critical-path');
          }
        } else {
          barElement.style.backgroundColor = '';
          bar.classList.remove('critical-path');
        }
      });

      // イナズマ線表示/非表示
      const progressLines = document.querySelectorAll('.progress-line');
      progressLines.forEach((line: Element) => {
        const lineElement = line as SVGElement;
        if (showProgressLine) {
          lineElement.style.opacity = '1';
          lineElement.style.visibility = 'visible';
          line.classList.remove('hidden');
        } else {
          lineElement.style.opacity = '0';
          lineElement.style.visibility = 'hidden';
          line.classList.add('hidden');
        }
      });
    };

    // DOM更新を複数回実行して確実に反映
    const timeouts = [
      setTimeout(updateGanttDisplay, 100),
      setTimeout(updateGanttDisplay, 500),
      setTimeout(updateGanttDisplay, 1000),
      setTimeout(updateGanttDisplay, 2000)
    ];

    // MutationObserverでDOM変更を監視し、動的に更新
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          // SVG要素や依存関係に関連する変更があった場合
          if (mutation.target && (
            (mutation.target as Element).matches?.('svg, [class*="gantt"], [class*="arrow"]') ||
            Array.from(mutation.addedNodes).some(node => 
              node.nodeType === Node.ELEMENT_NODE && 
              (node as Element).matches?.('svg, path, line, [class*="arrow"]')
            )
          )) {
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        setTimeout(updateGanttDisplay, 50);
      }
    });

    // ガント要素を監視開始
    const ganttElement = document.querySelector('.simple-wamra-gantt');
    if (ganttElement) {
      observer.observe(ganttElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      observer.disconnect();
    };
  }, [showDependencies, showCriticalPath, showProgressLine]);

  // カラム幅の調整ハンドラー
  const handleColumnResize = useCallback((column: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(50, width) // 最小幅50px
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

  // カレンダーヘッダーのフォーマット関数
  const formatCalendarHeader = useCallback((date: Date, viewMode: ViewMode) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    switch (viewMode) {
      case ViewMode.Month:
        return {
          top: `${year}`,
          bottom: `${month}月`
        };
      case ViewMode.Week:
        const startOfWeek = new Date(date);
        const dayOfWeek = startOfWeek.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 月曜始まり
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        const weekMonth = startOfWeek.getMonth() + 1;
        const weekDay = startOfWeek.getDate();
        return {
          top: `${year}/${month}`,
          bottom: `${weekMonth}/${weekDay}週`
        };
      case ViewMode.Day:
        return {
          top: `${year}/${month}`,
          bottom: date.getDate().toString()
        };
      default:
        return {
          top: `${year}`,
          bottom: `${month}月`
        };
    }
  }, []);
  // デバッグ用：依存関係情報を出力
  useEffect(() => {
    const tasksWithDependencies = tasks.filter(task => 
      task.predecessor_task_ids && task.predecessor_task_ids.length > 0
    );
    if (tasksWithDependencies.length > 0) {
      console.log('Tasks with dependencies:', tasksWithDependencies.map(task => ({
        id: task.id,
        name: task.name,
        predecessors: task.predecessor_task_ids
      })));
    }
  }, [tasks]);

  // TaskをWamraTask形式に変換（フィルタリング付き）
  const wamraTasks: WamraTask[] = useMemo(() => {
    // 親子関係を考慮してフィルタリング
    const visibleTasks = tasks.filter(task => {
      // ルートレベルのタスクは常に表示
      if (!task.parent_task_id) return true;
      
      // 親タスクを辿って、すべての親が展開されているかチェック
      let currentTask = task;
      while (currentTask.parent_task_id) {
        const parentTask = tasks.find(t => t.id === currentTask.parent_task_id);
        if (!parentTask) break;
        
        // 親タスクが展開されていない場合は非表示
        if (!expandedTasks.has(parentTask.id.toString())) {
          return false;
        }
        currentTask = parentTask;
      }
      return true;
    });

    return visibleTasks.map((task) => {
      // 日付の処理
      const startDate = task.planned_start_date 
        ? new Date(task.planned_start_date)
        : new Date();
      
      const endDate = task.planned_end_date 
        ? new Date(task.planned_end_date)
        : new Date(startDate.getTime() + (task.estimated_hours || 24) * 60 * 60 * 1000);

      // タスクタイプの決定
      let type: 'task' | 'milestone' | 'project' = 'task';
      const hasChildren = tasks.some(t => t.parent_task_id === task.id);
      
      if (task.is_milestone) {
        type = 'milestone';
      } else if (hasChildren) {
        type = 'project';
      }

      return {
        start: startDate,
        end: endDate,
        name: task.name,
        id: task.id.toString(),
        type,
        progress: task.progress_rate / 100,
        isDisabled: task.status === 'completed',
        dependencies: task.predecessor_task_ids?.map(id => id.toString()) || [],
        hideChildren: !expandedTasks.has(task.id.toString()),
        displayOrder: task.sort_order || task.id,
        styles: {
          backgroundColor: showCriticalPath && task.id === 1 
            ? '#dc2626' // クリティカルパス用の赤色
            : type === 'project' ? '#3b82f6' : type === 'milestone' ? '#f59e0b' : '#10b981',
          backgroundSelectedColor: showCriticalPath && task.id === 1 ? '#991b1b' : '#1d4ed8',
          progressColor: '#10b981',
          progressSelectedColor: '#059669'
        }
      };
    });
  }, [tasks, expandedTasks, showCriticalPath]);

  // カレンダーヘッダーの日本語化
  // Replace the existing useEffect for calendar header formatting with this improved version:

// Replace the calendar header formatting useEffect with this improved version:

useEffect(() => {
  const formatCalendarHeaders = () => {
    // Clear all previous formatting attributes to allow re-formatting when view changes
    const allFormattedElements = document.querySelectorAll('[data-formatted="true"]');
    allFormattedElements.forEach(element => {
      element.removeAttribute('data-formatted');
    });

    // More targeted search for calendar header elements
    const calendarSelectors = [
      '.gantt-header-cell',
      '[class*="calendar"]',
      '[class*="header"] *',
      '.gantt * text',
      '.gantt-container *'
    ];

    const allElements = new Set<Element>();
    
    // Collect all potential elements from multiple selectors
    calendarSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => allElements.add(el));
      } catch (e) {
        // Skip invalid selectors
      }
    });

    // Also add all text-containing elements in the gantt area
    const ganttContainer = document.querySelector('.simple-wamra-gantt');
    if (ganttContainer) {
      const textNodes = document.createTreeWalker(
        ganttContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = textNodes.nextNode()) {
        if (textNode.parentElement && textNode.textContent?.trim()) {
          allElements.add(textNode.parentElement);
        }
      }
    }
    
    allElements.forEach((element: any) => {
      const text = element.textContent?.trim() || '';
      if (!text || element.children.length > 0) return;
      
      let formattedText = '';
      
      // Week view formatting
      if (viewType === 'week') {
        // Handle year-month format (August,2025 → 2025/8)
        if (/^[A-Za-z]+,\s*\d{4}$/.test(text)) {
          const parts = text.split(',');
          const monthName = parts[0].trim();
          const year = parts[1].trim();
          const monthMap: { [key: string]: string } = {
            'January': '1', 'February': '2', 'March': '3', 'April': '4',
            'May': '5', 'June': '6', 'July': '7', 'August': '8',
            'September': '9', 'October': '10', 'November': '11', 'December': '12'
          };
          const month = monthMap[monthName] || monthName;
          formattedText = `${year}/${month}`;
        }
        // Handle standalone month names (September, October, etc.)
        else if (/^(January|February|March|April|May|June|July|August|September|October|November|December)$/.test(text)) {
          const monthMap: { [key: string]: string } = {
            'January': '1', 'February': '2', 'March': '3', 'April': '4',
            'May': '5', 'June': '6', 'July': '7', 'August': '8',
            'September': '9', 'October': '10', 'November': '11', 'December': '12'
          };
          const currentYear = new Date().getFullYear();
          formattedText = `${currentYear}/${monthMap[text]}`;
        }
        // Handle week format (W36 → week number with proper date)
        else if (/^W\d+$/.test(text)) {
          const weekNum = parseInt(text.replace('W', ''));
          const currentYear = new Date().getFullYear();
          
          // Calculate the start date of the week
          const jan1 = new Date(currentYear, 0, 1);
          const daysToFirstMonday = (1 + 7 - jan1.getDay()) % 7;
          const firstMonday = new Date(currentYear, 0, 1 + daysToFirstMonday);
          
          const weekStart = new Date(firstMonday);
          weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
          
          const month = weekStart.getMonth() + 1;
          const day = weekStart.getDate();
          formattedText = `${month}/${day}週`;
        }
        // Skip if already in correct Japanese format
        else if (/^\d{4}\/\d{1,2}$/.test(text) || /^\d{1,2}\/\d{1,2}週$/.test(text)) {
          element.setAttribute('data-formatted', 'true');
          return;
        }
      }
      // Month view formatting
      else if (viewType === 'month') {
        // Year conversion (25 → 2025)
        if (/^\d{2}$/.test(text)) {
          const shortYear = parseInt(text);
          const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
          formattedText = fullYear.toString();
        }
        // Month name conversion (both short and long forms)
        else {
          const monthMap: { [key: string]: string } = {
            'Jan': '1月', 'Feb': '2月', 'Mar': '3月', 'Apr': '4月',
            'May': '5月', 'Jun': '6月', 'Jul': '7月', 'Aug': '8月',
            'Sep': '9月', 'Oct': '10月', 'Nov': '11月', 'Dec': '12月',
            'January': '1月', 'February': '2月', 'March': '3月', 'April': '4月',
            'June': '6月', 'July': '7月', 'August': '8月', 'September': '9月',
            'October': '10月', 'November': '11月', 'December': '12月'
          };
          if (monthMap[text]) {
            formattedText = monthMap[text];
          }
        }
        // Skip if already in correct Japanese format
        if (/^\d{4}$/.test(text) || /^\d{1,2}月$/.test(text)) {
          element.setAttribute('data-formatted', 'true');
          return;
        }
      }
      // Day view formatting
      else if (viewType === 'day') {
        const monthMap: { [key: string]: string } = {
          'January': '1', 'February': '2', 'March': '3', 'April': '4',
          'May': '5', 'June': '6', 'July': '7', 'August': '8',
          'September': '9', 'October': '10', 'November': '11', 'December': '12'
        };
        if (monthMap[text]) {
          const currentYear = new Date().getFullYear();
          formattedText = `${currentYear}/${monthMap[text]}`;
        }
        else if (/^[a-z]{3},\s*\d+$/i.test(text)) {
          const dayNum = text.split(',')[1]?.trim();
          formattedText = dayNum || text;
        }
        // Skip if already in correct format
        if (/^\d{4}\/\d{1,2}$/.test(text) || /^\d{1,2}$/.test(text)) {
          element.setAttribute('data-formatted', 'true');
          return;
        }
      }
      
      // Apply the formatting if we have a replacement
      if (formattedText && formattedText !== text) {
        element.textContent = formattedText;
        element.setAttribute('data-formatted', 'true');
      }
    });
  };

  // Clear any existing timeouts to prevent conflicts
  const timeoutIds: NodeJS.Timeout[] = [];
  
  const scheduleFormatting = () => {
    // Clear previous timeouts
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds.length = 0;
    
    // Schedule multiple rounds of formatting with different delays
    const delays = [0, 50, 150, 300, 600, 1000];
    
    delays.forEach(delay => {
      const timeoutId = setTimeout(formatCalendarHeaders, delay);
      timeoutIds.push(timeoutId);
    });
  };

  // Initial formatting
  scheduleFormatting();

  // Set up MutationObserver for dynamic updates
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        // Check if any calendar-related elements were added or text was changed
        const target = mutation.target as Element;
        if (target.closest && (
          target.closest('.gantt') ||
          target.closest('[class*="calendar"]') ||
          target.closest('[class*="header"]') ||
          // Check for newly added nodes that might contain calendar headers
          Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node as Element).matches?.('*')
          )
        )) {
          shouldUpdate = true;
        }
      }
    });
    
    if (shouldUpdate) {
      // Delay to let the gantt library finish its rendering
      setTimeout(formatCalendarHeaders, 150);
      setTimeout(formatCalendarHeaders, 400);
    }
  });

  // Start observing the entire gantt container
  const ganttElement = document.querySelector('.simple-wamra-gantt');
  if (ganttElement) {
    observer.observe(ganttElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }

  // Cleanup function
  return () => {
    timeoutIds.forEach(id => clearTimeout(id));
    observer.disconnect();
  };
}, [viewType, wamraTasks]); // Re-run when viewType or tasks change
  // イベントハンドラー
  const handleDateChange = (task: WamraTask) => {
    const taskId = parseInt(task.id);
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (!originalTask || !onTaskUpdate) return;

    // 週末を平日に調整する関数
    const adjustToWeekday = (date: Date) => {
      const day = date.getDay();
      if (day === 0) { // 日曜日 -> 月曜日
        date.setDate(date.getDate() + 1);
      } else if (day === 6) { // 土曜日 -> 月曜日
        date.setDate(date.getDate() + 2);
      }
      return date;
    };

    const adjustedStart = adjustToWeekday(new Date(task.start));
    const adjustedEnd = adjustToWeekday(new Date(task.end));

    const updates: Partial<Task> = {
      name: task.name,
      planned_start_date: adjustedStart.toISOString().split('T')[0],
      planned_end_date: adjustedEnd.toISOString().split('T')[0],
      progress_rate: Math.round(task.progress * 100),
    };

    onTaskUpdate(taskId, updates);
  };

  const handleSelect = (task: WamraTask, isSelected: boolean) => {
    if (!onTaskSelect) return;
    
    if (isSelected) {
      const originalTask = tasks.find(t => t.id.toString() === task.id);
      onTaskSelect(originalTask || null);
    } else {
      onTaskSelect(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`gantt-empty-state bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">タスクがありません</h3>
        <p className="text-gray-600">新しいタスクを作成してプロジェクトを開始しましょう</p>
      </div>
    );
  }

  return (
    <div className={`simple-wamra-gantt ${className}`}>
      {/* コントロールパネル */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="text-sm font-medium text-gray-700">表示オプション:</div>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDependencies}
              onChange={(e) => setShowDependencies(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">依存関係</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="form-checkbox h-4 w-4 text-red-600"
            />
            <span className="text-sm text-gray-700">クリティカルパス</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showProgressLine}
              onChange={(e) => setShowProgressLine(e.target.checked)}
              className="form-checkbox h-4 w-4 text-green-600"
            />
            <span className="text-sm text-gray-700">イナズマ線111</span>
          </label>
        </div>
      </div>
      
      <style jsx global>{`
        .gantt-table {
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
        }
        
        .gantt-table-header {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .gantt-row-selected {
          background-color: #eff6ff !important;
        }
        
        /* カレンダーヘッダーの日本語フォーマット */
        .gantt-calendar-header {
          font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', sans-serif;
        }
        
        /* スクロール可能にする */
        .gantt-container {
          overflow-x: auto;
          overflow-y: auto;
        }
        
        .gantt-grid-body {
          overflow-x: auto;
          overflow-y: auto;
        }
        
        /* 月の表示を日本語に */
        .gantt-header-cell {
          font-size: 12px;
          color: #374151;
        }

        /* カラム幅調整用のリサイザー */
        .column-resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background-color: transparent;
          border-right: 1px solid #e5e7eb;
        }
        
        .column-resizer:hover {
          background-color: #3b82f6;
          border-right-color: #3b82f6;
        }

        /* 展開・折り畳みボタン */
        .expand-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-right: 4px;
          border: none;
          background: #f3f4f6;
          border-radius: 2px;
          cursor: pointer;
          font-size: 10px;
          line-height: 1;
        }
        
        .expand-button:hover {
          background: #e5e7eb;
        }
        
        .expand-button.expanded {
          background: #3b82f6;
          color: white;
        }

        /* カレンダーヘッダーのカスタマイズ */
        .gantt_calendar_header_cell {
          font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', sans-serif !important;
        }
        
        /* 月表示のヘッダーフォーマット */
        .gantt_calendar_month_header {
          font-size: 12px !important;
        }
        
        /* 週表示のヘッダーフォーマット */  
        .gantt_calendar_week_header {
          font-size: 11px !important;
        }
        
        /* 日表示のヘッダーフォーマット */
        .gantt_calendar_day_header {
          font-size: 10px !important;
        }

        /* ガントチャートとタスクリストの行の高さを統一 */
        .gantt-task-list-row {
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          min-height: 50px !important;
        }

        .gantt-bar-wrapper {
          height: 50px !important;
        }

        /* タスクバーの位置調整 */
        .gantt-bar {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        /* 依存関係の矢印スタイル - 複数のセレクターで確実に適用 */
        .gantt-arrow,
        [class*="arrow"],
        path[stroke*="#3b82f6"],
        line[class*="dependency"],
        svg path[marker-end*="arrow"] {
          stroke: #3b82f6 !important;
          stroke-width: 2 !important;
          fill: none !important;
          marker-end: url(#arrowhead) !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .gantt-arrow.hidden,
        [class*="arrow"].hidden,
        path.hidden,
        line.hidden {
          opacity: 0 !important;
          visibility: hidden !important;
          stroke: transparent !important;
        }

        /* 矢印のマーカー定義を追加 */
        svg defs marker#arrowhead {
          fill: #3b82f6 !important;
          stroke: #3b82f6 !important;
        }

        /* ガント内のSVG要素に対する包括的なスタイル */
        .gantt svg path[stroke]:not([stroke="transparent"]):not([stroke="none"]) {
          stroke: #3b82f6 !important;
          stroke-width: 2 !important;
        }

        .gantt svg line:not([stroke="transparent"]):not([stroke="none"]) {
          stroke: #3b82f6 !important;
          stroke-width: 2 !important;
        }

        /* クリティカルパス用のスタイル */
        .gantt-bar.critical-path {
          fill: #dc2626 !important;
          stroke: #dc2626 !important;
        }

        .gantt-arrow.critical-path {
          stroke: #dc2626 !important;
          stroke-width: 3 !important;
        }

        /* イナズマ線用のスタイル */
        .progress-line {
          stroke: #10b981 !important;
          stroke-width: 2 !important;
          stroke-dasharray: 5,5 !important;
          fill: none !important;
        }

        .progress-line.hidden {
          display: none !important;
        }
      `}</style>
      
      <Gantt
        tasks={wamraTasks}
        viewMode={viewType === 'day' ? ViewMode.Day : viewType === 'week' ? ViewMode.Week : ViewMode.Month}
        onDateChange={handleDateChange}
        onSelect={handleSelect}
        locale="ja"
        columnWidth={viewType === 'day' ? 65 : viewType === 'week' ? 90 : 120}
        rowHeight={50}
        listCellWidth={`${columnWidths.taskName + columnWidths.startDate + columnWidths.endDate + columnWidths.dependencies}px`}
        headerHeight={50}
        ganttHeight={600}
        preStepsCount={1}
        postStepsCount={20}
        rtl={false}
        onExpanderClick={(task) => handleToggleExpand(task.id)}
        arrowIndent={20}
        arrowIndentFromTaskBar={20}
        checkIsHoliday={(date) => {
          const day = date.getDay();
          return day === 0 || day === 6; // 土日を休日とする
        }}
        dateMoveStep={{
          days: 1 // 1日単位で移動
        }}
        roundDate={(date, viewMode, moveStep) => {
          const day = date.getDay();
          
          // 週末の場合は次の月曜日に調整
          if (day === 0) { // 日曜日
            const newDate = new Date(date);
            newDate.setDate(date.getDate() + 1);
            return newDate;
          } else if (day === 6) { // 土曜日
            const newDate = new Date(date);
            newDate.setDate(date.getDate() + 2);
            return newDate;
          }
          
          return date; // 平日はそのまま
        }}
        arrowColor={showDependencies ? "#3b82f6" : "transparent"}
        TooltipContent={({ task, fontSize, fontFamily }) => (
          <div className="gantt-tooltip bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm">
            <div className="font-medium text-gray-900 mb-1">{task.name}</div>
            <div className="text-gray-600 text-xs space-y-1">
              <div>開始: {formatDateToJapanese(task.start)}</div>
              <div>終了: {formatDateToJapanese(task.end)}</div>
              <div>進捗: {Math.round(task.progress * 100)}%</div>
            </div>
          </div>
        )}
        TaskListHeader={({ headerHeight, rowWidth, fontFamily, fontSize }) => {
          const ResizableColumn = ({ 
            children, 
            width, 
            columnKey, 
            isLast = false 
          }: { 
            children: React.ReactNode; 
            width: number; 
            columnKey: string; 
            isLast?: boolean 
          }) => {
            const handleMouseDown = (e: React.MouseEvent) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = width;

              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = startWidth + (e.clientX - startX);
                handleColumnResize(columnKey, newWidth);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            };

            return (
              <div 
                className={`relative px-3 py-2 font-medium text-gray-700 ${!isLast ? 'border-r border-gray-200' : ''}`}
                style={{ width, minWidth: 50 }}
              >
                {children}
                {!isLast && (
                  <div 
                    className="column-resizer"
                    onMouseDown={handleMouseDown}
                  />
                )}
              </div>
            );
          };

          return (
            <div 
              className="gantt-task-list-header bg-gray-50 border-r border-gray-200 flex"
              style={{ height: headerHeight, width: rowWidth, fontFamily, fontSize }}
            >
              <ResizableColumn width={columnWidths.taskName} columnKey="taskName">
                タスク/フェーズ
              </ResizableColumn>
              <ResizableColumn width={columnWidths.startDate} columnKey="startDate">
                <div className="text-center">開始予定日</div>
              </ResizableColumn>
              <ResizableColumn width={columnWidths.endDate} columnKey="endDate">
                <div className="text-center">終了予定日</div>
              </ResizableColumn>
              <ResizableColumn width={columnWidths.estimatedHours} columnKey="estimatedHours">
                <div className="text-center">予定工数</div>
              </ResizableColumn>
              <ResizableColumn width={columnWidths.dependencies} columnKey="dependencies" isLast>
                <div className="text-center">依存関係</div>
              </ResizableColumn>
            </div>
          );
        }}
        TaskListTable={({ rowHeight, rowWidth, fontFamily, fontSize, locale, tasks: ganttTasks, selectedTaskId, setSelectedTask, onExpanderClick }) => (
          <div className="gantt-task-list-wrapper" style={{ width: rowWidth }}>
            {ganttTasks.map((task, index) => {
              const isSelected = task.id === selectedTaskId;
              const originalTask = tasks.find(t => t.id.toString() === task.id);
              const hasChildren = tasks.some(t => t.parent_task_id === parseInt(task.id));
              const isExpanded = expandedTasks.has(task.id);
              const taskLevel = originalTask?.level || 0;

              return (
                <div
                  key={task.id}
                  className={`gantt-task-list-row border-b border-gray-100 flex items-center cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  style={{ 
                    height: rowHeight, 
                    fontFamily, 
                    fontSize
                  }}
                  onClick={() => {
                    // タスク詳細モーダルを開く
                    if (onTaskSelect) {
                      const originalTask = tasks.find(t => t.id.toString() === task.id);
                      onTaskSelect(originalTask || null);
                    }
                  }}
                >
                  <div 
                    className="px-3 py-2 border-r border-gray-200 flex items-center"
                    style={{ width: columnWidths.taskName, minWidth: 50 }}
                  >
                    <div 
                      className="flex items-center flex-1"
                      style={{ paddingLeft: taskLevel * 16 + 'px' }}
                    >
                      {hasChildren && (
                        <button 
                          className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(task.id);
                          }}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      )}
                      <div className="text-sm font-medium text-gray-900 truncate flex-1">
                        {task.name}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="px-3 py-2 border-r border-gray-200 text-center"
                    style={{ width: columnWidths.startDate, minWidth: 50 }}
                  >
                    <div className="text-xs text-gray-600">
                      {formatDateToJapanese(task.start)}
                    </div>
                  </div>
                  <div 
                    className="px-3 py-2 border-r border-gray-200 text-center"
                    style={{ width: columnWidths.endDate, minWidth: 50 }}
                  >
                    <div className="text-xs text-gray-600">
                      {formatDateToJapanese(task.end)}
                    </div>
                  </div>
                  <div 
                    className="px-3 py-2 border-r border-gray-200 text-center"
                    style={{ width: columnWidths.estimatedHours, minWidth: 50 }}
                  >
                    <div className="text-xs text-gray-600">
                      {originalTask?.estimated_hours || 0}h
                    </div>
                  </div>
                  <div 
                    className="px-3 py-2 text-center"
                    style={{ width: columnWidths.dependencies, minWidth: 50 }}
                  >
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const originalTask = tasks.find(t => t.id.toString() === task.id);
                        const predecessorIds = originalTask?.predecessor_task_ids || [];
                        
                        if (predecessorIds.length === 0) return '-';
                        
                        const predecessorNames = predecessorIds
                          .map(id => {
                            const predecessor = tasks.find(t => t.id === id);
                            return predecessor ? predecessor.name : `ID:${id}`;
                          })
                          .slice(0, 2); // 最大2個まで表示
                        
                        const displayText = predecessorNames.join(', ');
                        const remainingCount = predecessorIds.length - 2;
                        
                        return remainingCount > 0 
                          ? `${displayText} +${remainingCount}件`
                          : displayText;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      />
    </div>
  );
};