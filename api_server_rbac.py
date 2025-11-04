#!/usr/bin/env python3
"""
FastAPI Server para RBAC - VERSIÓN FUNCIONAL
Solo autenticación, usuarios y funcionalidades básicas
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Configuración
from config import Config
from database.connection import init_db

# Routes RBAC
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.admin import router as admin_router
from routes.financial_scenarios import router as scenarios_router
from routes.financial_data import router as financial_router
from routes.analysis_config import router as analysis_router
from routes.production_status import router as production_router
from routes.production_data_api import router as production_data_router
from routes.sales_bi_api import router as sales_bi_router
from routes.balance_data_api import router as balance_router

# Crear la aplicación FastAPI
app = FastAPI(
    title="Artyco Financial API - RBAC",
    description="API con sistema RBAC completo",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    """Inicializar sistemas al arrancar la API"""
    print("🚀 Starting Artyco Financial API Server with RBAC...")
    print(f"🌍 Environment: {'Production' if Config.IS_PRODUCTION else 'Development'}")
    
    # Inicializar Database
    print("🔧 Initializing database...")
    try:
        init_db()  # NOT async - remove await
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise
    
    print("✅ RBAC API Server ready!")

# Incluir rutas RBAC
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(users_router, prefix="/api", tags=["Users"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])
app.include_router(scenarios_router, tags=["Financial Scenarios"])
app.include_router(financial_router, tags=["Financial Data"])
app.include_router(analysis_router, tags=["Analysis Config"])
app.include_router(production_router, prefix="/api", tags=["Status Producción"])
app.include_router(production_data_router)
app.include_router(sales_bi_router, tags=["Sales BI"])
app.include_router(balance_router, tags=["Balance General"])

# Endpoints adicionales para RBAC
@app.get("/api/roles")
async def get_roles():
    """Get available roles"""
    return {"success": True, "roles": [
        {"id": 1, "name": "admin", "description": "Full system access"},
        {"id": 2, "name": "user", "description": "Standard user access"},
        {"id": 3, "name": "viewer", "description": "Read-only access"}
    ]}

@app.get("/api/permissions")
async def get_permissions():
    """Get available permissions"""
    return {"success": True, "permissions": [
        {"id": 1, "name": "*:*", "description": "Full access to all resources"},
        {"id": 2, "name": "financial:read", "description": "Read financial data"},
        {"id": 3, "name": "financial:write", "description": "Write financial data"},
        {"id": 4, "name": "users:read", "description": "Read user data"},
        {"id": 5, "name": "users:write", "description": "Write user data"}
    ]}

@app.get("/api/info")
async def api_info():
    """Endpoint con información del sistema"""
    return {
        "message": "Artyco Financial API - RBAC System",
        "status": "operational",
        "version": "2.0.0",
        "features": ["RBAC", "Authentication", "User Management", "Admin Panel", "Financial Scenarios"],
        "endpoints": {
            "login": "/api/auth/login",
            "register": "/api/auth/register",
            "users": "/api/users/",
            "admin": "/api/admin/",
            "scenarios": "/api/scenarios/"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "message": "RBAC API is running",
        "database": "connected"
    }

@app.get("/api/status")
async def api_status():
    """Estado detallado del API"""
    return {
        "api_version": "2.0.0",
        "system": "RBAC Authentication",
        "status": "operational",
        "features": {
            "authentication": True,
            "user_management": True,
            "role_based_access": True,
            "admin_panel": True
        }
    }

# ===================================
# SERVE FRONTEND STATIC FILES
# ===================================
# Mount static files (for production when frontend is built)
dist_path = Path(__file__).parent / "dist"
if dist_path.exists():
    print(f"📦 Serving frontend from: {dist_path}")

    # Serve static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

    # Catch-all route for SPA - must be last
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the React SPA for all non-API routes"""
        # Avoid serving API routes as frontend
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            raise HTTPException(status_code=404, detail="Not found")

        # Try to serve file if it exists, otherwise serve index.html (SPA)
        file_path = dist_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Default to index.html for SPA routing
        index_path = dist_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="Frontend not found")
else:
    print("⚠️  Frontend dist/ folder not found. Running in API-only mode.")
    print("   Build frontend with: npm run build")

if __name__ == "__main__":
    print("🚀 Starting Artyco Financial API Server - RBAC System...")
    print(f"📡 CORS Origins: {Config.CORS_ORIGINS}")
    print(f"🔐 JWT Secret configured: {'Yes' if Config.JWT_SECRET_KEY else 'No'}")
    
    uvicorn.run(
        "api_server_rbac:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
