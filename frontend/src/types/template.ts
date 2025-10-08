// プロジェクトテンプレート関連の型定義

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  usage_count: number;
  rating: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  id: string; // テンプレート内でのID
  name: string;
  description?: string;
  estimated_hours: number;
  priority: string;
  category?: string;
  is_milestone: boolean;
  dependencies: TaskDependencyTemplate[];
  sort_order: number;
  // 相対的な期間（日数）
  start_offset_days: number; // プロジェクト開始からの日数
  duration_days: number; // タスクの期間（日数）
}

export interface TaskDependencyTemplate {
  predecessor_id: string;
  dependency_type: string;
  lag_days: number;
}

export interface ProjectTemplateCreate {
  name: string;
  description?: string;
  category: string;
  tags: string[];
  is_public: boolean;
  tasks: TemplateTaskCreate[];
}

export interface TemplateTaskCreate {
  id: string;
  name: string;
  description?: string;
  estimated_hours: number;
  priority: string;
  category?: string;
  is_milestone: boolean;
  start_offset_days: number;
  duration_days: number;
  dependencies: TaskDependencyTemplate[];
  sort_order: number;
}

export interface ProjectFromTemplate {
  template_id: number;
  project_name: string;
  project_description?: string;
  start_date: string;
  category?: string;
  adjustments?: TemplateAdjustment[];
}

export interface TemplateAdjustment {
  task_id: string;
  field: string;
  value: any;
}

// 定義済みテンプレートカテゴリ
export const TEMPLATE_CATEGORIES = [
  { value: 'software_development', label: 'ソフトウェア開発' },
  { value: 'web_development', label: 'Web開発' },
  { value: 'mobile_development', label: 'モバイル開発' },
  { value: 'infrastructure', label: 'インフラ構築' },
  { value: 'marketing', label: 'マーケティング' },
  { value: 'research', label: '調査・研究' },
  { value: 'event', label: 'イベント企画' },
  { value: 'product_launch', label: '製品リリース' },
  { value: 'construction', label: '建設・工事' },
  { value: 'general', label: '一般' },
] as const;

// よく使用されるタグ
export const COMMON_TEMPLATE_TAGS = [
  'アジャイル',
  'ウォーターフォール',
  'スクラム',
  'DevOps',
  'CI/CD',
  'テスト',
  'デザイン',
  'ドキュメント',
  '品質管理',
  'リリース',
  '保守',
  '運用',
  'セキュリティ',
  'パフォーマンス',
  'バックアップ',
] as const;

// 定義済みテンプレート（サンプル）
export const PREDEFINED_TEMPLATES = [
  {
    name: 'Webアプリケーション開発',
    category: 'web_development',
    description: '一般的なWebアプリケーション開発のテンプレート',
    tags: ['Web開発', 'フロントエンド', 'バックエンド', 'テスト'],
    tasks: [
      { id: 't1', name: '要件定義', duration_days: 5, start_offset_days: 0 },
      { id: 't2', name: '設計', duration_days: 7, start_offset_days: 5 },
      { id: 't3', name: 'フロントエンド開発', duration_days: 14, start_offset_days: 12 },
      { id: 't4', name: 'バックエンド開発', duration_days: 14, start_offset_days: 12 },
      { id: 't5', name: '結合テスト', duration_days: 5, start_offset_days: 26 },
      { id: 't6', name: 'リリース', duration_days: 2, start_offset_days: 31, is_milestone: true },
    ]
  },
  {
    name: 'モバイルアプリ開発',
    category: 'mobile_development',
    description: 'iOSとAndroidアプリ開発のテンプレート',
    tags: ['モバイル', 'iOS', 'Android', 'ストア'],
    tasks: [
      { id: 't1', name: '企画・設計', duration_days: 7, start_offset_days: 0 },
      { id: 't2', name: 'UIデザイン', duration_days: 10, start_offset_days: 7 },
      { id: 't3', name: 'iOS開発', duration_days: 21, start_offset_days: 17 },
      { id: 't4', name: 'Android開発', duration_days: 21, start_offset_days: 17 },
      { id: 't5', name: 'テスト', duration_days: 7, start_offset_days: 38 },
      { id: 't6', name: 'ストア申請', duration_days: 3, start_offset_days: 45 },
      { id: 't7', name: 'リリース', duration_days: 1, start_offset_days: 48, is_milestone: true },
    ]
  },
  {
    name: 'イベント企画',
    category: 'event',
    description: '企業イベント・セミナー企画のテンプレート',
    tags: ['イベント', '企画', '運営', 'マーケティング'],
    tasks: [
      { id: 't1', name: '企画立案', duration_days: 3, start_offset_days: 0 },
      { id: 't2', name: '会場確保', duration_days: 5, start_offset_days: 3 },
      { id: 't3', name: '講師依頼', duration_days: 7, start_offset_days: 3 },
      { id: 't4', name: '宣伝・集客', duration_days: 21, start_offset_days: 10 },
      { id: 't5', name: '準備作業', duration_days: 3, start_offset_days: 28 },
      { id: 't6', name: 'イベント開催', duration_days: 1, start_offset_days: 31, is_milestone: true },
      { id: 't7', name: '振り返り・報告', duration_days: 2, start_offset_days: 32 },
    ]
  }
] as const;