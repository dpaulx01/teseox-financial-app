#!/bin/bash
# Setup script for SiteGround deployment

echo "=== Artyco Financial App RBAC - SiteGround Setup ==="

# Check if we're on SiteGround
if [ ! -d "/home/customer/www" ]; then
    echo "Warning: This doesn't appear to be a SiteGround environment"
    echo "Continue anyway? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Configuration
PROJECT_DIR="/home/customer/www/artyco-financial-app-rbac"
PYTHON_VERSION="3.9"  # SiteGround typically supports 3.9
VENV_DIR="$PROJECT_DIR/venv"

echo "1. Creating project directory..."
mkdir -p "$PROJECT_DIR"

echo "2. Setting up Python virtual environment..."
cd "$PROJECT_DIR" || exit
python$PYTHON_VERSION -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "3. Upgrading pip..."
pip install --upgrade pip

echo "4. Installing Python dependencies..."
pip install -r requirements.txt

# Additional RBAC dependencies
pip install PyJWT==2.8.0 passlib[bcrypt]==1.7.4 python-multipart==0.0.6 sqlalchemy==2.0.23 pymysql==1.1.0

echo "5. Creating necessary directories..."
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/uploads"
mkdir -p "$PROJECT_DIR/cgi-bin"

echo "6. Setting up environment file..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cat > "$PROJECT_DIR/.env" << EOF
# SiteGround Environment Variables
ENVIRONMENT=production
SITEGROUND=true

# Database Configuration (update with your SiteGround MySQL details)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=customer_artyco_rbac
DB_USER=customer_artyco
DB_PASSWORD=your_database_password_here

# JWT Configuration (CHANGE THIS!)
JWT_SECRET_KEY=generate-a-secure-random-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS Configuration (update with your domain)
CORS_ORIGINS=https://yourdomain.com

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_MINUTES=60

# Brain System (optional)
ANTHROPIC_API_KEY=

# Production settings
DEBUG=false
RELOAD=false
EOF
    echo "   Created .env file - PLEASE UPDATE WITH YOUR ACTUAL VALUES!"
fi

echo "7. Creating CGI handler for FastAPI..."
cat > "$PROJECT_DIR/cgi-bin/api_handler.py" << 'EOF'
#!/home/customer/www/artyco-financial-app-rbac/venv/bin/python
# -*- coding: utf-8 -*-

import sys
import os
from pathlib import Path

# Add project directory to Python path
project_dir = Path(__file__).parent.parent
sys.path.insert(0, str(project_dir))

# Set environment variable for production
os.environ['ENVIRONMENT'] = 'production'
os.environ['SITEGROUND'] = 'true'

# Import and run the FastAPI app
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import cgitb

cgitb.enable()

try:
    from api_server import app
    
    # CGI adapter for FastAPI
    from fastapi.middleware.wsgi import WSGIMiddleware
    import wsgiref.handlers
    
    # Run the application
    wsgiref.handlers.CGIHandler().run(app)
    
except Exception as e:
    print("Content-Type: application/json\n")
    print(JSONResponse({"error": str(e), "type": "startup_error"}).body.decode())
EOF

chmod +x "$PROJECT_DIR/cgi-bin/api_handler.py"

echo "8. Setting file permissions..."
chmod 755 "$PROJECT_DIR"
chmod 755 "$PROJECT_DIR/cgi-bin"
chmod 644 "$PROJECT_DIR/.htaccess"
chmod 600 "$PROJECT_DIR/.env"

echo "9. Creating database setup script..."
cat > "$PROJECT_DIR/setup_database.py" << 'EOF'
#!/usr/bin/env python3
"""
Database setup script for SiteGround
Run this after configuring your .env file
"""
import os
import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from database.connection import engine, Base
import pymysql

def create_database_if_not_exists():
    """Create database if it doesn't exist"""
    # Parse connection details
    db_config = {
        'host': Config.DB_HOST,
        'user': Config.DB_USER,
        'password': Config.DB_PASSWORD,
        'port': Config.DB_PORT
    }
    
    try:
        # Connect without database
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()
        
        # Create database
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"Database {Config.DB_NAME} ready")
        
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error creating database: {e}")
        sys.exit(1)

def setup_tables():
    """Create all tables"""
    try:
        # Import models to register them
        from models import User, Role, Permission
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully")
        
        # Run the RBAC schema SQL
        with engine.connect() as conn:
            with open('docker/mysql/rbac_schema.sql', 'r') as f:
                sql_commands = f.read().split(';')
                for command in sql_commands:
                    if command.strip():
                        try:
                            conn.execute(command)
                        except Exception as e:
                            print(f"Warning: {e}")
        
        print("RBAC schema applied")
        
    except Exception as e:
        print(f"Error setting up tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Setting up database...")
    create_database_if_not_exists()
    setup_tables()
    print("Database setup complete!")
EOF

chmod +x "$PROJECT_DIR/setup_database.py"

echo "10. Creating deployment checklist..."
cat > "$PROJECT_DIR/DEPLOYMENT_CHECKLIST.md" << 'EOF'
# SiteGround Deployment Checklist

## Before Running the Application

1. **Update .env file** with your actual values:
   - [ ] Database credentials from SiteGround cPanel
   - [ ] Generate secure JWT_SECRET_KEY
   - [ ] Update CORS_ORIGINS with your domain
   - [ ] Add ANTHROPIC_API_KEY if using Brain System

2. **Setup MySQL Database**:
   - [ ] Create database in cPanel
   - [ ] Note down credentials
   - [ ] Run: `python setup_database.py`

3. **Configure Domain**:
   - [ ] Point domain/subdomain to project directory
   - [ ] Update CORS_ORIGINS in .env

4. **Test the API**:
   - [ ] Visit: https://yourdomain.com/api/health
   - [ ] Check logs in /logs directory

## Security Checklist

- [ ] Changed default JWT_SECRET_KEY
- [ ] Changed default admin password
- [ ] Restricted .env file permissions (600)
- [ ] Configured SSL certificate
- [ ] Updated CORS origins

## Troubleshooting

1. **500 Internal Server Error**:
   - Check `/logs/error.log`
   - Verify Python path in CGI handler
   - Check file permissions

2. **Database Connection Error**:
   - Verify MySQL credentials
   - Check if database exists
   - Test connection from cPanel

3. **Module Import Errors**:
   - Activate virtual environment
   - Reinstall dependencies
   - Check Python version compatibility
EOF

echo "=== Setup Complete ==="
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Update the .env file with your SiteGround database credentials"
echo "2. Run: python setup_database.py"
echo "3. Configure your domain to point to this directory"
echo "4. Read DEPLOYMENT_CHECKLIST.md for detailed instructions"
echo ""
echo "Project directory: $PROJECT_DIR"