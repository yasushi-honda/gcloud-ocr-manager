from typing import List, Optional
from datetime import datetime
import uuid

from google.cloud import firestore
from google.cloud import bigquery
from fastapi import HTTPException, Request

from .models import (
    User, UserCreate, UserUpdate,
    AuthSettings, AuthSettingsUpdate,
    AuthDomain, AuthDomainCreate, AuthDomainUpdate,
    AuthAuditLog,
    user_from_dict, user_to_dict,
    auth_domain_from_dict, auth_domain_to_dict
)

db = firestore.Client()
bq = bigquery.Client()

# ユーザー管理
async def create_user(user: UserCreate) -> User:
    """新規ユーザーを作成"""
    doc_ref = db.collection('users').document()
    user_data = user_to_dict(user)
    doc_ref.set(user_data)
    
    # BigQueryに同期
    await sync_user_to_bigquery(doc_ref.id, user_data)
    
    return user_from_dict(user_data, doc_ref.id)

async def get_user(user_id: str) -> Optional[User]:
    """ユーザー情報を取得"""
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    return user_from_dict(doc.to_dict(), doc.id)

async def update_user(user_id: str, user: UserUpdate) -> Optional[User]:
    """ユーザー情報を更新"""
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    
    update_data = user_to_dict(user)
    doc_ref.update(update_data)
    
    # 更新後のデータを取得
    updated_doc = doc_ref.get()
    updated_data = updated_doc.to_dict()
    
    # BigQueryに同期
    await sync_user_to_bigquery(user_id, updated_data)
    
    return user_from_dict(updated_data, user_id)

async def delete_user(user_id: str) -> bool:
    """ユーザーを論理削除"""
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    
    update_data = {
        'is_deleted': True,
        'deleted_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    doc_ref.update(update_data)
    
    # BigQueryに同期
    current_data = doc_ref.get().to_dict()
    await sync_user_to_bigquery(user_id, current_data)
    
    return True

# 認証設定
async def get_auth_settings() -> AuthSettings:
    """認証設定を取得"""
    doc_ref = db.collection('auth_settings').document('config')
    doc = doc_ref.get()
    if not doc.exists:
        # デフォルト設定を作成
        settings = AuthSettings()
        doc_ref.set(settings.dict())
        return settings
    return AuthSettings(**doc.to_dict())

async def update_auth_settings(settings: AuthSettingsUpdate) -> AuthSettings:
    """認証設定を更新"""
    doc_ref = db.collection('auth_settings').document('config')
    update_data = settings.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    doc_ref.update(update_data)
    return AuthSettings(**doc_ref.get().to_dict())

# ドメイン管理
async def create_auth_domain(domain: AuthDomainCreate) -> AuthDomain:
    """許可ドメインを追加"""
    # 重複チェック
    existing = db.collection('allowed_domains').where('domain', '==', domain.domain).limit(1).get()
    if len(existing) > 0:
        raise HTTPException(status_code=400, detail="Domain already exists")
    
    doc_ref = db.collection('allowed_domains').document()
    domain_data = auth_domain_to_dict(domain)
    doc_ref.set(domain_data)
    
    return auth_domain_from_dict(domain_data, doc_ref.id)

async def get_auth_domains(active_only: bool = False) -> List[AuthDomain]:
    """許可ドメイン一覧を取得"""
    query = db.collection('allowed_domains')
    if active_only:
        query = query.where('is_active', '==', True)
    
    domains = []
    for doc in query.stream():
        domains.append(auth_domain_from_dict(doc.to_dict(), doc.id))
    return domains

async def update_auth_domain(domain_id: str, domain: AuthDomainUpdate) -> Optional[AuthDomain]:
    """許可ドメインを更新"""
    doc_ref = db.collection('allowed_domains').document(domain_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    
    update_data = auth_domain_to_dict(domain)
    doc_ref.update(update_data)
    
    return auth_domain_from_dict(doc_ref.get().to_dict(), domain_id)

# BigQuery連携
async def sync_user_to_bigquery(user_id: str, data: dict):
    """ユーザー情報の変更をBigQueryに同期"""
    table = bq.get_table('users')
    
    # 既存レコードの論理削除
    query = f"""
        UPDATE `{table.project}.{table.dataset_id}.{table.table_id}`
        SET is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP()
        WHERE user_id = '{user_id}'
        AND is_deleted = FALSE
    """
    bq.query(query)
    
    # 新しいレコードの挿入
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
    bq.insert_rows(table, rows)

async def log_auth_action(
    user_id: str,
    action: str,
    details: str,
    request: Request
):
    """認証・認可アクションのログを記録"""
    log = AuthAuditLog(
        log_id=str(uuid.uuid4()),
        user_id=user_id,
        action=action,
        details=details,
        ip_address=request.client.host,
        user_agent=request.headers.get('user-agent', '')
    )
    
    # Firestoreに保存
    doc_ref = db.collection('auth_audit_logs').document(log.log_id)
    doc_ref.set(log.dict())
    
    # BigQueryに保存
    table = bq.get_table('auth_audit_logs')
    rows = [log.dict()]
    bq.insert_rows(table, rows)

# ドメイン検証
async def is_domain_allowed(domain: str) -> bool:
    """ドメインが許可リストに含まれているかチェック"""
    settings = await get_auth_settings()
    if not settings.allow_only_listed_domains:
        return True
    
    if settings.allow_personal_gmail and domain == 'gmail.com':
        return True
    
    query = db.collection('allowed_domains')\
        .where('domain', '==', domain)\
        .where('is_active', '==', True)\
        .limit(1)
    
    docs = query.get()
    return len(docs) > 0
