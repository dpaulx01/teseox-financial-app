#!/usr/bin/env python3
"""
API Simple para debugging
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

print("🔍 DEBUG: Starting simple API...")

# Crear app básica
app = FastAPI(
    title="Artyco Financial API - Debug",
    description="API simple para debugging",
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

print("🔍 DEBUG: FastAPI app created...")

@app.get("/")
def root():
    return {"message": "API is working!", "status": "ok"}

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "debug"),
        "database_url": os.getenv("DATABASE_URL", "not_set")[:50] + "..." if os.getenv("DATABASE_URL") else "not_set"
    }

@app.get("/debug")
def debug_info():
    return {
        "working_directory": os.getcwd(),
        "python_path": os.sys.path[:3],
        "environment_vars": {
            "DATABASE_URL": bool(os.getenv("DATABASE_URL")),
            "JWT_SECRET_KEY": bool(os.getenv("JWT_SECRET_KEY")),
            "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "not_set")
        }
    }

if __name__ == "__main__":
    print("🔍 DEBUG: Starting uvicorn...")
    print(f"🔍 DEBUG: Host: 0.0.0.0, Port: 8000")
    
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