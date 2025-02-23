---
title: "開発環境セットアップガイド"
last_updated: "2025-02-23"
version: "1.0"
status: "draft"
related_docs:
  - "../development/coding-rules.md"
  - "../operations/deployment.md"
---

# 開発環境セットアップガイド

## 前提条件

### 必要なツール
- Node.js 18.x以上
- Python 3.9以上
- Docker Desktop
- Google Cloud SDK
- Firebase CLI

### アカウント設定
- Google Cloudアカウント
- Firebase プロジェクト
- ローカル開発用の認証情報

## 環境構築手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/[your-org]/gcloud-ocr-manager.git
cd gcloud-ocr-manager
```

### 2. バックエンド環境設定

```bash
cd backend
cp .env.example .env
# .envファイルに必要な環境変数を設定
```

必要な環境変数：
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_CONFIG`

### 3. フロントエンド環境設定

```bash
cd frontend
npm install
```

### 4. ローカルエミュレータの設定

```bash
firebase init emulators
```

必要なエミュレータ：
- Authentication
- Firestore
- Functions

### 5. Docker環境の準備

```bash
docker-compose up -d
```

## 動作確認

### 1. バックエンドサービス起動
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 2. フロントエンド開発サーバー起動
```bash
cd frontend
npm run dev
```

### 3. エミュレータ起動
```bash
firebase emulators:start
```

## トラブルシューティング

### よくある問題と解決方法

1. 認証エラー
   - 認証情報の配置確認
   - 権限の確認

2. 依存関係エラー
   - パッケージの更新
   - キャッシュのクリア

3. ポート競合
   - 使用中のポートの確認
   - ポート番号の変更

## 開発用コマンド一覧

### テスト実行
```bash
# バックエンドテスト
cd backend
pytest

# フロントエンドテスト
cd frontend
npm test
```

### リント実行
```bash
# バックエンド
cd backend
flake8

# フロントエンド
cd frontend
npm run lint
```
