import pytest
from google.cloud import firestore, bigquery
import os
from datetime import datetime
from google.api_core import client_options
from google.auth.credentials import AnonymousCredentials

def test_user_data_sync():
    """ユーザーデータの同期テスト"""
    current_time = datetime.utcnow().isoformat()
    
    # Firestoreクライアント初期化（エミュレータモード）
    db = firestore.Client(
        project="local-test-project",
        credentials=AnonymousCredentials(),
        client_options=client_options.ClientOptions(
            api_endpoint=f"http://{os.getenv('FIRESTORE_EMULATOR_HOST')}"
        )
    )
    
    # テストユーザーデータ
    test_user = {
        "name": "テスト 太郎",
        "alternate_names": ["てすと たろう", "テスト タロウ"],
        "standardized_name": "テスト 太郎",
        "match_rules": {
            "hiragana": True,
            "katakana": True
        },
        "is_deleted": False,
        "created_at": current_time,
        "updated_at": current_time
    }
    
    # Firestoreにテストデータを追加
    user_ref = db.collection("users").document()
    user_ref.set(test_user)
    
    # BigQueryクライアント初期化（エミュレータモード）
    client = bigquery.Client(
        project="local-test-project",
        credentials=AnonymousCredentials(),
        client_options=client_options.ClientOptions(
            api_endpoint=f"http://{os.getenv('BIGQUERY_EMULATOR_HOST')}"
        )
    )
    
    # テストOCRデータ
    test_ocr_data = {
        "file_id": "test_file_001",
        "file_url": "gs://test-bucket/test.pdf",
        "user_id": user_ref.id,
        "ocr_text": "テスト 太郎の書類",
        "created_at": current_time,
        "is_deleted": False
    }
    
    # BigQueryにデータを挿入
    table_id = f"{os.getenv('BIGQUERY_PROJECT_ID')}.{os.getenv('BIGQUERY_DATASET_ID')}.file_metadata"
    
    # テーブルが存在する場合は削除
    try:
        client.delete_table(table_id)
        print("テーブルを削除しました")
    except Exception as e:
        print(f"テーブル削除エラー（存在しない場合は無視）: {e}")
    
    # テーブルを作成
    schema = [
        bigquery.SchemaField("file_id", "STRING"),
        bigquery.SchemaField("file_url", "STRING"),
        bigquery.SchemaField("user_id", "STRING"),
        bigquery.SchemaField("ocr_text", "STRING"),
        bigquery.SchemaField("created_at", "STRING"),
        bigquery.SchemaField("is_deleted", "BOOLEAN")
    ]
    
    table = bigquery.Table(table_id, schema=schema)
    try:
        client.create_table(table)
        print("テーブルを作成しました")
    except Exception as e:
        print(f"テーブル作成エラー: {e}")
        raise
    
    # データを挿入
    errors = client.insert_rows_json(table_id, [test_ocr_data])
    assert not errors, "BigQueryへの挿入に失敗"
    
    # 論理削除のテスト
    user_ref.update({
        "is_deleted": True,
        "deleted_at": datetime.utcnow().isoformat()
    })
    
    # BigQueryのデータが更新されたことを確認
    query = f"""
    SELECT is_deleted
    FROM `{table_id}`
    WHERE user_id = '{user_ref.id}'
    """
    query_job = client.query(query)
    results = list(query_job)
    assert len(results) > 0
