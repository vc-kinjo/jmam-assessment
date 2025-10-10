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
  id: string;
  name: string;
  description?: string;
  estimated_hours: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  is_milestone: boolean;
  dependencies: TaskDependencyTemplate[];
  sort_order: number;
  start_offset_days: number;
  duration_days: number;
}

export interface TaskDependencyTemplate {
  predecessor_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
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
  priority: 'high' | 'medium' | 'low';
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
      {
        id: 't1',
        name: '要件定義',
        description: 'プロジェクトの要件を明確にし、機能仕様を決定する',
        duration_days: 5,
        start_offset_days: 0,
        estimated_hours: 40,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 1
      },
      {
        id: 't2',
        name: 'システム設計',
        description: 'アーキテクチャとデータベース設計を行う',
        duration_days: 7,
        start_offset_days: 5,
        estimated_hours: 56,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 2
      },
      {
        id: 't3',
        name: 'フロントエンド開発',
        description: 'ユーザーインターフェースの実装',
        duration_days: 14,
        start_offset_days: 12,
        estimated_hours: 112,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 3
      },
      {
        id: 't4',
        name: 'バックエンド開発',
        description: 'API とビジネスロジックの実装',
        duration_days: 14,
        start_offset_days: 12,
        estimated_hours: 112,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 4
      },
      {
        id: 't5',
        name: '結合テスト',
        description: 'フロントエンドとバックエンドの統合テスト',
        duration_days: 5,
        start_offset_days: 26,
        estimated_hours: 40,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 5
      },
      {
        id: 't6',
        name: 'リリース',
        description: 'プロダクション環境へのデプロイ',
        duration_days: 2,
        start_offset_days: 31,
        estimated_hours: 16,
        priority: 'high' as const,
        is_milestone: true,
        dependencies: [],
        sort_order: 6
      },
    ]
  },
  {
    name: 'モバイルアプリ開発',
    category: 'mobile_development',
    description: 'iOSとAndroidアプリ開発のテンプレート',
    tags: ['モバイル', 'iOS', 'Android', 'ストア'],
    tasks: [
      {
        id: 't1',
        name: '企画・設計',
        description: 'アプリの企画とUI/UX設計',
        duration_days: 7,
        start_offset_days: 0,
        estimated_hours: 56,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 1
      },
      {
        id: 't2',
        name: 'UIデザイン',
        description: 'アプリのビジュアルデザインとプロトタイプ作成',
        duration_days: 10,
        start_offset_days: 7,
        estimated_hours: 80,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 2
      },
      {
        id: 't3',
        name: 'iOS開発',
        description: 'iOSアプリケーションの開発',
        duration_days: 21,
        start_offset_days: 17,
        estimated_hours: 168,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 3
      },
      {
        id: 't4',
        name: 'Android開発',
        description: 'Androidアプリケーションの開発',
        duration_days: 21,
        start_offset_days: 17,
        estimated_hours: 168,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 4
      },
      {
        id: 't5',
        name: 'テスト',
        description: '両プラットフォームでの動作テスト',
        duration_days: 7,
        start_offset_days: 38,
        estimated_hours: 56,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 5
      },
      {
        id: 't6',
        name: 'ストア申請',
        description: 'App StoreとGoogle Playへの申請',
        duration_days: 3,
        start_offset_days: 45,
        estimated_hours: 24,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 6
      },
      {
        id: 't7',
        name: 'リリース',
        description: 'アプリストアでの公開',
        duration_days: 1,
        start_offset_days: 48,
        estimated_hours: 8,
        priority: 'high' as const,
        is_milestone: true,
        dependencies: [],
        sort_order: 7
      },
    ]
  },
  {
    name: 'イベント企画',
    category: 'event',
    description: '企業イベント・セミナー企画のテンプレート',
    tags: ['イベント', '企画', '運営', 'マーケティング'],
    tasks: [
      {
        id: 't1',
        name: '企画立案',
        description: 'イベントのコンセプトと目標設定',
        duration_days: 3,
        start_offset_days: 0,
        estimated_hours: 24,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 1
      },
      {
        id: 't2',
        name: '会場確保',
        description: 'イベント会場の予約と契約',
        duration_days: 5,
        start_offset_days: 3,
        estimated_hours: 16,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 2
      },
      {
        id: 't3',
        name: '講師依頼',
        description: '講演者への依頼と調整',
        duration_days: 7,
        start_offset_days: 3,
        estimated_hours: 28,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 3
      },
      {
        id: 't4',
        name: '宣伝・集客',
        description: 'マーケティングと参加者募集',
        duration_days: 21,
        start_offset_days: 10,
        estimated_hours: 84,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 4
      },
      {
        id: 't5',
        name: '準備作業',
        description: '会場設営と最終確認',
        duration_days: 3,
        start_offset_days: 28,
        estimated_hours: 24,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 5
      },
      {
        id: 't6',
        name: 'イベント開催',
        description: 'イベント当日の運営',
        duration_days: 1,
        start_offset_days: 31,
        estimated_hours: 8,
        priority: 'high' as const,
        is_milestone: true,
        dependencies: [],
        sort_order: 6
      },
      {
        id: 't7',
        name: '振り返り・報告',
        description: 'イベント結果の分析とレポート作成',
        duration_days: 2,
        start_offset_days: 32,
        estimated_hours: 16,
        priority: 'low' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 7
      },
    ]
  },
  {
    name: 'マーケティングキャンペーン',
    category: 'marketing',
    description: 'デジタルマーケティングキャンペーンのテンプレート',
    tags: ['マーケティング', 'デジタル', 'SNS', '広告'],
    tasks: [
      {
        id: 't1',
        name: '戦略策定',
        description: 'ターゲット分析とキャンペーン戦略の立案',
        duration_days: 5,
        start_offset_days: 0,
        estimated_hours: 40,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 1
      },
      {
        id: 't2',
        name: 'コンテンツ制作',
        description: '広告クリエイティブとコンテンツの制作',
        duration_days: 10,
        start_offset_days: 5,
        estimated_hours: 80,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 2
      },
      {
        id: 't3',
        name: 'キャンペーン設定',
        description: '各プラットフォームでのキャンペーン設定',
        duration_days: 3,
        start_offset_days: 15,
        estimated_hours: 24,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 3
      },
      {
        id: 't4',
        name: 'キャンペーン実行',
        description: 'キャンペーンの開始と運用',
        duration_days: 30,
        start_offset_days: 18,
        estimated_hours: 120,
        priority: 'high' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 4
      },
      {
        id: 't5',
        name: '効果測定・最適化',
        description: 'パフォーマンス分析と改善',
        duration_days: 7,
        start_offset_days: 48,
        estimated_hours: 28,
        priority: 'medium' as const,
        is_milestone: false,
        dependencies: [],
        sort_order: 5
      },
      {
        id: 't6',
        name: '結果報告',
        description: 'キャンペーン結果のレポート作成',
        duration_days: 3,
        start_offset_days: 55,
        estimated_hours: 24,
        priority: 'low' as const,
        is_milestone: true,
        dependencies: [],
        sort_order: 6
      },
    ]
  }
] as const;