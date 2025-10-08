# Gunchart - 新プロジェクト構成

React + Vite フロントエンド、Django バックエンド、PostgreSQL データベースの3層構成に変更されました。

## 新システム構成

```
Frontend (React + Vite) → Backend (Django REST) → PostgreSQL
```

## 技術スタック

- **フロントエンド**: React 18, Vite, TypeScript, Tailwind CSS
- **バックエンド**: Django 4.2, Django REST Framework, PostgreSQL
- **データベース**: PostgreSQL 15
- **インフラ**: Docker, Docker Compose, Nginx

## ディレクトリ構造

```
.
├── frontend_new/          # React + Vite フロントエンド
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── backend_new/           # Django バックエンド
│   ├── project/           # Django プロジェクト設定
│   ├── apps/              # Djangoアプリケーション
│   │   ├── users/         # ユーザー管理
│   │   ├── projects/      # プロジェクト管理
│   │   └── tasks/         # タスク管理
│   ├── requirements.txt
│   ├── manage.py
│   └── Dockerfile
├── database_new/          # データベース初期化
│   └── init.sql
├── nginx/                 # Nginx設定
│   └── nginx.prod.conf
├── docker-compose.yml     # 開発環境
├── docker-compose.prod.yml    # 本番環境
└── .env.new              # 環境変数設定
```

## 開発環境セットアップ

### 前提条件

- Docker & Docker Compose
- Git

### 1. 環境ファイル設定

```bash
cp .env.new .env
# 必要に応じて .env ファイルを編集
```

### 2. 開発環境起動

```bash
# 開発環境を起動
docker-compose -f docker-compose.new.yml up --build

# バックグラウンドで起動
docker-compose -f docker-compose.new.yml up -d --build
```

### 3. データベースマイグレーション

```bash
# Djangoマイグレーション
docker-compose -f docker-compose.new.yml exec backend python manage.py migrate

# 管理者ユーザー作成
docker-compose -f docker-compose.new.yml exec backend python manage.py createsuperuser
```

### 4. アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:8000/api
- **Django管理画面**: http://localhost:8000/admin

## 本番環境デプロイ

### 1. 環境変数設定

```bash
# 本番用環境変数を設定
export SECRET_KEY="your-production-secret-key"
export DB_PASSWORD="your-production-db-password"
export ALLOWED_HOSTS="yourdomain.com,www.yourdomain.com"
```

### 2. SSL証明書設置

```bash
# SSL証明書を nginx/ssl/ ディレクトリに配置
mkdir -p nginx/ssl
cp cert.pem nginx/ssl/
cp key.pem nginx/ssl/
```

### 3. 本番環境起動

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## APIエンドポイント

### 認証

- `POST /api/auth/login/` - ログイン
- `POST /api/auth/refresh/` - トークンリフレッシュ

### ユーザー

- `GET /api/auth/users/` - ユーザー一覧
- `POST /api/auth/users/` - ユーザー作成
- `GET /api/auth/users/me/` - 現在のユーザー情報

### プロジェクト

- `GET /api/projects/` - プロジェクト一覧
- `POST /api/projects/` - プロジェクト作成
- `GET /api/projects/{id}/` - プロジェクト詳細

### タスク

- `GET /api/tasks/` - タスク一覧
- `POST /api/tasks/` - タスク作成
- `GET /api/tasks/{id}/` - タスク詳細

## データベースモデル

### User (ユーザー)
- Django標準のユーザーモデルを拡張
- 権限レベル、部署、フリガナなどの追加フィールド

### Project (プロジェクト)
- プロジェクト基本情報
- 開始・終了日、ステータス、カテゴリ

### Task (タスク)
- タスク詳細情報
- 階層構造サポート（親子関係）
- 進捗率、優先度、マイルストーン

### TaskDependency (タスク依存関係)
- タスク間の依存関係
- 複数の依存タイプサポート

## 開発ガイドライン

### フロントエンド

1. **コンポーネント作成**: `src/components/` に機能別ディレクトリ作成
2. **API通信**: `src/services/` にAPIクライアント作成
3. **スタイル**: Tailwind CSSを使用
4. **型定義**: `src/types/` にTypeScript型定義

### バックエンド

1. **新機能追加**: `apps/` に新しいDjangoアプリ作成
2. **APIエンドポイント**: Django REST Frameworkを使用
3. **認証**: JWT認証を使用
4. **データベース**: PostgreSQLを使用

## トラブルシューティング

### ポート競合

```bash
# 使用中のポートを確認
sudo lsof -i :5173
sudo lsof -i :8000
sudo lsof -i :5432
```

### データベース接続エラー

```bash
# コンテナの状態確認
docker-compose ps

# ログの確認
docker-compose logs db
docker-compose logs backend
```

### フロントエンドビルドエラー

```bash
# node_modules を再インストール
docker-compose exec frontend npm install

# キャッシュクリア
docker-compose exec frontend npm run dev -- --force
```

## 旧構成からの移行

### 1. データ移行

旧構成のBFFとバックエンドからDjangoに移行する場合：

```bash
# 既存データのエクスポート（旧環境）
python bff/data_export.py

# Djangoにインポート（新環境）
python backend_new/manage.py loaddata exported_data.json
```

### 2. 機能の移行優先順位

1. ✅ ユーザー認証システム
2. ✅ プロジェクト・タスク基本CRUD
3. 🚧 ガントチャート機能
4. 🚧 ファイルアップロード
5. 🚧 通知システム
6. 🚧 レポート機能

## 今後の開発予定

- [ ] ガントチャートライブラリ統合
- [ ] リアルタイム通知（WebSocket）
- [ ] ファイル添付機能
- [ ] プロジェクトテンプレート
- [ ] レポート・エクスポート機能
- [ ] モバイル対応

## ライセンス

MIT License