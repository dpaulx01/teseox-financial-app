"""
User management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from database.connection import get_db
from models import User, Role, AuditLog
from auth.dependencies import require_permission, require_superuser, get_current_user
from auth.password import PasswordHandler

router = APIRouter(prefix="/users", tags=["User Management"])

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime]
    roles: List[dict]

class AssignRoleRequest(BaseModel):
    role_ids: List[int]

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """List all users (requires users:read permission)"""
    
    query = db.query(User)
    
    if search:
        query = query.filter(
            (User.username.contains(search)) |
            (User.email.contains(search)) |
            (User.first_name.contains(search)) |
            (User.last_name.contains(search))
        )
    
    users = query.offset(skip).limit(limit).all()
    
    return [
        UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            last_login=user.last_login,
            roles=[{"id": role.id, "name": role.name, "description": role.description} for role in user.roles]
        )
        for user in users
    ]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login=user.last_login,
        roles=[{"id": role.id, "name": role.name, "description": role.description} for role in user.roles]
    )

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_permission("users", "write")),
    db: Session = Depends(get_db)
):
    """Create a new user (requires users:write permission)"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        detail = "Username already exists" if existing_user.username == user_data.username else "Email already exists"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    
    # Create user
    hashed_password = PasswordHandler.hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        is_active=user_data.is_active
    )
    
    db.add(user)
    db.flush()
    
    # Assign default viewer role
    default_role = db.query(Role).filter(Role.name == "viewer").first()
    if default_role:
        user.roles.append(default_role)
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_created",
        resource="users",
        resource_id=str(user.id),
        details={"username": user.username, "email": user.email}
    )
    
    db.commit()
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login=user.last_login,
        roles=[{"id": role.id, "name": role.name, "description": role.description} for role in user.roles]
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_permission("users", "write")),
    db: Session = Depends(get_db)
):
    """Update user (requires users:write permission)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if new username/email already exists
    if user_data.username and user_data.username != user.username:
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    
    if user_data.email and user_data.email != user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    
    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_updated",
        resource="users",
        resource_id=str(user_id),
        details=update_data
    )
    
    db.commit()
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login=user.last_login,
        roles=[{"id": role.id, "name": role.name, "description": role.description} for role in user.roles]
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("users", "delete")),
    db: Session = Depends(get_db)
):
    """Delete user (requires users:delete permission)"""
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Log action before deletion
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_deleted",
        resource="users",
        resource_id=str(user_id),
        details={"username": user.username, "email": user.email}
    )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/{user_id}/roles")
async def assign_roles(
    user_id: int,
    request: AssignRoleRequest,
    current_user: User = Depends(require_permission("roles", "assign")),
    db: Session = Depends(get_db)
):
    """Assign roles to user (requires roles:assign permission)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get roles
    roles = db.query(Role).filter(Role.id.in_(request.role_ids)).all()
    if len(roles) != len(request.role_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more roles not found"
        )
    
    # Assign roles
    user.roles.clear()
    user.roles.extend(roles)
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="roles_assigned",
        resource="users",
        resource_id=str(user_id),
        details={"role_ids": request.role_ids, "role_names": [role.name for role in roles]}
    )
    
    db.commit()
    
    return {
        "message": "Roles assigned successfully",
        "roles": [{"id": role.id, "name": role.name} for role in roles]
    }

@router.get("/{user_id}/permissions")
async def get_user_permissions(
    user_id: int,
    current_user: User = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """Get user permissions"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    permissions = user.get_permissions()
    
    return {
        "user_id": user_id,
        "username": user.username,
        "is_superuser": user.is_superuser,
        "permissions": [{"resource": p[0], "action": p[1]} for p in permissions]
    }

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_permission("users", "write")),
    db: Session = Depends(get_db)
):
    """Deactivate user account"""
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    
    # Revoke all active sessions
    from models import UserSession
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None)
    ).all()
    
    for session in active_sessions:
        session.revoke()
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_deactivated",
        resource="users",
        resource_id=str(user_id),
        details={"username": user.username}
    )
    
    db.commit()
    
    return {"message": "User deactivated successfully"}

@router.post("/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_permission("users", "write")),
    db: Session = Depends(get_db)
):
    """Activate user account"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_activated",
        resource="users",
        resource_id=str(user_id),
        details={"username": user.username}
    )
    
    db.commit()
    
    return {"message": "User activated successfully"}