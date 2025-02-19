# **BigQuery × Firestore のハイブリッドデータ設計ドキュメント**

## **📌 概要**
本ドキュメントでは、BigQuery と Firestore を連携させた OCR ファイラーのデータ構造と運用方法について説明します。

- **Firestore:** マスターデータ管理・リアルタイム検索
- **BigQuery:** 大量データの保存・全文検索・分析
- **Cloud Functions:** Firestore と BigQuery のデータ同期（論理削除対応）

## **📂 データ構造**

### **1️⃣ Firestore: マスターデータ（正規化・論理削除対応）**
Firestore は以下の 3 つのコレクションでマスターデータを管理します。

| コレクション名 | 用途 |
|---|---|
| `users` | 利用者情報（ID・名前・メール・権限など） |
| `offices` | 事業所情報（ID・事業所名・住所など） |
| `documents` | 書類情報（ID・書類名・カテゴリ） |

#### **📂 `users`（利用者マスター）**
```json
{
  "user_001": {
    "name": "山田 太郎",
    "alternate_names": ["やまだ たろう", "ヤマダ タロウ", "Yamada Taro"],
    "standardized_name": "山田 太郎",
    "match_rules": {
      "hiragana": true,
      "katakana": true,
      "kanji": true,
      "romanized": false
    },
    "is_deleted": false,
    "deleted_at": null,
    "created_at": "2025-02-19T12:00:00Z",
    "updated_at": "2025-02-19T14:00:00Z"
  }
}
```
✅ **論理削除対応（`is_deleted`, `deleted_at`）**

---

### **2️⃣ BigQuery: トランザクションデータ（Firestoreとリレーション）**
BigQueryの `file_metadata` テーブルは、Firestoreの `user_id`, `office_id`, `document_id` を参照してOCRデータを管理します。

```sql
CREATE TABLE `your_project.dataset.file_metadata` (
  file_id STRING PRIMARY KEY,
  file_url STRING,
  user_id STRING,
  office_id STRING,
  document_id STRING,
  matched_name STRING,
  matched_alternate_names ARRAY<STRING>,
  ocr_text STRING,
  keywords ARRAY<STRING>,
  confidence FLOAT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL
)
PARTITION BY DATE(created_at);
```
✅ **Firestoreのマスターとリレーションしつつ、`is_deleted` を持たせ論理削除に対応**

---

### **3️⃣ Firestore → BigQuery の論理削除の同期（Cloud Functions）**
Firestoreのマスターが削除されたら、BigQueryの `file_metadata` の `is_deleted` も更新する。

```python
from google.cloud import bigquery, firestore
import functions_framework

db = firestore.Client()
client = bigquery.Client()

@functions_framework.cloud_event
def sync_firestore_delete_status_to_bigquery(cloud_event):
    """Firestoreのマスターが論理削除されたら、BigQueryのOCRデータも論理削除"""
    data = cloud_event.data
    user_id = data["value"]["name"].split("/")[-1]
    is_deleted = data["value"]["fields"]["is_deleted"]["booleanValue"]
    deleted_at = data["value"]["fields"]["deleted_at"]["timestampValue"] if is_deleted else None

    query = f"""
    UPDATE `your_project.dataset.file_metadata`
    SET is_deleted = {is_deleted},
        deleted_at = TIMESTAMP('{deleted_at}')
    WHERE user_id = '{user_id}'
    """
    client.query(query)
```
✅ **Firestoreの削除フラグをBigQueryの `file_metadata` に同期**

---

### **4️⃣ 認証関連データモデル**

#### **4.1 Firestore コレクション設計**

##### users コレクション
ユーザー情報を管理するコレクション

```typescript
interface User {
  email: string;         // メールアドレス
  name: string;         // 表示名
  alternate_names: string[];  // 別表記（ひらがな、カタカナ、ローマ字）
  role: 'user' | 'admin';  // ユーザーロール
  organization: string;  // 所属組織
  is_deleted: boolean;   // 論理削除フラグ
  deleted_at: Timestamp | null;  // 削除日時
  created_at: Timestamp; // 作成日時
  updated_at: Timestamp; // 更新日時
}

// インデックス
- email (ASC)
- role (ASC), is_deleted (ASC)
- organization (ASC), is_deleted (ASC)
```

##### auth_settings コレクション
認証の全般設定を管理するコレクション

```typescript
// ドキュメントID: config
interface AuthSettings {
  allow_only_listed_domains: boolean;  // 登録済みドメインのみ許可
  allow_personal_gmail: boolean;       // 個人のGmailアカウントを許可
  allow_listed_emails_only: boolean;   // 登録済みメールアドレスのみ許可
  updated_at: Timestamp;               // 更新日時
}
```

##### allowed_domains コレクション
許可されたドメインを管理するコレクション

```typescript
interface AuthDomain {
  domain: string;         // 許可するドメイン（例：company.com）
  description: string;    // ドメインの説明
  is_active: boolean;     // 有効/無効フラグ
  created_at: Timestamp;  // 作成日時
  updated_at: Timestamp;  // 更新日時
}

// インデックス
- domain (ASC), is_active (ASC)
```

#### **4.2 BigQuery テーブル設計**

##### users テーブル
ユーザー情報の履歴を管理するテーブル

```sql
CREATE TABLE `your_project.dataset.users` (
  user_id STRING,
  email STRING,
  name STRING,
  alternate_names ARRAY<STRING>,
  role STRING,
  organization STRING,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
PARTITION BY DATE(created_at);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_org ON users(organization);
```

##### auth_audit_logs テーブル
認証・認可に関する監査ログを管理するテーブル

```sql
CREATE TABLE `your_project.dataset.auth_audit_logs` (
  log_id STRING,
  user_id STRING,
  action STRING,  -- 'login', 'logout', 'settings_change', 'role_change' など
  details STRING,
  ip_address STRING,
  user_agent STRING,
  timestamp TIMESTAMP
)
PARTITION BY DATE(timestamp);

-- インデックス
CREATE INDEX idx_audit_user ON auth_audit_logs(user_id);
CREATE INDEX idx_audit_action ON auth_audit_logs(action);
CREATE INDEX idx_audit_time ON auth_audit_logs(timestamp);
```

#### **4.3 データ同期設計**

1. **Firestore → BigQuery同期**
   ```python
   def sync_user_to_bigquery(user_id: str, data: dict):
       """ユーザー情報の変更をBigQueryに同期"""
       client = bigquery.Client()
       
       # 既存レコードの論理削除
       query = f"""
           UPDATE `your_project.dataset.users`
           SET is_deleted = TRUE,
               deleted_at = CURRENT_TIMESTAMP()
           WHERE user_id = '{user_id}'
           AND is_deleted = FALSE
       """
       client.query(query)
       
       # 新しいレコードの挿入
       table = client.get_table('your_project.dataset.users')
       rows = [{
           'user_id': user_id,
           'email': data['email'],
           'name': data['name'],
           'alternate_names': data['alternate_names'],
           'role': data['role'],
           'organization': data['organization'],
           'is_deleted': data['is_deleted'],
           'deleted_at': data['deleted_at'],
           'created_at': data['created_at'],
           'updated_at': data['updated_at']
       }]
       client.insert_rows(table, rows)
   ```

2. **監査ログの記録**
   ```python
   def log_auth_action(
       user_id: str,
       action: str,
       details: str,
       request: Request
   ):
       """認証・認可アクションのログを記録"""
       client = bigquery.Client()
       table = client.get_table('your_project.dataset.auth_audit_logs')
       
       rows = [{
           'log_id': str(uuid.uuid4()),
           'user_id': user_id,
           'action': action,
           'details': details,
           'ip_address': request.client.host,
           'user_agent': request.headers.get('user-agent'),
           'timestamp': datetime.utcnow()
       }]
       client.insert_rows(table, rows)
   ```

#### **4.4 セキュリティ設計**

1. **Firestoreセキュリティルール**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー情報
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || request.auth.token.role == 'admin');
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
    
    // 認証設定
    match /auth_settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
    
    // 許可ドメイン
    match /allowed_domains/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

2. **BigQuery IAM設定**
```yaml
roles:
  # 一般ユーザー
  - role: roles/bigquery.dataViewer
    members:
      - group:users@your-domain.com
  
  # 管理者
  - role: roles/bigquery.admin
    members:
      - group:admins@your-domain.com
```

#### **4.5 バックアップと監査**

1. **定期バックアップ**
   ```bash
   # Firestoreの認証関連コレクションのエクスポート
   gcloud firestore export gs://backup-bucket/auth/$(date +%Y%m%d) \
     --collection-ids=auth_settings,allowed_domains,allowed_emails
   ```

2. **変更監査**
   - Cloud Loggingで以下の操作を記録：
     - 認証設定の変更
     - ドメインの追加/編集/削除
     - メールアドレスの追加/編集/削除
   - ログは90日間保持

---

### **5️⃣ マーメイド記法によるデータモデル（ER図）**
```mermaid
erDiagram
    Users {
        STRING user_id PK
        STRING name
        ARRAY<STRING> alternate_names
        STRING standardized_name
        JSON match_rules
        BOOLEAN is_deleted
        TIMESTAMP deleted_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    Offices {
        STRING office_id PK
        STRING name
        STRING address
        STRING phone
        BOOLEAN is_deleted
        TIMESTAMP deleted_at
        TIMESTAMP created_at
    }
    Documents {
        STRING document_id PK
        STRING name
        STRING category
        BOOLEAN is_deleted
        TIMESTAMP deleted_at
        TIMESTAMP created_at
    }
    FileMetadata {
        STRING file_id PK
        STRING file_url
        STRING user_id FK
        STRING office_id FK
        STRING document_id FK
        STRING matched_name
        ARRAY<STRING> matched_alternate_names
        STRING ocr_text
        ARRAY<STRING> keywords
        FLOAT confidence
        TIMESTAMP processed_at
        TIMESTAMP created_at
        BOOLEAN is_deleted
        TIMESTAMP deleted_at
    }
    AuthSettings {
        BOOLEAN allow_only_listed_domains
        BOOLEAN allow_personal_gmail
        BOOLEAN allow_listed_emails_only
        TIMESTAMP updated_at
    }
    AuthDomain {
        STRING domain PK
        STRING description
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    AllowedEmail {
        STRING email PK
        STRING description
        BOOLEAN is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    Users ||--o{ FileMetadata : "1:N"
    Offices ||--o{ FileMetadata : "1:N"
    Documents ||--o{ FileMetadata : "1:N"
    AuthSettings ||--o{ AuthDomain : "1:N"
    AuthSettings ||--o{ AllowedEmail : "1:N"
```
✅ **FirestoreのマスターとBigQueryのトランザクションデータの関係を可視化**

---

## **📌 まとめ**
🚀 **この設計なら、FirestoreとBigQueryの特性を活かしつつ、スケーラブルで堅牢なシステムを構築できる！**

✔ **FirestoreのPK（`user_id`, `office_id`, `document_id`）をBigQueryに持たせ、リレーションを維持**  
✔ **FirestoreのマスターをBigQueryにコピーせず、必要な情報はJOINで参照**  
✔ **マスターが論理削除されたら、それに紐づく `file_metadata` も `is_deleted = TRUE` にする**  
✔ **BigQueryの検索クエリでは `is_deleted = FALSE` を条件にすることで、パフォーマンスを最適化**  
✔ **Cloud FunctionsでFirestoreとBigQueryを同期し、データの整合性を確保**  

🔥 **この設計なら、大規模データの運用もスムーズにできる！** 🚀

---

## **🔒 認証とセキュリティ**

### **認証方式**

1. **本番環境**
   - Workload Identity を使用
   - サービスアカウントの鍵ファイルは使用しない
   - Cloud Run と Cloud Functions は --service-account オプションで設定

2. **開発環境**
   - ローカルエミュレータを使用
   - test-credentials.json による認証
   - 環境変数 GOOGLE_APPLICATION_CREDENTIALS で設定

### **セキュリティ対策**

- **Workload Identity** を使用して、サービス間の認証を実現
- **サービスアカウント** を使用して、Cloud Run と Cloud Functions に権限を付与
- **ローカルエミュレータ** を使用して、開発環境での認証を実現
- **test-credentials.json** を使用して、開発環境での認証を実現

---

## **5️⃣ パフォーマンスとスケーラビリティ**

### **5.1 BigQuery最適化**

#### パーティショニング戦略
```sql
-- ファイルメタデータテーブルのパーティション定義
CREATE TABLE `your_project.dataset.file_metadata`
(
  -- 既存のカラム定義
)
PARTITION BY DATE(created_at)
CLUSTER BY user_id, office_id;

-- パーティション有効期限の設定
ALTER TABLE `your_project.dataset.file_metadata`
SET OPTIONS (
  partition_expiration_days = 90
);
```

#### マテリアライズドビュー
```sql
-- よく使用される集計クエリのマテリアライズドビュー
CREATE MATERIALIZED VIEW `your_project.dataset.daily_ocr_stats`
AS SELECT
  DATE(created_at) as process_date,
  user_id,
  office_id,
  COUNT(*) as total_files,
  AVG(confidence) as avg_confidence
FROM `your_project.dataset.file_metadata`
WHERE NOT is_deleted
GROUP BY 1, 2, 3;
```

### **5.2 Firestore最適化**

#### インデックス最適化
```javascript
// firebase.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "office_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

#### シャーディング設計
```typescript
interface ShardedCounter {
  shard_id: string;
  count: number;
  last_updated: Timestamp;
}

// 10個のシャードを使用して書き込みを分散
const SHARD_COUNT = 10;
const shardId = Math.floor(Math.random() * SHARD_COUNT);
```

## **6️⃣ エラーハンドリングと復旧**

### **6.1 データ整合性チェック**

#### Firestoreトリガー関数
```typescript
export const validateAndSyncData = functions.firestore
  .document('documents/{docId}')
  .onWrite(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // バリデーション
    if (!validateDocumentData(newData)) {
      throw new Error('Invalid document data');
    }

    // BigQueryへの同期
    try {
      await syncToBigQuery(newData, oldData);
    } catch (error) {
      // Dead Letter Queueへ送信
      await publishToDLQ({
        data: newData,
        error: error.message,
        timestamp: new Date(),
        retryCount: 0
      });
    }
  });
```

### **6.2 リトライ処理**
```typescript
interface RetryMessage {
  data: any;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export const processDLQ = functions.pubsub
  .topic('dlq-retry')
  .onPublish(async (message) => {
    const retryData: RetryMessage = message.json;
    
    if (retryData.retryCount >= 3) {
      await notifyAdmin(retryData);
      return;
    }

    try {
      await syncToBigQuery(retryData.data, null);
    } catch (error) {
      await publishToDLQ({
        ...retryData,
        retryCount: retryData.retryCount + 1,
        timestamp: new Date()
      });
    }
  });
```

## **7️⃣ データ保持とクリーンアップ**

### **7.1 データ保持ポリシー**

```sql
-- BigQueryパーティション有効期限の設定
ALTER TABLE `your_project.dataset.auth_audit_logs`
SET OPTIONS (
  partition_expiration_days = 1825  -- 5年間
);

ALTER TABLE `your_project.dataset.users`
SET OPTIONS (
  partition_expiration_days = 1095  -- 3年間
);
```

### **7.2 自動クリーンアップ**

```typescript
// 論理削除されたデータの物理削除（90日経過後）
export const cleanupDeletedData = functions.pubsub
  .schedule('0 0 * * *')  // 毎日深夜0時
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    // Firestoreのクリーンアップ
    const batch = db.batch();
    const snapshot = await db.collection('documents')
      .where('is_deleted', '==', true)
      .where('deleted_at', '<=', cutoffDate)
      .get();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // BigQueryのクリーンアップ
    const query = `
      DELETE FROM \`your_project.dataset.file_metadata\`
      WHERE is_deleted = TRUE
      AND deleted_at <= TIMESTAMP('${cutoffDate.toISOString()}')
    `;
    
    await bigquery.query(query);
  });
```

これらの変更により、以下が実現されます：
- 効率的なデータアクセスとクエリパフォーマンス
- 堅牢なエラーハンドリングとリカバリー
- 明確なデータライフサイクル管理
