from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
import base64
import os

class GmailDriveService:
    def __init__(self):
        self.credentials = service_account.Credentials.from_service_account_file(
            os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
            scopes=[
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/drive.file'
            ]
        )
        self.drive_service = build('drive', 'v3', credentials=self.credentials)
        
    def save_attachment_to_drive(self, attachment_data: str, filename: str, target_folder_id: str):
        """
        Base64エンコードされた添付ファイルをGoogleドライブに保存
        
        Args:
            attachment_data: Base64エンコードされたファイルデータ
            filename: 保存するファイル名
            target_folder_id: 保存先フォルダのID
        
        Returns:
            作成されたファイルのID
        """
        try:
            # Base64デコード
            file_data = base64.urlsafe_b64decode(attachment_data)
            
            # ファイルメタデータの設定
            file_metadata = {
                'name': filename,
                'parents': [target_folder_id]
            }
            
            # メディアの準備
            media = MediaInMemoryUpload(
                file_data,
                mimetype='application/octet-stream',
                resumable=True
            )
            
            # ファイルのアップロード
            file = self.drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            return file.get('id')
            
        except Exception as e:
            print(f"Error saving file to Drive: {str(e)}")
            raise
            
    def setup_folder_permissions(self, folder_id: str, service_account_email: str):
        """
        フォルダの権限を設定
        
        Args:
            folder_id: 対象フォルダのID
            service_account_email: 権限を付与するサービスアカウントのメールアドレス
        """
        try:
            permission = {
                'type': 'user',
                'role': 'writer',
                'emailAddress': service_account_email
            }
            
            self.drive_service.permissions().create(
                fileId=folder_id,
                body=permission,
                fields='id'
            ).execute()
            
        except Exception as e:
            print(f"Error setting folder permissions: {str(e)}")
            raise
