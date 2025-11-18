"""
Administration routes for roles, permissions and system management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database.connection import get_db
from models import User, Role, Permission, AuditLog
from auth.dependencies import require_permission, require_superuser, get_current_user

router = APIRouter(prefix="/admin", tags=["Administration"])

# Pydantic models
class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system_role: bool
    created_at: datetime
    permissions: List[dict]

class PermissionResponse(BaseModel):
    id: int
    resource: str
    action: str
    description: Optional[str]

class AssignPermissionsRequest(BaseModel):
    permission_ids: List[int]

# ============================================
# ROLES MANAGEMENT
# ============================================

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: User = Depends(require_permission("roles", "read")),
    db: Session = Depends(get_db)
):
    """List all roles"""
    
    roles = db.query(Role).all()
    
    return [
        RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system_role=role.is_system_role,
            created_at=role.created_at,
            permissions=[
                {"id": perm.id, "resource": perm.resource, "action": perm.action, "description": perm.description}
                for perm in role.permissions
            ]
        )
        for role in roles
    ]

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(require_permission("roles", "read")),
    db: Session = Depends(get_db)
):
    """Get role by ID"""
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        created_at=role.created_at,
        permissions=[
            {"id": perm.id, "resource": perm.resource, "action": perm.action, "description": perm.description}
            for perm in role.permissions
        ]
    )

@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_permission("roles", "write")),
    db: Session = Depends(get_db)
):
    """Create a new role"""
    
    # Check if role already exists
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    role = Role(
        name=role_data.name,
        description=role_data.description,
        is_system_role=False
    )
    
    db.add(role)
    db.flush()
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="role_created",
        resource="roles",
        resource_id=str(role.id),
        details={"name": role.name, "description": role.description}
    )
    
    db.commit()
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        created_at=role.created_at,
        permissions=[]
    )

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(require_permission("roles", "write")),
    db: Session = Depends(get_db)
):
    """Update role"""
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system roles"
        )
    
    # Check if new name already exists
    if role_data.name and role_data.name != role.name:
        existing = db.query(Role).filter(Role.name == role_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
    
    # Update fields
    update_data = role_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="role_updated",
        resource="roles",
        resource_id=str(role_id),
        details=update_data
    )
    
    db.commit()
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        created_at=role.created_at,
        permissions=[
            {"id": perm.id, "resource": perm.resource, "action": perm.action, "description": perm.description}
            for perm in role.permissions
        ]
    )

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    current_user: User = Depends(require_permission("roles", "write")),
    db: Session = Depends(get_db)
):
    """Delete role"""
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )
    
    # Check if role is in use
    if role.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete role that is assigned to users"
        )
    
    # Log action before deletion
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="role_deleted",
        resource="roles",
        resource_id=str(role_id),
        details={"name": role.name}
    )
    
    db.delete(role)
    db.commit()
    
    return {"message": "Role deleted successfully"}

@router.post("/roles/{role_id}/permissions")
async def assign_permissions_to_role(
    role_id: int,
    request: AssignPermissionsRequest,
    current_user: User = Depends(require_permission("roles", "write")),
    db: Session = Depends(get_db)
):
    """Assign permissions to role"""
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Get permissions
    permissions = db.query(Permission).filter(Permission.id.in_(request.permission_ids)).all()
    if len(permissions) != len(request.permission_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more permissions not found"
        )
    
    # Assign permissions
    role.permissions.clear()
    role.permissions.extend(permissions)
    
    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="permissions_assigned_to_role",
        resource="roles",
        resource_id=str(role_id),
        details={
            "role_name": role.name,
            "permission_ids": request.permission_ids,
            "permissions": [f"{p.resource}:{p.action}" for p in permissions]
        }
    )
    
    db.commit()
    
    return {
        "message": "Permissions assigned successfully",
        "permissions": [{"id": p.id, "resource": p.resource, "action": p.action} for p in permissions]
    }

# ============================================
# PERMISSIONS MANAGEMENT
# ============================================

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    resource: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("roles", "read")),
    db: Session = Depends(get_db)
):
    """List all permissions"""
    
    query = db.query(Permission)
    
    if resource:
        query = query.filter(Permission.resource == resource)
    
    permissions = query.all()
    
    return [
        PermissionResponse(
            id=perm.id,
            resource=perm.resource,
            action=perm.action,
            description=perm.description
        )
        for perm in permissions
    ]

@router.get("/permissions/resources")
async def list_resources(
    current_user: User = Depends(require_permission("roles", "read")),
    db: Session = Depends(get_db)
):
    """List all available resources"""
    
    resources = db.query(Permission.resource).distinct().all()
    
    return {"resources": [r[0] for r in resources]}

# ============================================
# AUDIT LOGS
# ============================================

@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("system", "audit")),
    db: Session = Depends(get_db)
):
    """Get audit logs (requires system:audit permission)"""
    
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action.contains(action))
    
    if resource:
        query = query.filter(AuditLog.resource == resource)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "username": log.user.username if log.user else None,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at
            }
            for log in logs
        ],
        "total": query.count()
    }

# ============================================
# SYSTEM STATS
# ============================================

@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(require_permission("system", "admin")),
    db: Session = Depends(get_db)
):
    """Get system statistics (requires system:admin permission)

    Superusers see global stats, regular admins see only their tenant's stats.
    """

    # Determine scope: global for superusers, tenant-specific for admins
    company_id = None if current_user.is_superuser else current_user.company_id

    # Count users (tenant-aware)
    user_query = db.query(User)
    if company_id:
        user_query = user_query.filter(User.company_id == company_id)
    total_users = user_query.count()
    active_users = user_query.filter(User.is_active == True).count()
    superusers = user_query.filter(User.is_superuser == True).count()

    # Count roles (global - roles are shared across tenants)
    total_roles = db.query(Role).count()
    system_roles = db.query(Role).filter(Role.is_system_role == True).count()

    # Count permissions (global - permissions are shared across tenants)
    total_permissions = db.query(Permission).count()

    # Active sessions (tenant-aware)
    from models import UserSession
    from datetime import datetime
    session_query = db.query(UserSession).filter(
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.utcnow()
    )
    if company_id:
        session_query = session_query.filter(UserSession.company_id == company_id)
    active_sessions = session_query.count()

    # Recent activity (tenant-aware)
    audit_query = db.query(AuditLog).filter(
        AuditLog.action == "login_success"
    )
    if company_id:
        audit_query = audit_query.filter(AuditLog.company_id == company_id)
    recent_logins = audit_query.order_by(AuditLog.created_at.desc()).limit(10).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "superusers": superusers,
            "inactive": total_users - active_users
        },
        "roles": {
            "total": total_roles,
            "system": system_roles,
            "custom": total_roles - system_roles
        },
        "permissions": {
            "total": total_permissions
        },
        "sessions": {
            "active": active_sessions
        },
        "activity": {
            "recent_logins": recent_logins
        }
    }