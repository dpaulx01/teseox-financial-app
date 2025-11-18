"""
FastAPI dependencies for authentication and authorization
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple

from database.connection import get_db
from models import User, UserSession
from auth.jwt_handler import JWTHandler
from auth.permissions import PermissionChecker
from auth.tenant_context import get_current_tenant, set_current_tenant

# Security scheme
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    
    # Verify token
    payload = JWTHandler.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.company_id or not user.company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to a company",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    company = user.company
    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not company.is_subscription_active():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Company subscription expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if session exists and is active
    token_hash = JWTHandler.get_token_hash(token)
    session = db.query(UserSession).filter(
        UserSession.token_hash == token_hash,
        UserSession.user_id == user_id
    ).first()
    
    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if get_current_tenant() is None:
        set_current_tenant(user.company_id)
    
    return user

async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

def require_permissions(required_permissions: List[Tuple[str, str]], require_all: bool = True):
    """Dependency factory for permission checking with policy engine support"""
    async def check_permissions(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Use Policy Engine for advanced permission evaluation
        from auth.policy_engine import PolicyEngine

        has_access = PolicyEngine.check_multiple_permissions(
            current_user,
            required_permissions,
            db,
            require_all,
            current_user.company_id
        )

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        return current_user

    return check_permissions

def require_permission(resource: str, action: str):
    """Dependency factory for single permission checking"""
    return require_permissions([(resource, action)])

def require_role(role_name: str):
    """Dependency factory for role checking"""
    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.has_role(role_name) and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required"
            )
        return current_user
    
    return check_role

def require_superuser():
    """Dependency for superuser checking"""
    async def check_superuser(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required"
            )
        return current_user
    
    return check_superuser

def require_active_user():
    """Dependency for active user checking"""
    async def check_active_user(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled"
            )
        return current_user
    
    return check_active_user
