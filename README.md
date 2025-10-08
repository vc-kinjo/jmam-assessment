# Gunchart - プロジェクト管理システム

BFFアーキテクチャを採用したモダンなプロジェクト・タスク管理システムです。

## システム構成

```
Frontend (Next.js) → BFF (FastAPI) → Backend (FastAPI) → PostgreSQL
                           ↓
                      Redis (Session)
```

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **BFF**: Python, FastAPI, Redis
- **バックエンド**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **データベース**: PostgreSQL 15
- **キャッシュ**: Redis

## 開発環境セットアップ

### 前提条件

- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### 1. リポジトリクローン

```bash
git clone <repository-url>
cd gunchart_app
```

### 2. 環境ファイル設定

```bash
cp .env.example .env
```

### 3. 依存関係インストール

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt

# BFF
cd ../bff
pip install -r requirements.txt
```

### 4. データベース初期化

```bash
# PostgreSQL & Redis をDockerで起動
docker-compose up -d postgres redis

# データベースマイグレーション（初回のみ）
cd backend
alembic upgrade head

# 初期データ作成
python app/database/seeds.py
```

### 5. 開発サーバー起動

#### 方法1: 自動スクリプト（Windows）
```bash
./dev-scripts/start-dev.bat
```

#### 方法2: 手動起動
```bash
# Terminal 1: Backend API
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 2: BFF API
cd bff
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 6. アクセス

- **Frontend**: http://localhost:3000
- **BFF API**: http://localhost:8001
- **Backend API**: http://localhost:8002

## デフォルトアカウント

```
ユーザー名: admin
パスワード: admin123
```

## 開発状況

### ✅ 完了済み (Phase 1)

- [x] プロジェクト構造初期化
- [x] データベース基盤構築
- [x] Backend認証システム
- [x] BFF認証レイヤー
- [x] フロントエンド認証システム
- [x] ログイン/ログアウト機能
- [x] ダッシュボード基本画面

### 🚧 開発予定

- [ ] プロジェクト管理機能
- [ ] タスク管理機能
- [ ] ガントチャート機能
- [ ] 通知システム
- [ ] レポート機能

## API仕様

### BFF API Endpoints

- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `POST /api/v1/auth/me` - 現在のユーザー情報取得
- `POST /api/v1/users/profile/get` - プロフィール取得
- `POST /api/v1/users/profile/update` - プロフィール更新

## データベーススキーマ

### users テーブル
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password_hash
- full_name
- furigana
- phone_number
- company
- department
- role_level (admin/manager/member)
- is_active
- created_at
- updated_at

## 開発ガイドライン

1. **仕様駆動開発**を採用
2. **BFFアーキテクチャ**の原則に従う
3. **全POST通信**でフロントエンド-BFF間通信
4. **TypeScript**での型安全性確保
5. **セキュリティ**を最優先に考慮

## トラブルシューティング

### ポート競合エラー
- 8001, 8002, 3000ポートが使用されていないか確認
- `netstat -an | findstr :8001` でポート確認

### データベース接続エラー
- PostgreSQLコンテナが起動しているか確認
- `docker-compose ps` でサービス状態確認

### セッションエラー
- Redisコンテナが起動しているか確認
- ブラウザのLocal Storageをクリア

## ライセンス

MIT License