# ガントチャートアプリ セットアップガイド

## 概要

React + Vite + Django + PostgreSQL 構成のガントチャートアプリケーションです。
oldディレクトリの機能を新しいアーキテクチャに移行しました。

## 技術スタック

- **フロントエンド**: React 19, Vite 7, TypeScript, Tailwind CSS
- **バックエンド**: Django 4.2, Django REST Framework, PostgreSQL
- **状態管理**: Zustand, React Query
- **ガントチャート**: DHtmlX Gantt
- **認証**: JWT (SimpleJWT)

## 開発環境セットアップ

### 前提条件

- Node.js 18+
- Python 3.8+
- PostgreSQL 12+
- Git

### 1. リポジトリクローン

```bash
git clone <repository-url>
cd jmam-assessment
```

### 2. バックエンド設定

```bash
# 仮想環境作成（推奨）
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# データベース設定（PostgreSQL）
# .env ファイルを作成して以下を設定：
# SECRET_KEY=your-secret-key
# DB_NAME=gunchart_db
# DB_USER=postgres
# DB_PASSWORD=your-password
# DB_HOST=localhost
# DB_PORT=5432
# DEBUG=True

# マイグレーション実行
python manage.py makemigrations
python manage.py migrate

# 管理者ユーザー作成
python manage.py createsuperuser
# または create_admin.py を使用
python create_admin.py
```

### 3. フロントエンド設定

```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動前に型チェック
npm run build  # 初回のみ
```

### 4. 開発サーバー起動

#### ターミナル1: Django バックエンド
```bash
cd backend
source venv/bin/activate  # 必要に応じて
python manage.py runserver 8000
```

#### ターミナル2: React フロントエンド
```bash
cd frontend
npm run dev
```

### 5. アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:8000/api
- **Django管理画面**: http://localhost:8000/admin

### デフォルトログイン情報

```
ユーザー名: admin
パスワード: admin123
```

## 本番環境デプロイ

### Docker Compose を使用

```bash
# 本番用 Docker Compose ファイルを使用
docker-compose -f docker-compose.prod.yml up -d --build

# データベースマイグレーション
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 管理者ユーザー作成
docker-compose -f docker-compose.prod.yml exec backend python create_admin.py
```

### 環境変数設定

本番環境では以下の環境変数を設定してください：

```bash
# Django
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_NAME=gunchart_prod
DB_USER=gunchart_user
DB_PASSWORD=secure-password
DB_HOST=db
DB_PORT=5432

# PostgreSQL
POSTGRES_DB=gunchart_prod
POSTGRES_USER=gunchart_user
POSTGRES_PASSWORD=secure-password
```

## API エンドポイント

### 認証
- `POST /api/auth/auth/login/` - ログイン
- `POST /api/auth/auth/logout/` - ログアウト
- `GET /api/auth/users/me/` - 現在のユーザー情報

### プロジェクト
- `GET /api/projects/` - プロジェクト一覧
- `POST /api/projects/` - プロジェクト作成
- `GET /api/projects/{id}/` - プロジェクト詳細
- `PUT /api/projects/{id}/` - プロジェクト更新
- `DELETE /api/projects/{id}/` - プロジェクト削除

### タスク
- `GET /api/tasks/` - タスク一覧
- `POST /api/tasks/` - タスク作成
- `GET /api/tasks/{id}/` - タスク詳細
- `PUT /api/tasks/{id}/` - タスク更新
- `DELETE /api/tasks/{id}/` - タスク削除

### ガントチャート
- `GET /api/tasks/gantt_data/?project_id={id}` - ガントチャート用データ
- `POST /api/tasks/{id}/update_schedule/` - スケジュール更新

## 機能概要

### ✅ 実装済み機能

1. **認証システム**
   - JWT認証
   - ユーザー管理
   - 権限制御

2. **プロジェクト管理**
   - プロジェクト CRUD
   - メンバー管理
   - 権限管理

3. **タスク管理**
   - 階層タスク（最大4レベル）
   - 依存関係
   - 担当者割り当て
   - コメント・添付ファイル

4. **ガントチャート**
   - DHtmlX Gantt 統合
   - ドラッグ&ドロップ
   - リアルタイム更新
   - 日本語ローカライゼーション

5. **UI/UX**
   - レスポンシブデザイン
   - Tailwind CSS
   - ダークモード対応（部分的）

### 🚧 今後の拡張予定

1. **プロジェクト・タスク一覧ページ**
2. **詳細編集フォーム**
3. **通知システム**
4. **レポート機能**
5. **ファイル管理強化**
6. **リアルタイム通信（WebSocket）**

## oldディレクトリからの移行

### 主な変更点

1. **アーキテクチャ**
   - BFF 除去：Next.js + FastAPI BFF + FastAPI → React + Vite + Django
   - シンプルな3層構成に変更

2. **技術スタック**
   - Next.js → React + Vite
   - FastAPI → Django REST Framework
   - Redis セッション → JWT認証

3. **状態管理**
   - Zustand persist → Zustand + React Query
   - BFF API → 直接 Django API

### データ移行

oldディレクトリからのデータ移行が必要な場合：

```bash
# 既存データのエクスポート（oldディレクトリで実行）
cd old
python bff/data_export.py  # スクリプト作成が必要

# 新環境にインポート
cd backend
python manage.py loaddata exported_data.json
```

## トラブルシューティング

### よくある問題

1. **ポート競合**
```bash
# ポート使用状況確認
lsof -i :5173  # Vite
lsof -i :8000  # Django
lsof -i :5432  # PostgreSQL
```

2. **データベース接続エラー**
```bash
# PostgreSQL サービス確認
systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# データベース作成
psql -U postgres
CREATE DATABASE gunchart_db;
```

3. **フロントエンド依存関係エラー**
```bash
# node_modules 再インストール
rm -rf node_modules package-lock.json
npm install
```

4. **Django マイグレーションエラー**
```bash
# マイグレーションリセット
python manage.py migrate --fake-initial
python manage.py makemigrations
python manage.py migrate
```

### パフォーマンス最適化

1. **フロントエンド**
   - React Query キャッシュ設定
   - コンポーネント最適化
   - バンドルサイズ削減

2. **バックエンド**
   - Django ORM クエリ最適化
   - データベースインデックス
   - ページネーション

## ライセンス

MIT License

## サポート

問題が発生した場合は、以下を確認してください：

1. このセットアップガイド
2. Django/React の公式ドキュメント
3. DHtmlX Gantt ドキュメント
4. 各ライブラリの Issue トラッカー