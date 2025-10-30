"""
Configuration module that adapts to different environments
"""
import os
from typing import Optional

class Config:
    """Base configuration"""
    
    # Environment detection
    IS_PRODUCTION = os.getenv('ENVIRONMENT', 'development') == 'production'
    IS_SITEGROUND = os.path.exists('/home/customer/www') or os.getenv('SITEGROUND', 'false').lower() == 'true'
    
    # Database configuration
    if IS_SITEGROUND:
        # SiteGround MySQL configuration
        DB_HOST = os.getenv('DB_HOST', 'localhost')
        DB_PORT = int(os.getenv('DB_PORT', '3306'))
        DB_NAME = os.getenv('DB_NAME', 'customer_artyco_rbac')
        DB_USER = os.getenv('DB_USER', 'customer_artyco')
        DB_PASSWORD = os.getenv('DB_PASSWORD', '')
        
        DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # Local/Docker configuration
        DATABASE_URL = os.getenv(
            'DATABASE_URL',
            'mysql+pymysql://artyco_user:artyco_password123@localhost:3307/artyco_financial_rbac'
        )
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    
    # API Configuration
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', '8001' if not IS_SITEGROUND else '8000'))
    
    # CORS Configuration
    if IS_PRODUCTION:
        # Production: allow frontend domain and localhost for testing
        default_origins = 'https://cfg.artycoec.com,http://localhost:3001,http://localhost:5173'
        CORS_ORIGINS = os.getenv('CORS_ORIGINS', default_origins).split(',')
    else:
        # Development: allow all common dev ports
        default_origins = 'http://localhost:3001,http://localhost:5173,http://localhost:3000'
        CORS_ORIGINS = os.getenv('CORS_ORIGINS', default_origins).split(',')
    
    # Security
    BCRYPT_ROUNDS = int(os.getenv('BCRYPT_ROUNDS', '12'))
    SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', '60'))
    
    # Brain System
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    BRAIN_LOG_LEVEL = os.getenv('BRAIN_LOG_LEVEL', 'INFO')
    
    # Development
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true' and not IS_PRODUCTION
    RELOAD = os.getenv('RELOAD', 'true').lower() == 'true' and not IS_PRODUCTION
    
    # File paths
    if IS_SITEGROUND:
        # Permitir configurar la ruta raíz vía variable de entorno
        SITEGROUND_ROOT = os.getenv(
            'SITEGROUND_PROJECT_ROOT',
            '/home/customer/www/artyco-financial-app-rbac'
        )
        BASE_DIR = SITEGROUND_ROOT
        UPLOAD_DIR = os.path.join(SITEGROUND_ROOT, 'uploads')
        LOG_DIR = os.path.join(SITEGROUND_ROOT, 'logs')
    else:
        # Local paths
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
        LOG_DIR = os.path.join(BASE_DIR, 'logs')
    
    @classmethod
    def get_database_url(cls) -> str:
        """Get database URL based on environment"""
        return cls.DATABASE_URL
    
    @classmethod
    def is_docker(cls) -> bool:
        """Check if running in Docker"""
        return os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER', 'false').lower() == 'true'
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories"""
        for directory in [cls.UPLOAD_DIR, cls.LOG_DIR]:
            os.makedirs(directory, exist_ok=True)

# Create directories on import
Config.create_directories()
