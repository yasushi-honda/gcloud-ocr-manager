from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr

class User(BaseModel):
    """ユーザー情報"""
    id: str = Field(..., description="ユーザーID")
    email: EmailStr = Field(..., description="メールアドレス")
    name: str = Field(..., description="表示名")
    alternate_names: List[str] = Field(default=[], description="別表記（ひらがな、カタカナ、ローマ字）")
    role: str = Field(..., description="ユーザーロール", regex="^(user|admin)$")
    organization: str = Field(..., description="所属組織")
    is_deleted: bool = Field(default=False, description="論理削除フラグ")
    deleted_at: Optional[datetime] = Field(default=None, description="削除日時")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserCreate(BaseModel):
    """ユーザー作成リクエスト"""
    email: EmailStr
    name: str
    alternate_names: List[str] = []
    role: str = "user"
    organization: str

class UserUpdate(BaseModel):
    """ユーザー更新リクエスト"""
    name: Optional[str] = None
    alternate_names: Optional[List[str]] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    is_deleted: Optional[bool] = None

class AuthSettings(BaseModel):
    """認証設定"""
    allow_only_listed_domains: bool = Field(default=True)
    allow_personal_gmail: bool = Field(default=False)
    allow_listed_emails_only: bool = Field(default=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AuthDomainBase(BaseModel):
    """許可ドメインの基本情報"""
    domain: str
    description: str

class AuthDomainCreate(AuthDomainBase):
    """ドメイン登録リクエスト"""
    pass

class AuthDomainUpdate(BaseModel):
    """ドメイン更新リクエスト"""
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AuthDomain(AuthDomainBase):
    """許可ドメイン情報"""
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AuthAuditLog(BaseModel):
    """認証・認可の監査ログ"""
    log_id: str = Field(..., description="ログID")
    user_id: str = Field(..., description="ユーザーID")
    action: str = Field(..., description="アクション種別")
    details: str = Field(..., description="詳細情報")
    ip_address: str = Field(..., description="IPアドレス")
    user_agent: str = Field(..., description="ユーザーエージェント")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class FileSearchQuery(BaseModel):
    query_text: Optional[str] = Field(None, description="検索キーワード")
    user_id: Optional[str] = Field(None, description="ユーザーID")
    file_type: Optional[str] = Field(None, description="ファイルタイプ")
    date_from: Optional[datetime] = Field(None, description="検索開始日")
    date_to: Optional[datetime] = Field(None, description="検索終了日")
    include_deleted: bool = Field(False, description="削除済みファイルを含める")
    limit: int = Field(50, description="取得件数")
    offset: int = Field(0, description="オフセット")

class FileMetadata(BaseModel):
    file_id: str = Field(..., description="ファイルID")
    file_name: str = Field(..., description="ファイル名")
    file_url: str = Field(..., description="ファイルURL")
    mime_type: str = Field(..., description="MIMEタイプ")
    ocr_text: Optional[str] = Field(None, description="OCRテキスト")
    matched_user_ids: List[str] = Field(default=[], description="マッチしたユーザーID")
    matched_names: List[str] = Field(default=[], description="マッチした名前")
    is_deleted: bool = Field(False, description="削除フラグ")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")

class FileSearchResult(BaseModel):
    total_count: int = Field(..., description="総件数")
    items: List[FileMetadata] = Field(..., description="検索結果")

# Firestore用のヘルパー関数
def auth_domain_from_dict(data: dict, doc_id: str) -> AuthDomain:
    return AuthDomain(
        id=doc_id,
        domain=data.get('domain'),
        description=data.get('description'),
        is_active=data.get('is_active', True),
        created_at=data.get('created_at').datetime,
        updated_at=data.get('updated_at').datetime
    )

def auth_domain_to_dict(domain: AuthDomainCreate | AuthDomainUpdate) -> dict:
    data = domain.dict(exclude_unset=True)
    if isinstance(domain, AuthDomainCreate):
        data.update({
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'is_active': True
        })
    else:
        data.update({
            'updated_at': datetime.utcnow()
        })
    return data

def user_from_dict(data: dict, doc_id: str) -> User:
    return User(
        id=doc_id,
        email=data.get('email'),
        name=data.get('name'),
        alternate_names=data.get('alternate_names', []),
        role=data.get('role'),
        organization=data.get('organization'),
        is_deleted=data.get('is_deleted', False),
        deleted_at=data.get('deleted_at').datetime if data.get('deleted_at') else None,
        created_at=data.get('created_at').datetime,
        updated_at=data.get('updated_at').datetime
    )

def user_to_dict(user: UserCreate | UserUpdate) -> dict:
    data = user.dict(exclude_unset=True)
    if isinstance(user, UserCreate):
        data.update({
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'is_deleted': False,
            'deleted_at': None
        })
    else:
        data.update({
            'updated_at': datetime.utcnow()
        })
    return data
