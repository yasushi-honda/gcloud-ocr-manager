---
title: "デプロイメントガイド"
last_updated: "2025-02-23"
version: "1.0"
status: "draft"
related_docs:
  - "../operations/monitoring.md"
  - "../architecture/overview.md"
---

# デプロイメントガイド

## デプロイメントフロー

### 1. 準備作業

#### 環境変数の設定
```bash
# 本番環境用の環境変数を設定
gcloud secrets create ocr-manager-env --data-file=.env.prod
```

#### サービスアカウントの設定
- OCR処理用サービスアカウント
- Firestore操作用サービスアカウント
- BigQuery操作用サービスアカウント

### 2. インフラストラクチャのデプロイ

#### Cloud Storage
```bash
# バケットの作成
gsutil mb -l asia-northeast1 gs://[PROJECT_ID]-ocr-files
```

#### Firestore
```bash
# インデックスの作成
firebase deploy --only firestore:indexes
```

#### BigQuery
```bash
# データセットとテーブルの作成
bq mk --dataset [PROJECT_ID]:ocr_manager
bq mk --table [PROJECT_ID]:ocr_manager.documents schema.json
```

### 3. アプリケーションのデプロイ

#### バックエンド
```bash
# Cloud Runへのデプロイ
gcloud run deploy ocr-manager-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

#### フロントエンド
```bash
# Firebase Hostingへのデプロイ
firebase deploy --only hosting
```

#### Cloud Functions
```bash
# Functionsのデプロイ
firebase deploy --only functions
```

## ロールバック手順

### 1. アプリケーションのロールバック
```bash
# 特定バージョンへのロールバック
gcloud run services update-traffic ocr-manager-backend \
  --to-revisions=REVISION_NAME=100
```

### 2. データベースのロールバック
- Firestoreのバックアップからの復元
- BigQueryのスナップショットからの復元

## 監視設定

### Cloud Monitoring
- CPU使用率
- メモリ使用率
- リクエスト数
- エラー率

### アラート設定
```yaml
# アラートポリシー
displayName: "OCR処理エラー率"
conditions:
  - displayName: "エラー率が10%を超過"
    condition:
      threshold: 10
      aggregations:
        - alignmentPeriod: 300s
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_RATE
```

## セキュリティ設定

### ファイアウォール
- 許可するIPアドレス範囲
- 必要なポートの開放

### IAM
- 最小権限の原則に基づく権限設定
- サービスアカウントの定期的な監査

## バックアップ設定

### 自動バックアップ
- Firestoreの日次バックアップ
- BigQueryのテーブルスナップショット
- Cloud Storageのバージョニング

### リストア手順
1. バックアップの選択
2. リストア先の指定
3. 整合性の確認
