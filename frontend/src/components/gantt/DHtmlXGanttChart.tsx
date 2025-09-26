'use client';

import React, { useEffect, useRef } from 'react';
// @ts-ignore
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { Task } from '@/types/task';
import { TaskService } from '@/services/taskService';
import { useNotificationStore } from '@/stores/notification';

interface DHtmlXGanttChartProps {
  tasks: Task[];
  projectId: number;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task | null) => void;
  selectedTaskId?: number;
  className?: string;
}

export const DHtmlXGanttChart: React.FC<DHtmlXGanttChartProps> = ({
  tasks,
  projectId,
  onTaskUpdate,
  onTaskSelect,
  selectedTaskId,
  className = ''
}) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotificationStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!ganttRef.current || isInitialized.current) return;

    // 日本語設定
    (gantt as any).locale = {
      date: {
        month_full: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        month_short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        day_full: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
        day_short: ['日', '月', '火', '水', '木', '金', '土']
      },
      labels: {
        new_task: '新しいタスク',
        icon_save: '保存',
        icon_cancel: 'キャンセル',
        icon_details: '詳細',
        icon_edit: '編集',
        icon_delete: '削除',
        confirm_closing: '変更は保存されません。閉じますか？',
        confirm_deleting: 'タスクは完全に削除されます。よろしいですか？',
        section_description: '説明',
        section_time: '期間',
        section_type: 'タイプ',
        
        /* grid columns */
        column_wbs: 'WBS',
        column_text: 'タスク名',
        column_start_date: '開始日',
        column_duration: '期間',
        column_add: '',
        
        /* link confirmation */
        link: 'リンク',
        confirm_link_deleting: 'リンクが削除されます',
        link_start: '開始',
        link_end: '終了',
        
        /* message */
        message_ok: 'OK',
        message_cancel: 'キャンセル',
        
        /* constraints */
        section_constraint: '制約',
        constraint_type: 'タイプ',
        constraint_date: '日付',
        
        /* resource control */
        section_owner: '担当者',
        section_progress: '進捗'
      }
    };

    // ガントチャート設定
    (gantt as any).config.date_format = '%Y-%m-%d';
    (gantt as any).config.scale_height = 60;
    (gantt as any).config.row_height = 40;
    (gantt as any).config.task_height = 24;
    (gantt as any).config.task_unscheduled = true;
    (gantt as any).config.show_progress = true;
    (gantt as any).config.drag_progress = true;
    (gantt as any).config.drag_resize = true;
    (gantt as any).config.drag_move = true;
    (gantt as any).config.details_on_dblclick = true;
    (gantt as any).config.sort = true;

    // 列設定
    (gantt as any).config.columns = [
      {name: 'text', label: 'タスク名', width: 200, tree: true},
      {name: 'start_date', label: '開始日', width: 100, align: 'center'},
      {name: 'duration', label: '期間', width: 80, align: 'center'},
      {name: 'progress', label: '進捗', width: 80, align: 'center', template: (task: any) => `${Math.round(task.progress * 100)}%`},
      {name: 'add', label: '', width: 44}
    ];

    // スケール設定（月表示）
    (gantt as any).config.scales = [
      {unit: 'month', step: 1, format: '%Y年%m月'},
      {unit: 'day', step: 1, format: '%d'}
    ];

    // カスタムテンプレート
    (gantt as any).templates.task_class = function(start: any, end: any, task: any) {
      let css = '';
      
      // 親タスクのスタイル
      if ((gantt as any).hasChild(task.id)) {
        css += ' gantt-parent-task';
      }
      
      // ステータスに応じたスタイル
      switch (task.status) {
        case 'completed':
          css += ' gantt-task-completed';
          break;
        case 'in_progress':
          css += ' gantt-task-in-progress';
          break;
        case 'on_hold':
          css += ' gantt-task-on-hold';
          break;
        default:
          css += ' gantt-task-not-started';
      }

      // 選択中のタスク
      if (task.id === selectedTaskId) {
        css += ' gantt-task-selected';
      }

      return css;
    };

    // タスククリック時のイベント
    (gantt as any).attachEvent('onTaskClick', function(id: any, e: any) {
      const task = (gantt as any).getTask(id);
      const originalTask = tasks.find(t => t.id.toString() === id);
      if (originalTask && onTaskSelect) {
        onTaskSelect(originalTask);
      }
      return true;
    });

    // タスク更新時のイベント
    (gantt as any).attachEvent('onAfterTaskUpdate', function(id: any, task: any) {
      const originalTask = tasks.find(t => t.id.toString() === id);
      if (originalTask && onTaskUpdate) {
        const updates: Partial<Task> = {
          name: task.text,
          planned_start_date: (gantt as any).date.date_to_str('%Y-%m-%d')(task.start_date),
          planned_end_date: (gantt as any).date.date_to_str('%Y-%m-%d')(task.end_date),
          progress_rate: Math.round(task.progress * 100)
        };
        onTaskUpdate(originalTask.id, updates);
      }
    });

    // タスク削除時のイベント
    (gantt as any).attachEvent('onBeforeTaskDelete', function(id: any, task: any) {
      const taskId = parseInt(id.toString());
      TaskService.deleteTask(taskId)
        .then(() => {
          addNotification('success', 'タスクが削除されました');
        })
        .catch((error) => {
          console.error('Task delete failed:', error);
          addNotification('error', 'タスクの削除に失敗しました');
          return false; // キャンセル
        });
      return true;
    });

    // ガントチャート初期化
    (gantt as any).init(ganttRef.current);
    isInitialized.current = true;

    return () => {
      if (isInitialized.current) {
        (gantt as any).clearAll();
        isInitialized.current = false;
      }
    };
  }, []);

  // タスクデータを dhtmlx-gantt 形式に変換
  useEffect(() => {
    if (!isInitialized.current) return;

    const ganttTasks = tasks.map(task => {
      const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
      const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // 期間を日数で計算
      const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: task.id,
        text: task.name,
        start_date: startDate,
        duration: duration,
        progress: task.progress_rate / 100,
        parent: task.parent_task_id || 0,
        priority: task.priority,
        status: task.status,
        type: (gantt as any).hasChild(task.id) ? 'project' : 'task',
        open: true // デフォルトで展開
      };
    });

    // 依存関係データを取得・設定
    TaskService.getTaskDependenciesForGantt(projectId)
      .then(response => {
        if (response.success && response.data?.dependencies) {
          const links = response.data.dependencies.map((dep: any, index: number) => ({
            id: dep.id || index + 1,
            source: dep.predecessor_id,
            target: dep.successor_id,
            type: dep.dependency_type === 'finish_to_start' ? '0' : '1'
          }));

          (gantt as any).parse({
            data: ganttTasks,
            links: links
          });
        } else {
          (gantt as any).parse({
            data: ganttTasks,
            links: []
          });
        }
      })
      .catch(error => {
        console.error('Failed to load dependencies:', error);
        (gantt as any).parse({
          data: ganttTasks,
          links: []
        });
      });
  }, [tasks, projectId]);

  return (
    <div className={`dhtmlx-gantt-container ${className}`}>
      <div ref={ganttRef} style={{ width: '100%', height: '100%', minHeight: '500px' }} />
      
      <style jsx global>{`
        /* DHtmlX Gantt カスタムスタイル */
        .gantt-parent-task .gantt_task_line {
          background-color: #6366f1 !important;
        }
        
        .gantt-task-completed .gantt_task_line {
          background-color: #10b981 !important;
        }
        
        .gantt-task-in-progress .gantt_task_line {
          background-color: #f59e0b !important;
        }
        
        .gantt-task-on-hold .gantt_task_line {
          background-color: #ef4444 !important;
        }
        
        .gantt-task-not-started .gantt_task_line {
          background-color: #94a3b8 !important;
        }
        
        .gantt-task-selected .gantt_task_line {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        
        .gantt_grid_scale .gantt_grid_head_cell,
        .gantt_task_scale .gantt_scale_cell {
          background-color: #f8fafc !important;
          color: #374151 !important;
          font-weight: 600 !important;
        }
        
        .gantt_task .gantt_task_content {
          font-size: 13px !important;
        }
        
        .gantt_today .gantt_task_scale .gantt_scale_cell {
          background-color: rgba(239, 68, 68, 0.1) !important;
        }
        
        .gantt_row.odd {
          background-color: #f9fafb !important;
        }
        
        .gantt_row:hover {
          background-color: #f3f4f6 !important;
        }
      `}</style>
    </div>
  );
};