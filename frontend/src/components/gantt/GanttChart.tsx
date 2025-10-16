import React, { useEffect, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { Task } from '../../types/index';

interface GanttChartProps {
  projectId: number;
  tasks: any[];
  links: any[];
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskCreate?: (task: Partial<Task>) => void;
  onTaskDelete?: (taskId: number) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  tasks,
  links,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
}) => {
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ganttRef.current) {
      // ガントチャートの初期設定
      gantt.config.date_format = '%Y-%m-%d';
      gantt.config.scale_unit = 'day';
      gantt.config.date_scale = '%d/%m';
      gantt.config.step = 1;
      gantt.config.duration_unit = 'day';

      // 日本語設定
      gantt.locale = {
        date: {
          month_full: [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
          ],
          month_short: [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
          ],
          day_full: [
            '日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'
          ],
          day_short: ['日', '月', '火', '水', '木', '金', '土']
        },
        labels: {
          new_task: '新しいタスク',
          icon_save: '保存',
          icon_cancel: 'キャンセル',
          icon_details: '詳細',
          icon_edit: '編集',
          icon_delete: '削除',
          confirm_closing: '',
          confirm_deleting: 'タスクを削除しますか？',
          section_description: '説明',
          section_time: '期間',
          section_type: 'タイプ',
          column_text: 'タスク名',
          column_start_date: '開始日',
          column_duration: '期間',
          column_add: '',
          link: 'リンク',
          confirm_link_deleting: 'リンクを削除しますか？',
          link_start: '開始',
          link_end: '終了',
          type_task: 'タスク',
          type_project: 'プロジェクト',
          type_milestone: 'マイルストーン',
          minutes: '分',
          hours: '時間',
          days: '日',
          weeks: '週',
          months: '月',
          years: '年'
        }
      };

      // カラム設定
      gantt.config.columns = [
        {
          name: 'text',
          label: 'タスク名',
          width: 200,
          tree: true
        },
        {
          name: 'start_date',
          label: '開始日',
          width: 100,
          align: 'center'
        },
        {
          name: 'duration',
          label: '期間',
          width: 60,
          align: 'center'
        },
        {
          name: 'progress',
          label: '進捗',
          width: 80,
          align: 'center',
          template: (task: any) => {
            return Math.round(task.progress * 100) + '%';
          }
        }
      ];

      // タスクテンプレート
      gantt.templates.task_class = function(start, end, task) {
        let css = '';
        if (task.type === 'milestone') {
          css += ' gantt-milestone';
        } else if (gantt.hasChild(task.id)) {
          css += ' gantt-parent-task';
        }

        // 優先度による色分け
        if (task.priority === 'high') {
          css += ' gantt-high-priority';
        } else if (task.priority === 'low') {
          css += ' gantt-low-priority';
        }

        return css;
      };

      // タスクテキストテンプレート
      gantt.templates.task_text = function(start, end, task) {
        const progress = Math.round(task.progress * 100);
        return `${task.text} (${progress}%)`;
      };

      // イベントハンドラー設定
      if (onTaskUpdate) {
        gantt.attachEvent('onAfterTaskUpdate', function(id, task) {
          const updates: Partial<Task> = {
            name: task.text,
            planned_start_date: gantt.date.date_to_str('%Y-%m-%d')(task.start_date),
            planned_end_date: gantt.date.date_to_str('%Y-%m-%d')(task.end_date),
            progress_rate: Math.round(task.progress * 100)
          };
          onTaskUpdate(parseInt(id), updates);
        });
      }

      if (onTaskCreate) {
        gantt.attachEvent('onAfterTaskAdd', function(id, task) {
          const newTask: Partial<Task> = {
            project: projectId,
            parent_task: task.parent ? parseInt(task.parent) : null,
            name: task.text,
            planned_start_date: gantt.date.date_to_str('%Y-%m-%d')(task.start_date),
            planned_end_date: gantt.date.date_to_str('%Y-%m-%d')(task.end_date),
            progress_rate: Math.round(task.progress * 100),
            is_milestone: task.type === 'milestone'
          };
          onTaskCreate(newTask);
        });
      }

      if (onTaskDelete) {
        gantt.attachEvent('onAfterTaskDelete', function(id) {
          onTaskDelete(parseInt(id));
        });
      }


      // ガントチャート初期化
      gantt.init(ganttRef.current);
    }

    return () => {
      if (ganttRef.current) {
        gantt.clearAll();
      }
    };
  }, [projectId]);

  // データ更新
  useEffect(() => {
    if (tasks && links) {
      gantt.clearAll();
      gantt.parse({
        data: tasks,
        links: links
      });
    }
  }, [tasks, links]);

  return (
    <div className="gantt-container">
      <div ref={ganttRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default GanttChart;