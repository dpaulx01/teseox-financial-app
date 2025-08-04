from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password_hash = pwd_context.hash("admin123")
print(f"Password hash for 'admin123': {password_hash}")