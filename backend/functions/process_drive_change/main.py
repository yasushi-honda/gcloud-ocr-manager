import base64
import json
import os
from google.cloud import storage
from google.cloud import vision
from google.cloud import firestore
from google.cloud import bigquery
from google.cloud import drive_v3
import functions_framework
from datetime import datetime

@functions_framework.cloud_event
def process_drive_change(cloud_event):
    """Pub/Subからのメッセージを処理し、OCR処理とデータ保存を行うCloud Function

    Args:
        cloud_event (CloudEvent): Pub/Subからのイベントデータ
    """
    # メッセージデータの取得
    data = base64.b64decode(cloud_event.data["message"]["data"]).decode()
    message = json.loads(data)

    # Drive APIクライアントの初期化
    drive_service = drive_v3.DriveService()
    
    try:
        # ファイルのメタデータを取得
        file_metadata = drive_service.files().get(
            fileId=message['file_id'],
            fields='id, name, mimeType, parents, modifiedTime, trashed'
        ).execute()
    except Exception as e:
        print(f'Error getting file metadata: {str(e)}')
        return

    # ファイルが削除（ゴミ箱に移動）された場合
    if file_metadata.get('trashed', False):
        update_file_status(message['file_id'], is_deleted=True)
        return

    # ファイルのMIMEタイプをチェック（画像またはPDFのみ処理）
    supported_types = ['image/', 'application/pdf']
    if not any(t in file_metadata.get('mimeType', '') for t in supported_types):
        print(f'Unsupported file type: {file_metadata.get("mimeType")}')
        return

    # ファイルの変更タイプに応じた処理
    if message['change_type'] == 'file.update':
        # ファイルの内容が更新された場合はOCR再処理
        process_ocr(message['file_id'], file_metadata)
    else:
        # ファイルのメタデータのみ更新（移動・リネームなど）
        update_file_metadata(message['file_id'], file_metadata)

def process_ocr(file_id: str, file_metadata: dict):
    """ファイルのOCR処理を実行し、結果を保存

    Args:
        file_id (str): Google DriveのファイルID
        file_metadata (dict): ファイルのメタデータ
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(os.getenv('TEMP_BUCKET'))
    temp_blob = bucket.blob(f"temp/{file_id}")

    # Vision APIでOCR処理
    vision_client = vision.ImageAnnotatorClient()
    image = vision.Image()
    image.source.image_uri = f"gs://{os.getenv('TEMP_BUCKET')}/temp/{file_id}"
    
    response = vision_client.text_detection(image=image)
    if response.error.message:
        print(f'Error: {response.error.message}')
        return

    # OCRテキストの取得
    texts = response.text_annotations
    extracted_text = texts[0].description if texts else ""

    # Firestoreでユーザーマッチング
    db = firestore.Client()
    users_ref = db.collection('users')
    query = users_ref.where('is_deleted', '==', False)
    matched_users = []
    matched_names = []

    for user in query.stream():
        user_data = user.to_dict()
        user_names = [user_data['name']] + user_data.get('alternate_names', [])
        
        for name in user_names:
            if name in extracted_text:
                matched_users.append(user.id)
                matched_names.append(name)
                break

    # BigQueryにデータを更新
    update_file_metadata(file_id, file_metadata, {
        'ocr_text': extracted_text,
        'matched_user_ids': matched_users,
        'matched_names': matched_names
    })

    # 一時ファイルの削除
    temp_blob.delete()

def update_file_metadata(file_id: str, file_metadata: dict, additional_data: dict = None):
    """BigQueryのファイルメタデータを更新

    Args:
        file_id (str): ファイルID
        file_metadata (dict): Drive APIから取得したメタデータ
        additional_data (dict, optional): 追加のメタデータ
    """
    client = bigquery.Client()
    table_id = f"{os.getenv('BIGQUERY_PROJECT_ID')}.{os.getenv('BIGQUERY_DATASET_ID')}.file_metadata"

    # 基本的なメタデータ
    row_data = {
        'file_id': file_id,
        'file_name': file_metadata.get('name'),
        'file_url': f"https://drive.google.com/file/d/{file_id}/view",
        'parent_folder_id': file_metadata.get('parents', [None])[0],
        'mime_type': file_metadata.get('mimeType'),
        'modified_time': file_metadata.get('modifiedTime'),
        'updated_at': datetime.utcnow().isoformat()
    }

    # 追加のメタデータがある場合は統合
    if additional_data:
        row_data.update(additional_data)

    # UPSERTクエリの実行
    query = f"""
    MERGE `{table_id}` T
    USING (SELECT '{file_id}' as file_id) S
    ON T.file_id = S.file_id
    WHEN MATCHED THEN
        UPDATE SET {', '.join(f'{k} = @{k}' for k in row_data.keys())}
    WHEN NOT MATCHED THEN
        INSERT ({', '.join(row_data.keys())})
        VALUES ({', '.join(f'@{k}' for k in row_data.keys())})
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter(k, infer_bigquery_type(v), v)
            for k, v in row_data.items()
        ]
    )

    try:
        client.query(query, job_config=job_config).result()
    except Exception as e:
        print(f'Error updating BigQuery: {str(e)}')

def update_file_status(file_id: str, is_deleted: bool):
    """ファイルの状態（削除フラグ）を更新

    Args:
        file_id (str): ファイルID
        is_deleted (bool): 削除フラグ
    """
    client = bigquery.Client()
    table_id = f"{os.getenv('BIGQUERY_PROJECT_ID')}.{os.getenv('BIGQUERY_DATASET_ID')}.file_metadata"

    query = f"""
    UPDATE `{table_id}`
    SET is_deleted = @is_deleted,
        deleted_at = @deleted_at
    WHERE file_id = @file_id
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter('is_deleted', 'BOOLEAN', is_deleted),
            bigquery.ScalarQueryParameter('deleted_at', 'STRING', 
                datetime.utcnow().isoformat() if is_deleted else None),
            bigquery.ScalarQueryParameter('file_id', 'STRING', file_id)
        ]
    )

    try:
        client.query(query, job_config=job_config).result()
    except Exception as e:
        print(f'Error updating file status: {str(e)}')

def infer_bigquery_type(value):
    """値からBigQueryの型を推測

    Args:
        value: 任意の値

    Returns:
        str: BigQueryの型名
    """
    if isinstance(value, bool):
        return 'BOOL'
    elif isinstance(value, int):
        return 'INT64'
    elif isinstance(value, float):
        return 'FLOAT64'
    elif isinstance(value, (list, tuple)):
        return 'ARRAY'
    else:
        return 'STRING'
