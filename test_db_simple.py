#!/usr/bin/env python3
"""
Test simple de conexión a base de datos
"""

import os
import sys

print("🔍 Testing simple database connection...")

try:
    # Install cryptography if needed
    import subprocess
    print("🔍 Installing cryptography...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography==41.0.7", "pymysql", "sqlalchemy"])
    
except Exception as e:
    print(f"❌ Error installing dependencies: {e}")

try:
    from sqlalchemy import create_engine, text
    
    database_url = "mysql+pymysql://artyco_user:artyco_password123@localhost:3307/artyco_financial_rbac"
    print(f"🔍 Connecting to: {database_url}")
    
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1 as test, NOW() as current_time'))
        row = result.fetchone()
        
    print("✅ Database connection successful!")
    print(f"✅ Test result: {row[0]}")
    print(f"✅ Current time: {row[1]}")
    
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    import traceback
    traceback.print_exc()