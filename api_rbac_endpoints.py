"""
RBAC Management Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, text
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import sys
sys.path.append('.')

from api_rbac_minimal import get_db, get_current_user, User, Base, get_password_hash

router = APIRouter(prefix="/api", tags=["RBAC Management"])

# Additional Models
class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    users = relationship("User", secondary="user_roles", back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    resource = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(String(255))
    
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

# Association tables
user_roles = Table('user_roles', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

# Update User model to include role relationship
# Note: role_id is now defined in the User model itself
User.roles = relationship("Role", secondary=user_roles, back_populates="users")

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role_id: int = 4
    is_active: bool = True
    is_superuser: bool = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

class UserFullResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    is_superuser: bool
    role_id: Optional[int]
    created_at: datetime

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]

class PermissionResponse(BaseModel):
    id: int
    name: str
    resource: str
    action: str
    description: Optional[str]

# Helper function
def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# User Management Endpoints
@router.get("/users", response_model=List[UserFullResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=UserFullResponse)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if username or email already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role_id=user_data.role_id,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.put("/users/{user_id}", response_model=UserFullResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_data.username is not None:
        db_user.username = user_data.username
    if user_data.email is not None:
        db_user.email = user_data.email
    if user_data.password is not None:
        db_user.password_hash = get_password_hash(user_data.password)
    if user_data.first_name is not None:
        db_user.first_name = user_data.first_name
    if user_data.last_name is not None:
        db_user.last_name = user_data.last_name
    if user_data.role_id is not None:
        db_user.role_id = user_data.role_id
    if user_data.is_active is not None:
        db_user.is_active = user_data.is_active
    if user_data.is_superuser is not None:
        db_user.is_superuser = user_data.is_superuser
    
    db_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(db_user)
    db.commit()
    
    return {"message": "User deleted successfully"}

# Role Management Endpoints
@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()
    return roles

@router.get("/roles/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    return role

# Permission Management Endpoints
@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    permissions = db.query(Permission).all()
    return permissions

@router.get("/permissions/{permission_id}", response_model=PermissionResponse)
def get_permission(
    permission_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    return permission

# Initialize default data if needed
def init_rbac_data(db: Session):
    """Initialize default roles and permissions if they don't exist"""
    try:
        # Check if roles exist
        if db.query(Role).count() == 0:
            default_roles = [
                Role(id=1, name="Admin", description="Full system access"),
                Role(id=2, name="Manager", description="Financial management access"),
                Role(id=3, name="Analyst", description="Analysis and reporting access"),
                Role(id=4, name="Viewer", description="Read-only access")
            ]
            db.add_all(default_roles)
            db.commit()
            print("✅ Default roles created")
        
        # Check if permissions exist
        if db.query(Permission).count() == 0:
            default_permissions = [
                Permission(name="users.read", resource="users", action="read", description="View users"),
                Permission(name="users.write", resource="users", action="write", description="Create/Edit users"),
                Permission(name="users.delete", resource="users", action="delete", description="Delete users"),
                Permission(name="financial.read", resource="financial", action="read", description="View financial data"),
                Permission(name="financial.write", resource="financial", action="write", description="Edit financial data"),
                Permission(name="financial.delete", resource="financial", action="delete", description="Delete financial data"),
                Permission(name="reports.read", resource="reports", action="read", description="View reports"),
                Permission(name="reports.write", resource="reports", action="write", description="Create/Edit reports"),
                Permission(name="config.read", resource="config", action="read", description="View configuration"),
                Permission(name="config.write", resource="config", action="write", description="Edit configuration")
            ]
            db.add_all(default_permissions)
            db.commit()
            print("✅ Default permissions created")
            
    except Exception as e:
        print(f"⚠️ Error initializing RBAC data: {e}")
        db.rollback()