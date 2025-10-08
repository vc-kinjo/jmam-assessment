# プロジェクトのセットアップ: build → up の順に実行
install:
	@make build-no-cache
	@make up

# コンテナをバックグラウンドで起動
up:
	docker compose up -d

# Dockerイメージを再ビルド
build:
	docker compose build

# Dockerイメージをキャッシュなしで再ビルド
build-no-cache:
	docker compose build --no-cache

# 環境の再構築: destroy → install の順に実行
remake:
	@make destroy
	@make install

# コンテナを停止（削除はしない）
stop:
	docker compose stop

# コンテナを停止して削除（ネットワークなどの孤立リソースも削除）
down:
	docker compose down --remove-orphans

# コンテナ・ボリュームを含めて完全削除
down-v:
	docker compose down --remove-orphans --volumes

# コンテナの再起動（down → up）
restart:
	@make down
	@make up

# コンテナ・イメージ・ボリュームをすべて削除（クリーン状態へ）
destroy:
	docker compose down --rmi all --volumes --remove-orphans

# 現在のコンテナの状態を表示
ps:
	docker compose ps

# 全コンテナのログを表示
logs:
	docker compose logs

# 全コンテナのログをリアルタイム表示（tail -fのような動作）
logs-watch:
	docker compose logs --follow

# 各サービス別ログ（単発表示 / 監視モード）
log-app:
	docker compose logs app

log-app-watch:
	docker compose logs --follow app

log-api:
	docker compose logs api

log-api-watch:
	docker compose logs --follow api

log-web:
	docker compose logs web

log-web-watch:
	docker compose logs --follow web

log-db:
	docker compose logs db

log-db-watch:
	docker compose logs --follow db

# 各サービスに bash でログイン
app-bash:
	docker compose exec -it app bash

api-bash:
	docker compose exec -it api bash

web-bash:
	docker compose exec -it web bash

# Djangoアプリケーションのマイグレーション用：makemigrations
makemigrations:
	docker compose exec api python manage.py makemigrations

# Djangoアプリケーションのマイグレーション実行
migrate:
	docker compose exec api python manage.py migrate

# makemigrations と migrate をまとめて実行したい場合
migrate-all:
	@make makemigrations
	@make migrate

# DBコンテナに bash でログイン
db-bash:
	docker compose exec -it db bash

# DBに対話モードでPostgreSQLに接続（.envの環境変数を使用）
sql:
	docker compose exec -it db bash -c ' psql -U postgres -d gunchart_db'

pytest:
	docker compose exec api pytest