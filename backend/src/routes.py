from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from firebase_admin import auth
from datetime import datetime

from .models import (
    User, UserCreate, UserUpdate,
    AuthSettings, AuthSettingsUpdate,
    AuthDomain, AuthDomainCreate, AuthDomainUpdate
)
from .crud import (
    create_user, get_user, update_user, delete_user,
    get_auth_settings, update_auth_settings,
    create_auth_domain, get_auth_domains, update_auth_domain,
    is_domain_allowed, log_auth_action
)
from .auth import get_current_user, admin_required

router = APIRouter()

# ユーザー管理エンドポイント
@router.post("/users", response_model=User)
async def create_new_user(
    user: UserCreate,
    current_user: User = Depends(admin_required)
):
    """新規ユーザーを作成（管理者のみ）"""
    try:
        # Firebaseユーザーを作成
        firebase_user = auth.create_user(
            email=user.email,
            display_name=user.name
        )
        
        # ユーザー情報を保存
        created_user = await create_user(user)
        
        # 監査ログを記録
        await log_auth_action(
            user_id=current_user.id,
            action="create_user",
            details=f"Created user: {user.email}",
            request=Request
        )
        
        return created_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users/{user_id}", response_model=User)
async def read_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """ユーザー情報を取得"""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=User)
async def update_user_info(
    user_id: str,
    user: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """ユーザー情報を更新"""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_user = await update_user(user_id, user)
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 監査ログを記録
    await log_auth_action(
        user_id=current_user.id,
        action="update_user",
        details=f"Updated user: {user_id}",
        request=Request
    )
    
    return updated_user

@router.delete("/users/{user_id}")
async def delete_user_account(
    user_id: str,
    current_user: User = Depends(admin_required)
):
    """ユーザーを削除（管理者のみ）"""
    if not await delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    # 監査ログを記録
    await log_auth_action(
        user_id=current_user.id,
        action="delete_user",
        details=f"Deleted user: {user_id}",
        request=Request
    )
    
    return {"status": "success"}

# 認証設定エンドポイント
@router.get("/auth/settings", response_model=AuthSettings)
async def read_auth_settings(
    current_user: User = Depends(get_current_user)
):
    """認証設定を取得"""
    return await get_auth_settings()

@router.put("/auth/settings", response_model=AuthSettings)
async def update_auth_settings_endpoint(
    settings: AuthSettingsUpdate,
    current_user: User = Depends(admin_required)
):
    """認証設定を更新（管理者のみ）"""
    updated_settings = await update_auth_settings(settings)
    
    # 監査ログを記録
    await log_auth_action(
        user_id=current_user.id,
        action="update_settings",
        details="Updated authentication settings",
        request=Request
    )
    
    return updated_settings

# ドメイン管理エンドポイント
@router.post("/auth/domains", response_model=AuthDomain)
async def create_domain(
    domain: AuthDomainCreate,
    current_user: User = Depends(admin_required)
):
    """許可ドメインを追加（管理者のみ）"""
    created_domain = await create_auth_domain(domain)
    
    # 監査ログを記録
    await log_auth_action(
        user_id=current_user.id,
        action="create_domain",
        details=f"Added domain: {domain.domain}",
        request=Request
    )
    
    return created_domain

@router.get("/auth/domains", response_model=List[AuthDomain])
async def list_domains(
    active_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """許可ドメイン一覧を取得"""
    return await get_auth_domains(active_only)

@router.put("/auth/domains/{domain_id}", response_model=AuthDomain)
async def update_domain(
    domain_id: str,
    domain: AuthDomainUpdate,
    current_user: User = Depends(admin_required)
):
    """許可ドメインを更新（管理者のみ）"""
    updated_domain = await update_auth_domain(domain_id, domain)
    if updated_domain is None:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    # 監査ログを記録
    await log_auth_action(
        user_id=current_user.id,
        action="update_domain",
        details=f"Updated domain: {domain_id}",
        request=Request
    )
    
    return updated_domain

# ドメイン検証エンドポイント
@router.get("/auth/validate-domain/{domain}")
async def validate_domain(
    domain: str,
    current_user: User = Depends(get_current_user)
):
    """ドメインが許可されているか確認"""
    is_allowed = await is_domain_allowed(domain)
    return {"is_allowed": is_allowed}
