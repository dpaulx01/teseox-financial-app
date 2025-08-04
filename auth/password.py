"""
Password hashing and verification utilities
"""
from passlib.context import CryptContext
from config import Config

# Create password context
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=Config.BCRYPT_ROUNDS
)

class PasswordHandler:
    """Handle password hashing and verification"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def needs_update(hashed_password: str) -> bool:
        """Check if password hash needs to be updated"""
        return pwd_context.needs_update(hashed_password)