#!/usr/bin/env python3
"""
Minimal RBAC API Server for Artyco Financial App
Only includes essential authentication and authorization features
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
import jwt
import uvicorn
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

print("🔍 DEBUG: Starting minimal RBAC API...")

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://artyco_user:artyco_password123@mysql-rbac:3306/artyco_financial_rbac')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role_id = Column(Integer, default=4)  # Simple column without FK for now
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    is_superuser: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

# FastAPI app
app = FastAPI(
    title="Artyco Financial RBAC API",
    description="Role-Based Access Control API for Artyco Financial Application",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:8001", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

print("🔍 DEBUG: FastAPI app created with RBAC models...")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/")
def root():
    return {"message": "Artyco Financial RBAC API is running!", "status": "ok"}

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "rbac-api"
    }

@app.get("/api/db-test")
def test_database(db: Session = Depends(get_db)):
    try:
        result = db.execute(text('SELECT 1 as test, NOW() as current_time_col'))
        row = result.fetchone()
        return {
            "database_status": "connected",
            "test_query": "success",
            "result": row[0] if row else None,
            "timestamp": str(row[1]) if row else None
        }
    except Exception as e:
        return {
            "database_status": "error",
            "error": str(e)
        }

@app.post("/api/auth/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(hours=JWT_EXPIRATION_HOURS)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRATION_HOURS * 3600
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser
    )

@app.get("/api/users", response_model=list[UserResponse])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).all()
    return [UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser
    ) for user in users]

# Import and include additional routes
try:
    from api_rbac_endpoints import router as rbac_router, init_rbac_data
    app.include_router(rbac_router)
    print("✅ RBAC management routes loaded")
    
    # Initialize RBAC data
    db = SessionLocal()
    init_rbac_data(db)
    db.close()
except ImportError as e:
    print(f"⚠️ RBAC management routes not available: {e}")

try:
    from api_financial_data import router as financial_router
    app.include_router(financial_router)
    print("✅ Financial Data API routes loaded")
except ImportError as e:
    print(f"⚠️ Financial Data API routes not available: {e}")

try:
    from api_financial import router as financial_legacy_router
    app.include_router(financial_legacy_router)
    print("✅ Legacy Financial API routes loaded")
except ImportError:
    print("⚠️ Legacy Financial API routes not available")

try:
    from api_csv_upload_exact_clone import router as csv_clone_router
    app.include_router(csv_clone_router)
    print("✅ CSV Upload EXACT CLONE routes loaded")
except ImportError as e:
    print(f"⚠️ CSV Upload clone routes not available: {e}")

if __name__ == "__main__":
    print("🔍 DEBUG: Starting uvicorn with minimal RBAC API...")
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except Exception as e:
        print(f"❌ ERROR starting server: {e}")
        import traceback
        traceback.print_exc()
        exit(1)