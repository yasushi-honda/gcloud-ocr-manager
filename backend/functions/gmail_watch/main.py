import functions_framework
from google.cloud import pubsub_v1
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json
import os
import base64

# 環境変数から設定を読み込み
PROJECT_ID = os.getenv('PROJECT_ID')
TOPIC_NAME = os.getenv('PUBSUB_TOPIC')
CREDENTIALS_PATH = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

def get_gmail_service():
    """Gmail APIサービスの初期化"""
    credentials = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=['https://www.googleapis.com/auth/gmail.readonly']
    )
    return build('gmail', 'v1', credentials=credentials)

@functions_framework.http
def setup_gmail_watch(request):
    """Gmail APIのwatch設定を行う関数"""
    try:
        service = get_gmail_service()
        
        # watch requestの設定
        request_body = {
            'labelIds': ['INBOX'],  # 監視対象のラベル
            'topicName': f'projects/{PROJECT_ID}/topics/{TOPIC_NAME}'
        }
        
        # watchリクエストの実行
        response = service.users().watch(userId='me', body=request_body).execute()
        
        return {
            'status': 'success',
            'historyId': response.get('historyId'),
            'expiration': response.get('expiration')
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }, 500

@functions_framework.cloud_event
def process_gmail_notification(cloud_event):
    """Pub/Subからのメール通知を処理する関数"""
    try:
        # イベントデータの取得
        pubsub_message = base64.b64decode(cloud_event.data["message"]["data"]).decode()
        message_data = json.loads(pubsub_message)
        
        # Gmail APIサービスの初期化
        service = get_gmail_service()
        
        # 履歴の取得
        history_id = message_data.get('historyId')
        if not history_id:
            return
        
        # メール履歴の取得
        history = service.users().history().list(
            userId='me',
            startHistoryId=history_id
        ).execute()
        
        # 添付ファイルの処理
        for history_item in history.get('history', []):
            process_history_item(service, history_item)
            
        return {'status': 'success'}
    except Exception as e:
        print(f'Error processing Gmail notification: {str(e)}')
        return {'status': 'error', 'error': str(e)}, 500

def process_history_item(service, history_item):
    """履歴アイテムから添付ファイルを処理"""
    for message_added in history_item.get('messagesAdded', []):
        message = service.users().messages().get(
            userId='me',
            id=message_added['message']['id']
        ).execute()
        
        # 添付ファイルの処理
        if 'parts' in message.get('payload', {}):
            for part in message['payload']['parts']:
                if part.get('filename'):
                    process_attachment(service, message['id'], part)

def process_attachment(service, message_id, part):
    """添付ファイルの処理とGoogleドライブへの保存"""
    if not part.get('body', {}).get('attachmentId'):
        return
        
    attachment = service.users().messages().attachments().get(
        userId='me',
        messageId=message_id,
        id=part['body']['attachmentId']
    ).execute()
    
    # ここでGoogleドライブへの保存処理を実装
    # この部分は別のモジュールで実装予定
    # save_to_drive(attachment, part['filename'])
