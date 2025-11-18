"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import re
import secrets

from database.connection import get_db
from models import User, UserSession, AuditLog, Company
from auth.jwt_handler import JWTHandler
from auth.password import PasswordHandler
from auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pydantic models for requests/responses
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _slugify_company_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or f"company-{secrets.token_hex(4)}"


def _generate_unique_slug(_: Session, base_name: str) -> str:
    """
    Generate a unique slug for a company name.
    Uses random suffix to minimize collision probability.
    Relies on UNIQUE constraint in DB for final validation.
    """
    base_slug = _slugify_company_name(base_name)
    # Add random suffix to reduce collision probability
    # DB UNIQUE constraint will catch any remaining collisions
    random_suffix = secrets.token_hex(3)  # 6 hex chars
    return f"{base_slug}-{random_suffix}"

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT tokens"""
    
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == request.username) | (User.email == request.username)
    ).first()
    
    if not user or not PasswordHandler.verify_password(request.password, user.password_hash):
        # Log failed login attempt
        AuditLog.log_action(
            db, 
            user_id=user.id if user else None,
            action="login_failed",
            details={"username": request.username},
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent")
        )
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    if not user.company_id or not user.company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )
    
    if not user.company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is disabled"
        )
    
    if not user.company.is_subscription_active():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Company subscription expired"
        )
    
    # Get user permissions
    permissions = [f"{p[0]}:{p[1]}" for p in user.get_permissions()]
    company_id = user.company_id
    
    # Create tokens
    access_token = JWTHandler.create_access_token(
        user_id=user.id,
        username=user.username,
        email=user.email,
        permissions=permissions,
        company_id=company_id
    )
    
    refresh_token = JWTHandler.create_refresh_token(user.id)
    
    # Store session
    token_hash = JWTHandler.get_token_hash(access_token)
    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
        expires_at=datetime.utcnow().replace(hour=23, minute=59, second=59)  # End of day
    )
    db.add(session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Log successful login
    AuditLog.log_action(
        db,
        user_id=user.id,
        action="login_success",
        details={"username": user.username},
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent")
    )
    
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600 * 24,  # 24 hours in seconds
        user={
            "id": user.id,
            "company_id": company_id,
            "company_name": user.company.name if user.company else None,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_superuser": user.is_superuser,
            "roles": [role.name for role in user.roles],
            "permissions": permissions
        }
    )

@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == request.username) | (User.email == request.email)
    ).first()
    
    if existing_user:
        detail = "Username already registered" if existing_user.username == request.username else "Email already registered"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    
    # Determine company assignment or creation
    company: Optional[Company] = None
    created_company = False

    if request.company_id:
        company = db.query(Company).filter(Company.id == request.company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found"
            )
    elif request.company_name:
        # Try up to 3 times to create company with unique slug
        max_retries = 3
        for attempt in range(max_retries):
            try:
                slug = _generate_unique_slug(db, request.company_name)
                trial_expires = datetime.utcnow() + timedelta(days=30)
                company = Company(
                    name=request.company_name.strip(),
                    slug=slug,
                    industry=request.industry,
                    subscription_tier="trial",
                    subscription_expires_at=trial_expires,
                    is_active=True,
                )
                db.add(company)
                db.flush()
                created_company = True
                break  # Success
            except IntegrityError as e:
                db.rollback()
                if attempt == max_retries - 1:
                    # Last attempt failed
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not generate unique company slug. Please try a different company name."
                    )
                # Retry with new random suffix
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="company_id or company_name is required to register"
        )

    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is disabled"
        )

    if not company.is_subscription_active():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Company subscription expired"
        )

    # Enforce max users per company with pessimistic lock to prevent race conditions
    # Lock the company row to ensure atomic user count check + insert
    company_locked = db.query(Company).filter(
        Company.id == company.id
    ).with_for_update().first()

    if not company_locked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Count users while holding the lock
    current_user_count = db.query(func.count(User.id)).filter(
        User.company_id == company.id
    ).scalar()

    if company_locked.max_users and current_user_count >= company_locked.max_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company user limit reached ({company_locked.max_users} users max)"
        )

    # Create new user (still holding lock, guarantees atomicity)
    hashed_password = PasswordHandler.hash_password(request.password)
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hashed_password,
        first_name=request.first_name,
        last_name=request.last_name,
        is_active=True,
        company_id=company.id
    )
    
    db.add(user)
    db.flush()  # Get user ID
    
    # Assign default role (viewer)
    from models import Role
    default_role = db.query(Role).filter(Role.name == "viewer").first()
    if default_role:
        user.roles.append(default_role)

    if created_company or company.created_by is None:
        company.created_by = user.id
    
    # Log registration
    AuditLog.log_action(
        db,
        user_id=user.id,
        action="user_registered",
        details={"username": user.username, "email": user.email},
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent")
    )
    
    db.commit()
    
    # Auto-login after registration
    permissions = [f"{p[0]}:{p[1]}" for p in user.get_permissions()]
    
    access_token = JWTHandler.create_access_token(
        user_id=user.id,
        username=user.username,
        email=user.email,
        permissions=permissions,
        company_id=user.company_id
    )
    
    refresh_token = JWTHandler.create_refresh_token(user.id)
    
    # Store session
    token_hash = JWTHandler.get_token_hash(access_token)
    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
        expires_at=datetime.utcnow().replace(hour=23, minute=59, second=59)
    )
    db.add(session)
    db.commit()
    db.refresh(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600 * 24,
        user={
            "id": user.id,
            "company_id": user.company_id,
            "company_name": user.company.name if user.company else None,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_superuser": user.is_superuser,
            "roles": [role.name for role in user.roles],
            "permissions": permissions
        }
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    payload = JWTHandler.verify_token(request.refresh_token)
    if not payload or payload.get('type') != 'refresh':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get('user_id')
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    if not user.company or not user.company.is_subscription_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company inactive or subscription expired"
        )
    
    # Create new tokens
    permissions = [f"{p[0]}:{p[1]}" for p in user.get_permissions()]
    company_id = user.company_id
    
    access_token = JWTHandler.create_access_token(
        user_id=user.id,
        username=user.username,
        email=user.email,
        permissions=permissions,
        company_id=company_id
    )
    
    new_refresh_token = JWTHandler.create_refresh_token(user.id)
    
    # Store new session
    token_hash = JWTHandler.get_token_hash(access_token)
    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
        expires_at=datetime.utcnow().replace(hour=23, minute=59, second=59)
    )
    db.add(session)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=3600 * 24,
        user={
            "id": user.id,
            "company_id": company_id,
            "company_name": user.company.name if user.company else None,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_superuser": user.is_superuser,
            "roles": [role.name for role in user.roles],
            "permissions": permissions
        }
    )

@router.post("/logout")
async def logout(
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user and revoke token"""
    
    # Get token from header
    auth_header = http_request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        token_hash = JWTHandler.get_token_hash(token)
        
        # Revoke session
        session = db.query(UserSession).filter(
            UserSession.token_hash == token_hash,
            UserSession.user_id == current_user.id
        ).first()
        
        if session:
            session.revoke()
    
    # Log logout
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="logout",
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent")
    )
    
    db.commit()
    
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    permissions = [f"{p[0]}:{p[1]}" for p in current_user.get_permissions()]
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login,
        "roles": [{"id": role.id, "name": role.name, "description": role.description} for role in current_user.roles],
        "permissions": permissions
    }

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    # Verify current password
    if not PasswordHandler.verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = PasswordHandler.hash_password(request.new_password)
    
    # Log password change
    AuditLog.log_action(
        db,
        user_id=current_user.id,
        action="password_changed"
    )
    
    db.commit()
    
    return {"message": "Password changed successfully"}
