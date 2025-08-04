#!/usr/bin/env python3
"""
API con conexión a base de datos para debugging
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

print("🔍 DEBUG: Starting API with database...")

# Crear app básica
app = FastAPI(
    title="Artyco Financial API - DB Test",
    description="API con prueba de base de datos",
    version="1.0.0"
)

# CORS básico
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔍 DEBUG: FastAPI app created, testing database...")

# Probar conexión a base de datos
@app.get("/")
def root():
    return {"message": "API with DB test is working!", "status": "ok"}

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database_test": "pending"
    }

@app.get("/api/db-test")
def test_database():
    try:
        from sqlalchemy import create_engine, text
        
        database_url = os.getenv('DATABASE_URL', 'mysql+pymysql://artyco_user:artyco_password123@mysql-rbac:3306/artyco_financial_rbac')
        print(f"🔍 DEBUG: Connecting to: {database_url[:50]}...")
        
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as test'))
            row = result.fetchone()
            
        return {
            "database_status": "connected",
            "test_query": "success",
            "result": row[0] if row else None
        }
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return {
            "database_status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    print("🔍 DEBUG: Starting uvicorn with database test...")
    
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