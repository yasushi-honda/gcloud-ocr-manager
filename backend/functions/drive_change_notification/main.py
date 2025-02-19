import functions_framework
from google.cloud import pubsub_v1
from google.cloud import storage
import json
import os

@functions_framework.http
def handle_drive_change(request):
    """Google Driveの変更を検知してPub/Subに通知するCloud Function

    Args:
        request (flask.Request): HTTPリクエストオブジェクト

    Returns:
        tuple: レスポンスとステータスコード
    """
    # リクエストの検証
    if request.method != 'POST':
        return 'Only POST requests are accepted', 405

    # Drive APIからのWebhookデータを取得
    try:
        data = request.get_json()
    except Exception as e:
        return f'Invalid request data: {str(e)}', 400

    # 必要なデータの存在確認
    required_fields = ['fileId', 'driveId', 'type']
    if not all(field in data for field in required_fields):
        return 'Missing required fields', 400

    # Pub/Subクライアントの初期化
    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(
        os.getenv('PROJECT_ID'),
        'drive-changes'
    )

    # メッセージデータの作成
    message = {
        'file_id': data['fileId'],
        'drive_id': data['driveId'],
        'change_type': data['type'],
        'timestamp': data.get('time', None)
    }

    # Pub/Subにメッセージを発行
    try:
        future = publisher.publish(
            topic_path,
            json.dumps(message).encode('utf-8')
        )
        future.result()  # 送信完了を待機
        return 'Message published successfully', 200
    except Exception as e:
        return f'Error publishing message: {str(e)}', 500
