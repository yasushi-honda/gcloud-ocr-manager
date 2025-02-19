from google.cloud import vision, documentai, storage, firestore, bigquery
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime
import os

def check_firestore_match(extracted_text: str) -> tuple[bool, dict, list]:
    """Firestoreの照合データとテキストを照合（読み取り専用）"""
    db = firestore.Client()
    matches = []
    
    # ユーザーマスターと照合
    users = db.collection("users").where("is_deleted", "==", False).stream()
    for user in users:
        user_data = user.to_dict()
        # 標準名での照合
        if user_data["standardized_name"] in extracted_text:
            return True, user.to_dict(), ["standardized_name"]
        # 代替名での照合
        for alt_name in user_data.get("alternate_names", []):
            if alt_name in extracted_text:
                matches.append(alt_name)
        if matches:
            return True, user.to_dict(), matches
    
    return False, None, []

def extract_text_from_image(image_content: bytes) -> tuple[str, bool, dict, list]:
    """Vision APIを使用して画像からテキストを抽出し、照合を行う"""
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_content)
    response = client.text_detection(image=image)
    
    if response.error.message:
        raise Exception(f"Error: {response.error.message}")
    
    extracted_text = response.text_annotations[0].description if response.text_annotations else ""
    has_match, matched_user, matched_names = check_firestore_match(extracted_text) if extracted_text else (False, None, [])
    
    return extracted_text, has_match, matched_user, matched_names

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """Document AIを使用してPDFからテキストを抽出"""
    client = documentai.DocumentProcessorServiceClient()
    project_id = os.getenv("PROJECT_ID")
    location = "us"  # Document AI APIが利用可能なロケーション
    processor_id = os.getenv("DOCAI_PROCESSOR_ID")
    
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"
    
    document = documentai.Document.from_bytes(pdf_content)
    request = documentai.ProcessRequest(
        name=name,
        document=document
    )
    
    result = client.process_document(request=request)
    return result.document.text

def process_document_with_ocr(file_content: bytes, content_type: str) -> tuple[str, str, dict, list]:
    """OCR処理のメインフロー"""
    # Step 1: Vision APIで処理
    if content_type.startswith('image/'):
        extracted_text, has_match, matched_user, matched_names = extract_text_from_image(file_content)
        if has_match:
            return extracted_text, "vision_api", matched_user, matched_names
    
    # Step 2: Document AIで処理（Vision APIでマッチしなかった場合）
    extracted_text = extract_text_from_pdf(file_content)
    has_match, matched_user, matched_names = check_firestore_match(extracted_text)
    
    return extracted_text, "document_ai", matched_user, matched_names

def store_to_bigquery(file_path: str, content_type: str, extracted_text: str, ocr_method: str, 
                     matched_user: dict = None, matched_names: list = None) -> str:
    """BigQueryにOCRデータを保存"""
    client = bigquery.Client()
    table_id = f"{os.getenv('PROJECT_ID')}.ocr_data.file_metadata"
    
    now = datetime.utcnow()
    
    row = {
        "file_id": os.path.basename(file_path),
        "file_url": file_path,
        "user_id": matched_user["user_id"] if matched_user else None,
        "office_id": matched_user.get("office_id") if matched_user else None,
        "document_id": None,  # ドキュメント種別の判定は別途実装
        "matched_name": matched_user["standardized_name"] if matched_user else None,
        "matched_alternate_names": matched_names if matched_names else [],
        "ocr_text": extracted_text,
        "keywords": extract_keywords(extracted_text),  # キーワード抽出関数は別途実装
        "confidence": 1.0 if matched_user else 0.0,
        "processed_at": now.isoformat(),
        "created_at": now.isoformat(),
        "is_deleted": False,
        "deleted_at": None
    }
    
    errors = client.insert_rows_json(table_id, [row])
    if errors:
        raise Exception(f"BigQuery insertion error: {errors}")
    return file_path

def extract_keywords(text: str) -> list:
    """テキストからキーワードを抽出（簡易実装）"""
    # TODO: より高度な自然言語処理を実装
    words = text.split()
    return list(set([w for w in words if len(w) > 1]))

def update_drive_file(file_id: str, new_name: str = None, new_parent: str = None):
    """Drive APIを使用してファイルをリネームまたは移動"""
    credentials = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        scopes=['https://www.googleapis.com/auth/drive.file']
    )
    
    service = build('drive', 'v3', credentials=credentials)
    
    file_metadata = {}
    if new_name:
        file_metadata['name'] = new_name
    if new_parent:
        file_metadata['parents'] = [new_parent]
    
    try:
        updated_file = service.files().update(
            fileId=file_id,
            body=file_metadata,
            fields='id, name, parents'
        ).execute()
        return updated_file
    except Exception as e:
        raise Exception(f"Drive API error: {e}")

def get_file_from_storage(bucket_name: str, file_path: str) -> bytes:
    """Cloud Storageからファイルを取得"""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_path)
    return blob.download_as_bytes()
