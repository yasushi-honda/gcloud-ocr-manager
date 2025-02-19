from fastapi import FastAPI, HTTPException, Request, Query, Depends
from google.cloud import vision, documentai, storage, firestore, bigquery
from typing import Optional, List
import os
from firebase_admin import auth, credentials, initialize_app
from . import utils, crud
from .models import UserCreate, UserUpdate, User, FileSearchQuery, FileSearchResult, AuthSettings, AuthDomain, AllowedEmail, AuthDomainCreate, AuthDomainUpdate, AllowedEmailCreate, AllowedEmailUpdate, AuthSettingsUpdate, AuthDomainResponse, AllowedEmailResponse, AuthSettingsResponse

app = FastAPI(title="ファイル管理システム API")

# Firebase Admin初期化
cred = credentials.Certificate(os.getenv('FIREBASE_ADMIN_CREDENTIALS'))
initialize_app(cred)

# クライアントの初期化
vision_client = vision.ImageAnnotatorClient()
storage_client = storage.Client()
firestore_client = firestore.Client()
bigquery_client = bigquery.Client()

# 認証ミドルウェア
async def verify_token(request: Request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        
        # Firestoreからユーザー情報を取得
        user_doc = firestore_client.collection('users').document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_doc.to_dict()
        return {
            'user_id': user_id,
            'role': user_data.get('role', 'user'),
            'email': decoded_token.get('email')
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# 管理者権限チェック
async def verify_admin(user = Depends(verify_token)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

# 認証関連のエラー用の例外クラス
class AuthError(HTTPException):
    """認証エラー用の例外クラス"""
    def __init__(self, detail: str):
        super().__init__(status_code=401, detail=detail)

class ForbiddenError(HTTPException):
    """認可エラー用の例外クラス"""
    def __init__(self, detail: str):
        super().__init__(status_code=403, detail=detail)

# 認証トークンを検証する関数
async def verify_token_auth(
    credentials: str = Depends(security)
) -> dict:
    """Firebase認証トークンを検証"""
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        
        # メールアドレスの許可確認
        email = decoded_token.get('email', '')
        if not email:
            raise ForbiddenError("メールアドレスが取得できません")
            
        if not crud.is_email_allowed(firestore_client, email):
            raise ForbiddenError("このメールアドレスではアクセスできません")
        
        return decoded_token
    except Exception as e:
        raise AuthError(str(e))

# 認証設定API
@app.get("/auth/settings", response_model=AuthSettingsResponse)
async def get_settings(token: dict = Depends(verify_token_auth)):
    """認証設定を取得"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    return crud.get_auth_settings(firestore_client)

@app.patch("/auth/settings", response_model=AuthSettingsResponse)
async def update_settings(
    settings: AuthSettingsUpdate,
    token: dict = Depends(verify_token_auth)
):
    """認証設定を更新"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    return crud.update_auth_settings(firestore_client, settings)

# 許可ドメインAPI
@app.get("/auth/domains", response_model=List[AuthDomainResponse])
async def list_domains(token: dict = Depends(verify_token_auth)):
    """許可ドメイン一覧を取得"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    return crud.list_allowed_domains(firestore_client)

@app.get("/auth/domains/{domain_id}", response_model=AuthDomainResponse)
async def get_domain(
    domain_id: str,
    token: dict = Depends(verify_token_auth)
):
    """許可ドメインを取得"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    domain = crud.get_allowed_domain(firestore_client, domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="ドメインが見つかりません")
    return domain

@app.post("/auth/domains", response_model=AuthDomainResponse)
async def create_domain(
    domain: AuthDomainCreate,
    token: dict = Depends(verify_token_auth)
):
    """許可ドメインを追加"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    try:
        domain_id = crud.add_allowed_domain(firestore_client, domain)
        return crud.get_allowed_domain(firestore_client, domain_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/auth/domains/{domain_id}", response_model=AuthDomainResponse)
async def update_domain(
    domain_id: str,
    domain: AuthDomainUpdate,
    token: dict = Depends(verify_token_auth)
):
    """許可ドメインを更新"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    if not crud.update_allowed_domain(firestore_client, domain_id, domain):
        raise HTTPException(status_code=404, detail="ドメインが見つかりません")
    return crud.get_allowed_domain(firestore_client, domain_id)

@app.delete("/auth/domains/{domain_id}")
async def delete_domain(
    domain_id: str,
    token: dict = Depends(verify_token_auth)
):
    """許可ドメインを削除"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    if not crud.delete_allowed_domain(firestore_client, domain_id):
        raise HTTPException(status_code=404, detail="ドメインが見つかりません")
    return {"message": "ドメインを削除しました"}

# 許可メールアドレスAPI
@app.get("/auth/emails", response_model=List[AllowedEmailResponse])
async def list_emails(token: dict = Depends(verify_token_auth)):
    """許可メールアドレス一覧を取得"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    return crud.list_allowed_emails(firestore_client)

@app.get("/auth/emails/{email_id}", response_model=AllowedEmailResponse)
async def get_email(
    email_id: str,
    token: dict = Depends(verify_token_auth)
):
    """許可メールアドレスを取得"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    email = crud.get_allowed_email(firestore_client, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="メールアドレスが見つかりません")
    return email

@app.post("/auth/emails", response_model=AllowedEmailResponse)
async def create_email(
    email: AllowedEmailCreate,
    token: dict = Depends(verify_token_auth)
):
    """許可メールアドレスを追加"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    try:
        email_id = crud.add_allowed_email(firestore_client, email)
        return crud.get_allowed_email(firestore_client, email_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/auth/emails/{email_id}", response_model=AllowedEmailResponse)
async def update_email(
    email_id: str,
    email: AllowedEmailUpdate,
    token: dict = Depends(verify_token_auth)
):
    """許可メールアドレスを更新"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    if not crud.update_allowed_email(firestore_client, email_id, email):
        raise HTTPException(status_code=404, detail="メールアドレスが見つかりません")
    return crud.get_allowed_email(firestore_client, email_id)

@app.delete("/auth/emails/{email_id}")
async def delete_email(
    email_id: str,
    token: dict = Depends(verify_token_auth)
):
    """許可メールアドレスを削除"""
    if token.get('role') != 'admin':
        raise ForbiddenError("管理者権限が必要です")
    
    if not crud.delete_allowed_email(firestore_client, email_id):
        raise HTTPException(status_code=404, detail="メールアドレスが見つかりません")
    return {"message": "メールアドレスを削除しました"}

@app.get("/")
async def root():
    return {"status": "healthy", "service": "ファイル管理システム API"}

@app.post("/process-document")
async def process_document(request: DocumentRequest):
    try:
        # Cloud Storageからファイルを取得
        file_content = utils.get_file_from_storage(request.bucket_name, request.file_path)
        
        # OCR処理を実行（Vision API → Document AI）
        extracted_text, ocr_method, matched_user, matched_names = utils.process_document_with_ocr(
            file_content=file_content,
            content_type=request.content_type
        )
        
        # BigQueryにメタデータを保存
        utils.store_to_bigquery(
            file_path=request.file_path,
            content_type=request.content_type,
            extracted_text=extracted_text,
            ocr_method=ocr_method,
            matched_user=matched_user,
            matched_names=matched_names
        )
        
        return {
            "status": "success",
            "file_path": request.file_path,
            "text_length": len(extracted_text),
            "ocr_method": ocr_method,
            "matched_user": matched_user["user_id"] if matched_user else None,
            "matched_names": matched_names
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-drive-file")
async def update_drive_file(request: DriveFileRequest):
    try:
        result = utils.update_drive_file(
            file_id=request.file_id,
            new_name=request.new_name,
            new_parent=request.new_parent
        )
        return {
            "status": "success",
            "file_id": result["id"],
            "new_name": result.get("name"),
            "new_parent": result.get("parents", [None])[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/drive-change-notification")
async def handle_drive_change(notification: DriveChangeNotification):
    try:
        # BigQueryのデータを更新
        table_id = f"{os.getenv('PROJECT_ID')}.ocr_data.documents"
        
        if notification.change_type == "delete":
            # ファイルが削除された場合、BigQueryのレコードも削除
            query = f"""
                DELETE FROM `{table_id}`
                WHERE file_path LIKE '%{notification.file_id}%'
            """
        else:
            # ファイルが更新された場合、BigQueryのレコードも更新
            query = f"""
                UPDATE `{table_id}`
                SET updated_at = CURRENT_TIMESTAMP()
                WHERE file_path LIKE '%{notification.file_id}%'
            """
        
        job = bigquery_client.query(query)
        job.result()  # クエリの完了を待つ
        
        return {"status": "success", "file_id": notification.file_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ユーザー管理API
@app.post("/users/", response_model=User, tags=["users"])
async def create_user(user: UserCreate, admin = Depends(verify_admin)):
    """新しいユーザーを作成（管理者のみ）"""
    try:
        user_id = crud.create_user(firestore_client, user.dict())
        return crud.get_user(firestore_client, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/", response_model=List[User], tags=["users"])
async def list_users(
    include_deleted: bool = Query(False, description="論理削除されたユーザーを含める"),
    admin = Depends(verify_admin)
):
    """ユーザー一覧を取得（管理者のみ）"""
    try:
        return crud.list_users(firestore_client, include_deleted)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}", response_model=User, tags=["users"])
async def get_user(user_id: str, current_user = Depends(verify_token)):
    """特定のユーザー情報を取得（本人または管理者のみ）"""
    if current_user['role'] != 'admin' and current_user['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    user = crud.get_user(firestore_client, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=User, tags=["users"])
async def update_user(
    user_id: str,
    user: UserUpdate,
    current_user = Depends(verify_token)
):
    """ユーザー情報を更新（本人または管理者のみ）"""
    if current_user['role'] != 'admin' and current_user['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    if not crud.update_user(firestore_client, user_id, user.dict(exclude_unset=True)):
        raise HTTPException(status_code=404, detail="User not found")
    return crud.get_user(firestore_client, user_id)

@app.delete("/users/{user_id}", tags=["users"])
async def delete_user(
    user_id: str,
    hard_delete: bool = Query(False, description="物理削除を行う（デフォルトは論理削除）"),
    admin = Depends(verify_admin)
):
    """ユーザーを削除（管理者のみ）"""
    if not crud.delete_user(firestore_client, user_id, hard_delete):
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "User deleted successfully"}

# ファイル検索API
@app.post("/files/search", response_model=FileSearchResult, tags=["files"])
async def search_files(query: FileSearchQuery, current_user = Depends(verify_token)):
    """ファイルを検索（認証済みユーザーのみ）"""
    try:
        # 一般ユーザーの場合、自分のファイルのみ検索可能
        if current_user['role'] != 'admin':
            query.user_id = current_user['user_id']
        
        # BigQueryクエリの構築
        conditions = []
        params = []
        
        if query.query_text:
            conditions.append("CONTAINS_SUBSTR(ocr_text, @query_text)")
            params.append(bigquery.ScalarQueryParameter("query_text", "STRING", query.query_text))
        
        if query.user_id:
            conditions.append("@user_id IN UNNEST(matched_user_ids)")
            params.append(bigquery.ScalarQueryParameter("user_id", "STRING", query.user_id))
        
        if query.file_type:
            conditions.append("mime_type = @file_type")
            params.append(bigquery.ScalarQueryParameter("file_type", "STRING", query.file_type))
        
        if query.date_from:
            conditions.append("created_at >= @date_from")
            params.append(bigquery.ScalarQueryParameter("date_from", "TIMESTAMP", query.date_from.isoformat()))
        
        if query.date_to:
            conditions.append("created_at <= @date_to")
            params.append(bigquery.ScalarQueryParameter("date_to", "TIMESTAMP", query.date_to.isoformat()))
        
        if not query.include_deleted:
            conditions.append("is_deleted = FALSE")

        # WHERE句の構築
        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # 総件数を取得
        count_query = f"""
        SELECT COUNT(*) as total
        FROM `{os.getenv('BIGQUERY_PROJECT_ID')}.{os.getenv('BIGQUERY_DATASET_ID')}.file_metadata`
        WHERE {where_clause}
        """
        
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        count_results = bigquery_client.query(count_query, job_config=job_config).result()
        total_count = next(count_results).total

        # 検索結果を取得
        search_query = f"""
        SELECT *
        FROM `{os.getenv('BIGQUERY_PROJECT_ID')}.{os.getenv('BIGQUERY_DATASET_ID')}.file_metadata`
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT @limit
        OFFSET @offset
        """
        
        params.extend([
            bigquery.ScalarQueryParameter("limit", "INT64", query.limit),
            bigquery.ScalarQueryParameter("offset", "INT64", query.offset)
        ])
        
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        search_results = bigquery_client.query(search_query, job_config=job_config).result()

        # 結果の整形
        items = []
        for row in search_results:
            items.append({
                'file_id': row.file_id,
                'file_name': row.file_name,
                'file_url': row.file_url,
                'mime_type': row.mime_type,
                'ocr_text': row.ocr_text,
                'matched_user_ids': row.matched_user_ids,
                'matched_names': row.matched_names,
                'is_deleted': row.is_deleted,
                'created_at': row.created_at,
                'updated_at': row.updated_at
            })

        return {
            'total_count': total_count,
            'items': items
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
