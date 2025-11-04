"""
Password hashing and verification utilities
"""
import bcrypt
from config import Config

class PasswordHandler:
    """Handle password hashing and verification"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        # Convert password to bytes, ensuring it's not longer than 72 bytes
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]

        # Generate salt and hash
        salt = bcrypt.gensalt(rounds=Config.BCRYPT_ROUNDS)
        hashed = bcrypt.hashpw(password_bytes, salt)

        # Return as string
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            # Convert to bytes
            password_bytes = plain_password.encode('utf-8')
            if len(password_bytes) > 72:
                password_bytes = password_bytes[:72]

            hashed_bytes = hashed_password.encode('utf-8')

            # Verify
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False

    @staticmethod
    def needs_update(hashed_password: str) -> bool:
        """Check if password hash needs to be updated"""
        # With direct bcrypt, we don't have an easy way to check this
        # Return False as bcrypt hashes don't need updating unless algorithm changes
        return False
