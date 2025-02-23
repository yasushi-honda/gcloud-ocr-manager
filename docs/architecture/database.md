---
title: "データベース設計仕様"
last_updated: "2025-02-23"
version: "1.0"
status: "draft"
related_docs:
  - "../architecture/overview.md"
  - "../operations/deployment.md"
---

# BigQuery × Firestore のハイブリッドデータ設計ドキュメント

## 📌 概要
本ドキュメントでは、BigQuery と Firestore を連携させた OCR ファイラーのデータ構造と運用方法について説明します。

- **Firestore:** マスターデータ管理・リアルタイム検索
- **BigQuery:** 大量データの保存・全文検索・分析
- **Cloud Functions:** Firestore と BigQuery のデータ同期（論理削除対応）

## データモデル

### Firestore コレクション

```typescript
interface AuthDomain {
  domain: string;         // 許可するドメイン（例：company.com）
  description: string;    // ドメインの説明
  is_active: boolean;     // 有効/無効フラグ
  created_at: Timestamp;  // 作成日時
  updated_at: Timestamp;  // 更新日時
}

interface Document {
  file_name: string;      // 原本ファイル名
  file_path: string;      // 保存パス
  content_type: string;   // MIMEタイプ
  ocr_text: string;      // OCR抽出テキスト
  metadata: {
    category: string;    // 文書カテゴリ
    tags: string[];      // 分類タグ
    confidence: number;  // OCR信頼度
  };
  status: string;        // 処理状態
  created_at: Timestamp; // 作成日時
  updated_at: Timestamp; // 更新日時
}
```

### BigQuery テーブル

```sql
CREATE TABLE documents (
  document_id STRING,
  file_name STRING,
  file_path STRING,
  ocr_text STRING,
  category STRING,
  tags ARRAY<STRING>,
  confidence FLOAT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE audit_logs (
  log_id STRING,
  document_id STRING,
  action STRING,
  user_id STRING,
  timestamp TIMESTAMP,
  details JSON
);
```

## データ同期

### Firestore → BigQuery
- Cloud Functions トリガーによる自動同期
- バッチ処理による定期的な完全同期
- 論理削除対応

### 監査ログ
- 変更履歴の追跡
- アクセスログの記録
- エラーログの管理

## インデックス設定

```json
{
  "indexes": [
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "category", "order": "ASCENDING"},
        {"fieldPath": "created_at", "order": "DESCENDING"}
      ]
    }
  ]
}
```

## バックアップ戦略

### Firestore
- 日次バックアップ
- Point-in-time リカバリ
- 地理的冗長化

### BigQuery
- テーブルスナップショット
- パーティション単位のバックアップ
- クロスリージョンコピー
