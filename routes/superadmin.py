"""
Super Admin routes - Cross-tenant management
Requiere is_superuser=True
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
from datetime import datetime, timedelta
import re
import asyncio
import time
from collections import defaultdict, deque

from database.connection import get_db
from models import User, Company, AuditLog, Role
from auth.dependencies import require_superuser, get_current_user
from auth.password import PasswordHandler

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

# Rate limiting (in-memory) for superadmin routes
SUPERADMIN_RATE_LIMIT = 100  # requests per window
SUPERADMIN_WINDOW_SECONDS = 60
_rate_limit_store = defaultdict(deque)
_rate_limit_lock = asyncio.Lock()


async def superadmin_rate_limit(current_user: User = Depends(require_superuser())):
    """
    Apply a simple per-user rate limit for superadmin endpoints.
    """
    now = time.time()
    async with _rate_limit_lock:
        dq = _rate_limit_store[current_user.id]
        # drop old requests
        while dq and dq[0] <= now - SUPERADMIN_WINDOW_SECONDS:
            dq.popleft()
        if len(dq) >= SUPERADMIN_RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Límite de {SUPERADMIN_RATE_LIMIT} solicitudes por minuto para superadmin alcanzado"
            )
        dq.append(now)
    return current_user

# ===========================================================================
# VALIDATION HELPERS
# ===========================================================================

def validate_slug(slug: str) -> str:
    """
    Validate slug contains only lowercase letters, numbers, and hyphens
    """
    if not slug:
        return slug
    if not re.match(r'^[a-z0-9-]+$', slug):
        raise ValueError("Slug solo puede contener letras minúsculas, números y guiones")
    if slug.startswith('-') or slug.endswith('-'):
        raise ValueError("Slug no puede comenzar o terminar con guión")
    if '--' in slug:
        raise ValueError("Slug no puede contener guiones consecutivos")
    return slug

# ===========================================================================
# PYDANTIC MODELS
# ===========================================================================

class CompanyCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    industry: Optional[str] = None
    subscription_tier: str = "trial"  # trial/professional/enterprise
    max_users: int = 5

    @validator('slug')
    def validate_slug_format(cls, v):
        if v:
            return validate_slug(v)
        return v

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre de la empresa es requerido")
        if len(v.strip()) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return v.strip()

    @validator('max_users')
    def validate_max_users(cls, v):
        if v < 1:
            raise ValueError("max_users debe ser al menos 1")
        if v > 10000:
            raise ValueError("max_users no puede exceder 10000")
        return v

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None

class CompanyStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int

class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str
    industry: Optional[str]
    is_active: bool
    subscription_tier: str
    subscription_expires_at: Optional[datetime]
    max_users: int
    created_at: datetime
    stats: Optional[CompanyStats] = None

class SuperAdminUserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    company_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_superuser: bool = False

    @validator('username')
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError("El username es requerido")
        if len(v.strip()) < 3:
            raise ValueError("El username debe tener al menos 3 caracteres")
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("El username solo puede contener letras, números, guiones y guiones bajos")
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError("El password es requerido")
        if len(v) < 6:
            raise ValueError("El password debe tener al menos 6 caracteres")
        return v

class SuperAdminUserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

    @validator('username')
    def validate_username(cls, v):
        if v is not None and v:
            if len(v.strip()) < 3:
                raise ValueError("El username debe tener al menos 3 caracteres")
            if not re.match(r'^[a-zA-Z0-9_-]+$', v):
                raise ValueError("El username solo puede contener letras, números, guiones y guiones bajos")
            return v.strip()
        return v

    @validator('password')
    def validate_password(cls, v):
        if v is not None and v:
            if len(v) < 6:
                raise ValueError("El password debe tener al menos 6 caracteres")
        return v

class RoleInfo(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_system_role: bool

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    company_id: int
    company_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: List[RoleInfo] = []

class AssignRolesRequest(BaseModel):
    role_ids: List[int]

# ===========================================================================
# COMPANIES MANAGEMENT
# ===========================================================================

@router.get("/companies", response_model=List[CompanyResponse])
async def list_all_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tier: Optional[str] = None,
    active_only: bool = False,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    List all companies (super admin only)

    Query parameters:
    - skip: Number of companies to skip (pagination)
    - limit: Max companies to return
    - tier: Filter by subscription tier (trial/professional/enterprise)
    - active_only: Only show active companies
    """
    query = db.query(Company)

    if active_only:
        query = query.filter(Company.is_active == True)
    if tier:
        query = query.filter(Company.subscription_tier == tier)

    companies = query.offset(skip).limit(limit).all()

    result = []
    for company in companies:
        # Calculate stats
        all_users = db.query(User).filter(User.company_id == company.id).all()
        stats = CompanyStats(
            total_users=len(all_users),
            active_users=len([u for u in all_users if u.is_active]),
            inactive_users=len([u for u in all_users if not u.is_active])
        )

        result.append(CompanyResponse(
            id=company.id,
            name=company.name,
            slug=company.slug or "",
            industry=company.industry,
            is_active=company.is_active,
            subscription_tier=company.subscription_tier,
            subscription_expires_at=company.subscription_expires_at,
            max_users=company.max_users,
            created_at=company.created_at,
            stats=stats
        ))

    return result

@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Create new company (super admin only)
    """
    from routes.auth import _generate_unique_slug
    from sqlalchemy.exc import IntegrityError

    # Generate unique slug with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            slug = data.slug or _generate_unique_slug(db, data.name)

            # Calculate expiration for trial
            expires_at = None
            if data.subscription_tier == "trial":
                expires_at = datetime.utcnow() + timedelta(days=30)

            company = Company(
                name=data.name,
                slug=slug,
                industry=data.industry,
                subscription_tier=data.subscription_tier,
                subscription_expires_at=expires_at,
                max_users=data.max_users,
                is_active=True,
                created_by=current_user.id
            )

            db.add(company)
            db.flush()

            # Log action
            AuditLog.log_action(
                db,
                user_id=current_user.id,
                action="company_created_by_superadmin",
                resource="companies",
                resource_id=str(company.id),
                details={
                    "name": data.name,
                    "tier": data.subscription_tier,
                    "max_users": data.max_users
                }
            )

            db.commit()
            db.refresh(company)

            return CompanyResponse(
                id=company.id,
                name=company.name,
                slug=company.slug,
                industry=company.industry,
                is_active=company.is_active,
                subscription_tier=company.subscription_tier,
                subscription_expires_at=company.subscription_expires_at,
                max_users=company.max_users,
                created_at=company.created_at
            )
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not generate unique company slug"
                )

@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Update company details (super admin only)
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Update fields
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    # Log action
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="company_updated_by_superadmin",
        resource="companies",
        resource_id=str(company_id),
        details=update_data
    )

    db.commit()
    db.refresh(company)

    return CompanyResponse(
        id=company.id,
        name=company.name,
        slug=company.slug or "",
        industry=company.industry,
        is_active=company.is_active,
        subscription_tier=company.subscription_tier,
        subscription_expires_at=company.subscription_expires_at,
        max_users=company.max_users,
        created_at=company.created_at
    )

@router.post("/companies/{company_id}/deactivate")
async def deactivate_company(
    company_id: int,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Deactivate company (blocks all users from this company)
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    company.is_active = False

    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="company_deactivated",
        resource="companies",
        resource_id=str(company_id),
        details={"company_name": company.name}
    )

    db.commit()

    return {
        "message": f"Company '{company.name}' deactivated successfully",
        "company_id": company_id
    }

@router.post("/companies/{company_id}/activate")
async def activate_company(
    company_id: int,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Activate company
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    company.is_active = True

    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="company_activated",
        resource="companies",
        resource_id=str(company_id),
        details={"company_name": company.name}
    )

    db.commit()

    return {
        "message": f"Company '{company.name}' activated successfully",
        "company_id": company_id
    }

# ===========================================================================
# CROSS-TENANT USER MANAGEMENT
# ===========================================================================

@router.get("/roles", response_model=List[RoleInfo])
async def list_roles(
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    List all roles (super admin only)
    """
    roles = db.query(Role).all()
    return [
        RoleInfo(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system_role=role.is_system_role
        )
        for role in roles
    ]

@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    company_id: Optional[int] = None,
    active_only: bool = False,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    List all users across all companies (super admin only)
    """
    query = db.query(User)

    if company_id:
        query = query.filter(User.company_id == company_id)
    if active_only:
        query = query.filter(User.is_active == True)

    users = query.offset(skip).limit(limit).all()

    return [
        UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            company_id=user.company_id,
            company_name=user.company.name if user.company else "N/A",
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            roles=[
                RoleInfo(
                    id=role.id,
                    name=role.name,
                    description=role.description,
                    is_system_role=role.is_system_role
                )
                for role in user.roles
            ]
        )
        for user in users
    ]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_for_company(
    data: SuperAdminUserCreate,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Create user for any company (super admin only)
    """
    try:
        # Verify company exists
        company = db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {data.company_id} not found"
            )

        # Check max_users with lock
        company_locked = db.query(Company).filter(
            Company.id == data.company_id
        ).with_for_update().first()

        current_user_count = db.query(func.count(User.id)).filter(
            User.company_id == data.company_id
        ).scalar()

        if company_locked.max_users and current_user_count >= company_locked.max_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company reached max users ({company_locked.max_users})"
            )

        # Check username/email unique
        existing = db.query(User).filter(
            (User.username == data.username) | (User.email == data.email)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )

        # Create user
        user = User(
            username=data.username,
            email=data.email,
            password_hash=PasswordHandler.hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            company_id=data.company_id,
            is_active=True,
            is_superuser=data.is_superuser
        )

        db.add(user)
        db.flush()

        # Assign default viewer role
        default_role = db.query(Role).filter(Role.name == "viewer").first()
        if default_role:
            user.roles.append(default_role)

        AuditLog.log_action(
            db,
            user_id=current_user.id,
            action="user_created_by_superadmin",
            resource="users",
            resource_id=str(user.id),
            details={
                "username": data.username,
                "company_id": data.company_id,
                "company_name": company.name
            }
        )

        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            company_id=user.company_id,
            company_name=company.name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            roles=[
                RoleInfo(
                    id=role.id,
                    name=role.name,
                    description=role.description,
                    is_system_role=role.is_system_role
                )
                for role in user.roles
            ]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.put("/users/{user_id}/change-company")
async def change_user_company(
    user_id: int,
    new_company_id: int,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Move user to different company (super admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    new_company = db.query(Company).filter(Company.id == new_company_id).first()
    if not new_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target company not found"
        )

    old_company_id = user.company_id
    user.company_id = new_company_id

    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_company_changed",
        resource="users",
        resource_id=str(user_id),
        details={
            "username": user.username,
            "old_company_id": old_company_id,
            "new_company_id": new_company_id,
            "new_company_name": new_company.name
        }
    )

    db.commit()

    return {
        "message": f"User '{user.username}' moved to company '{new_company.name}'",
        "user_id": user_id,
        "new_company_id": new_company_id
    }

@router.post("/users/{user_id}/roles")
async def assign_roles_superadmin(
    user_id: int,
    request: AssignRolesRequest,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Assign roles to any user (super admin only)
    """
    from models.user import user_roles

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    roles = db.query(Role).filter(Role.id.in_(request.role_ids)).all()
    if len(roles) != len(request.role_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more roles not found"
        )

    # Manually delete existing role assignments because user_roles table has extra columns
    db.execute(user_roles.delete().where(user_roles.c.user_id == user_id))

    # Insert new role assignments
    for role in roles:
        db.execute(
            user_roles.insert().values(
                user_id=user_id,
                role_id=role.id,
                assigned_by=current_user.id
            )
        )

    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="roles_assigned_by_superadmin",
        resource="users",
        resource_id=str(user_id),
        details={"role_ids": request.role_ids, "role_names": [r.name for r in roles]}
    )

    db.commit()

    return {
        "message": "Roles assigned successfully",
        "roles": [{"id": r.id, "name": r.name} for r in roles]
    }

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_superadmin(
    user_id: int,
    data: SuperAdminUserUpdate,
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Update user fields (super admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.username:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        user.username = data.username
    if data.email:
        existing_email = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.password:
        user.password_hash = PasswordHandler.hash_password(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_superuser is not None:
        user.is_superuser = data.is_superuser

    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="user_updated_by_superadmin",
        resource="users",
        resource_id=str(user.id),
        details={
            "username": user.username,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
        }
    )

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        company_id=user.company_id,
        company_name=user.company.name if user.company else "N/A",
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        roles=[
            RoleInfo(
                id=role.id,
                name=role.name,
                description=role.description,
                is_system_role=role.is_system_role
            )
            for role in user.roles
        ]
    )

# ===========================================================================
# ANALYTICS DASHBOARD
# ===========================================================================

@router.get("/analytics/overview")
async def get_analytics_overview(
    current_user: User = Depends(superadmin_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide analytics (super admin only)
    """
    # Companies stats
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.is_active == True).count()

    trial_companies = db.query(Company).filter(
        Company.subscription_tier == "trial"
    ).count()
    professional_companies = db.query(Company).filter(
        Company.subscription_tier == "professional"
    ).count()
    enterprise_companies = db.query(Company).filter(
        Company.subscription_tier == "enterprise"
    ).count()

    # Users stats
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    superusers = db.query(User).filter(User.is_superuser == True).count()

    return {
        "companies": {
            "total": total_companies,
            "active": active_companies,
            "inactive": total_companies - active_companies,
            "by_tier": {
                "trial": trial_companies,
                "professional": professional_companies,
                "enterprise": enterprise_companies
            }
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "superusers": superusers
        }
    }
