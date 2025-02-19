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
    UPDATE `{os.getenv('PROJECT_ID')}.ocr_data.file_metadata`
    SET is_deleted = {is_deleted},
        deleted_at = TIMESTAMP('{deleted_at}')
    WHERE user_id = '{user_id}'
    """
    client.query(query)
