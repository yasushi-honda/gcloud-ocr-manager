#!/usr/bin/env python3
from google.cloud import bigquery

def create_tables():
    """BigQueryテーブルを作成"""
    client = bigquery.Client()
    
    # データセットの作成
    dataset_id = f"{client.project}.auth_management"
    dataset = bigquery.Dataset(dataset_id)
    dataset.location = "asia-northeast1"  # 東京リージョン
    dataset = client.create_dataset(dataset, exists_ok=True)
    
    # usersテーブルの作成
    users_schema = [
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("email", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("alternate_names", "STRING", mode="REPEATED"),
        bigquery.SchemaField("role", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("organization", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("is_deleted", "BOOLEAN", mode="REQUIRED"),
        bigquery.SchemaField("deleted_at", "TIMESTAMP"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    
    users_table = bigquery.Table(f"{dataset_id}.users", schema=users_schema)
    users_table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="created_at"
    )
    users_table = client.create_table(users_table, exists_ok=True)
    print(f"Created table {users_table.project}.{users_table.dataset_id}.{users_table.table_id}")
    
    # auth_audit_logsテーブルの作成
    audit_schema = [
        bigquery.SchemaField("log_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("action", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("details", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ip_address", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_agent", "STRING"),
        bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
    ]
    
    audit_table = bigquery.Table(f"{dataset_id}.auth_audit_logs", schema=audit_schema)
    audit_table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="timestamp"
    )
    audit_table = client.create_table(audit_table, exists_ok=True)
    print(f"Created table {audit_table.project}.{audit_table.dataset_id}.{audit_table.table_id}")

if __name__ == "__main__":
    create_tables()
