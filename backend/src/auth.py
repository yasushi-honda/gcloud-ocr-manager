from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, credentials, initialize_app
import os

from .crud import get_user, is_domain_allowed, log_auth_action

# Firebase Admin SDKの初期化
cred = credentials.Certificate(os.getenv('FIREBASE_ADMIN_CREDENTIALS'))
initialize_app(cred)

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Firebaseトークンを検証"""
    if not credentials:
        raise HTTPException(status_code=401, detail="認証情報が必要です")
    
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="無効なトークンです")

async def get_current_user(
    request: Request,
    token: dict = Depends(verify_token)
) -> Optional[dict]:
    """現在のユーザー情報を取得"""
    try:
        # ユーザー情報を取得
        user = await get_user(token.get('uid'))
        if not user:
            raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
        
        if user.is_deleted:
            raise HTTPException(status_code=403, detail="このアカウントは無効化されています")
        
        # ドメインの検証
        domain = user.email.split('@')[1]
        if not await is_domain_allowed(domain):
            # 監査ログを記録
            await log_auth_action(
                user_id=user.id,
                action="domain_access_denied",
                details=f"Domain access denied: {domain}",
                request=request
            )
            raise HTTPException(
                status_code=403,
                detail="このドメインからのアクセスは許可されていません"
            )
        
        # アクセスログを記録
        await log_auth_action(
            user_id=user.id,
            action="user_access",
            details="User accessed the system",
            request=request
        )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="認証に失敗しました")

async def admin_required(user = Depends(get_current_user)) -> dict:
    """管理者権限を確認"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="この操作には管理者権限が必要です"
        )
    return user
