"""
JWT token handling for authentication
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from config import Config

class JWTHandler:
    """Handle JWT token creation and verification"""
    
    @staticmethod
    def create_access_token(
        user_id: int,
        username: str,
        email: str,
        permissions: list = None,
        company_id: Optional[int] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a new JWT access token"""
        if expires_delta is None:
            expires_delta = timedelta(hours=Config.JWT_EXPIRATION_HOURS)
        
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "permissions": permissions or [],
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        if company_id is not None:
            payload["company_id"] = company_id
        
        return jwt.encode(
            payload,
            Config.JWT_SECRET_KEY,
            algorithm=Config.JWT_ALGORITHM
        )
    
    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Create a refresh token"""
        expire = datetime.utcnow() + timedelta(days=7)  # 7 days for refresh token
        
        payload = {
            "user_id": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        return jwt.encode(
            payload,
            Config.JWT_SECRET_KEY,
            algorithm=Config.JWT_ALGORITHM
        )
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None  # Token expired
        except jwt.InvalidTokenError:
            return None  # Invalid token
    
    @staticmethod
    def extract_user_id(token: str) -> Optional[int]:
        """Extract user ID from token"""
        payload = JWTHandler.verify_token(token)
        if payload:
            return payload.get('user_id')
        return None
    
    @staticmethod
    def is_token_expired(token: str) -> bool:
        """Check if token is expired"""
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM],
                options={"verify_exp": False}  # Don't verify expiration here
            )
            exp_timestamp = payload.get('exp')
            if exp_timestamp:
                exp_datetime = datetime.fromtimestamp(exp_timestamp)
                return datetime.utcnow() > exp_datetime
            return True
        except jwt.InvalidTokenError:
            return True
    
    @staticmethod
    def get_token_hash(token: str) -> str:
        """Get a hash of the token for storage"""
        import hashlib
        return hashlib.sha256(token.encode()).hexdigest()
