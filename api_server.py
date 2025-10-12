#!/usr/bin/env python3
"""
FastAPI Server para el Brain System con RBAC
Expone las capacidades financieras del Brain como API REST con autenticación y autorización
"""

import os
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import uvicorn

# Configuración para diferentes entornos
from config import Config
from database.connection import init_db, get_db
from sqlalchemy.orm import Session

# RBAC imports
from models import User
from auth.dependencies import require_permission, get_current_user, get_optional_current_user

# Routes
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.admin import router as admin_router
# Financial and analysis routes (ensure frontend endpoints exist)
try:
    from routes.financial_data import router as financial_router
except Exception as e:
    financial_router = None
    print(f"⚠️ routes.financial_data not available: {e}")

try:
    from routes.analysis_config import router as analysis_router
except Exception as e:
    analysis_router = None
    print(f"⚠️ routes.analysis_config not available: {e}")

try:
    from routes.financial_scenarios import router as scenarios_router
except Exception as e:
    scenarios_router = None
    print(f"⚠️ routes.financial_scenarios not available: {e}")

# Brain System
from brain import Brain, BrainConfig
from brain.core.config import ModelProvider, ModelConfig
from brain.tools.financial_tools import (
    PortfolioAnalyzer, RiskCalculator, 
    TransactionAnalyzer, FinancialCalculator
)

# Modelos de datos para la API (sin cambios)
class PortfolioRequest(BaseModel):
    investments: List[Dict[str, Any]]
    analysis_type: str = "return"

class RiskAnalysisRequest(BaseModel):
    returns: List[float]
    confidence_level: float = 0.95
    risk_free_rate: float = 0.02

class TransactionRequest(BaseModel):
    transactions: List[Dict[str, Any]]
    analysis_period: str = "monthly"

class FinancialCalculationRequest(BaseModel):
    calculation_type: str
    principal: float
    rate: float
    time: float
    compounding_frequency: Optional[int] = 12

class PyGAnalysisRequest(BaseModel):
    financial_data: Dict[str, Any]
    analysis_month: Optional[str] = None
    view_type: str = "contable"  # contable, operativo, caja, ebitda
    enable_vertical_analysis: bool = False
    enable_horizontal_analysis: bool = False
    comparison_month: Optional[str] = None

class BrainQueryRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

# Inicializar FastAPI
app = FastAPI(
    title="Artyco Financial API - RBAC Edition",
    description="API REST para análisis financiero con IA integrada y control de acceso basado en roles",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Variables globales
brain = None

@app.on_event("startup")
async def startup_event():
    """Inicializar sistemas al arrancar la API"""
    global brain
    
    print("🚀 Starting Artyco Financial API Server with RBAC...")
    print(f"🌍 Environment: {'Production' if Config.IS_PRODUCTION else 'Development'}")
    print(f"🏠 SiteGround: {'Yes' if Config.IS_SITEGROUND else 'No'}")
    
    # Inicializar base de datos
    try:
        init_db()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        # En producción, podríamos querer fallar aquí
        if Config.IS_PRODUCTION:
            raise
    
    # Inicializar Brain System
    try:
        if Config.ANTHROPIC_API_KEY:
            config = BrainConfig(
                name="Artyco Financial Brain RBAC",
                primary_model=ModelConfig(
                    provider=ModelProvider.ANTHROPIC,
                    model_name="claude-3-haiku-20240307"
                ),
                enable_learning=True,
                enable_logging=True
            )
            
            brain = Brain(config)
            print("🧠 Brain System initialized for API")
        else:
            print("⚠️ Brain System disabled (no ANTHROPIC_API_KEY)")
    except Exception as e:
        print(f"⚠️ Brain System initialization failed: {e}")
        # Brain System es opcional, continuamos sin él

# Incluir rutas de autenticación y administración
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Include financial routes so frontend can call /api/financial/* on this server
if scenarios_router:
    app.include_router(scenarios_router, tags=["Financial Scenarios"])
if financial_router:
    app.include_router(financial_router, tags=["Financial Data"])
if analysis_router:
    app.include_router(analysis_router, tags=["Analysis Config"])

# ================================
# ENDPOINTS DE ANÁLISIS FINANCIERO (PROTEGIDOS)
# ================================

@app.post("/api/portfolio/analyze")
async def analyze_portfolio(
    request: PortfolioRequest,
    current_user: User = Depends(require_permission("portfolio", "analyze"))
):
    """Análisis de portfolio de inversiones (requiere portfolio:analyze)"""
    try:
        analyzer = PortfolioAnalyzer()
        result = await analyzer.execute(
            investments=request.investments,
            analysis_type=request.analysis_type
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/risk/analyze")
async def analyze_risk(
    request: RiskAnalysisRequest,
    current_user: User = Depends(require_permission("risk_analysis", "execute"))
):
    """Análisis de riesgo financiero (requiere risk_analysis:execute)"""
    try:
        calculator = RiskCalculator()
        result = await calculator.execute(
            returns=request.returns,
            confidence_level=request.confidence_level,
            risk_free_rate=request.risk_free_rate
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/transactions/analyze")
async def analyze_transactions(
    request: TransactionRequest,
    current_user: User = Depends(require_permission("transactions", "analyze"))
):
    """Análisis de patrones transaccionales (requiere transactions:analyze)"""
    try:
        analyzer = TransactionAnalyzer()
        result = await analyzer.execute(
            transactions=request.transactions,
            analysis_period=request.analysis_period
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/financial/calculate")
async def financial_calculate(
    request: FinancialCalculationRequest,
    current_user: User = Depends(require_permission("financial_data", "read"))
):
    """Cálculos financieros avanzados (requiere financial_data:read)"""
    try:
        calculator = FinancialCalculator()
        result = await calculator.execute(
            calculation_type=request.calculation_type,
            principal=request.principal,
            rate=request.rate,
            time=request.time,
            compounding_frequency=request.compounding_frequency
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ================================
# ENDPOINT PRINCIPAL PARA PyG (PROTEGIDO)
# ================================

@app.post("/api/pyg/analyze")
async def analyze_pyg(
    request: PyGAnalysisRequest,
    current_user: User = Depends(require_permission("pyg_analysis", "execute"))
):
    """
    Endpoint principal para análisis PyG (requiere pyg_analysis:execute)
    """
    try:
        # Verificar si Brain System está disponible
        if not brain:
            # Fallback: análisis básico sin IA
            return {
                "success": True,
                "data": {
                    "analysis": "Análisis PyG básico (Brain System no disponible)",
                    "reasoning": "Sistema de análisis con IA no configurado",
                    "confidence": 0.3,
                    "warning": "Para análisis avanzado, configure ANTHROPIC_API_KEY"
                }
            }
        
        # Crear prompt contextual para análisis PyG
        prompt = f"""
        Analiza estos datos financieros para generar un análisis PyG:
        
        Datos: {request.financial_data}
        Mes: {request.analysis_month or 'Anual'}
        Tipo de vista: {request.view_type}
        Análisis vertical: {request.enable_vertical_analysis}
        Análisis horizontal: {request.enable_horizontal_analysis}
        
        Por favor proporciona:
        1. Estructura jerárquica de cuentas
        2. Cálculos de KPIs principales
        3. Análisis de tendencias
        4. Insights y recomendaciones
        """
        
        thought_process = await brain.think(prompt, {
            "financial_data": request.financial_data,
            "analysis_type": "pyg",
            "view_type": request.view_type,
            "user_id": current_user.id,
            "user_permissions": list(current_user.get_permissions())
        })
        
        return {
            "success": True,
            "data": {
                "analysis": thought_process.response.content if thought_process.response else "",
                "reasoning": thought_process.reasoning.summary if thought_process.reasoning else "",
                "confidence": thought_process.reasoning.confidence if thought_process.reasoning else 0.5
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# BRAIN SYSTEM ENDPOINTS (PROTEGIDOS)
# ================================

@app.post("/api/brain/query")
async def brain_query(
    request: BrainQueryRequest,
    current_user: User = Depends(require_permission("brain_system", "query"))
):
    """Query directo al Brain System (requiere brain_system:query)"""
    try:
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
        # Añadir contexto del usuario
        context = request.context or {}
        context.update({
            "user_id": current_user.id,
            "username": current_user.username,
            "user_permissions": list(current_user.get_permissions()),
            "user_roles": [role.name for role in current_user.roles]
        })
        
        thought_process = await brain.think(request.prompt, context)
        
        return {
            "success": True,
            "data": {
                "response": thought_process.response.content if thought_process.response else "",
                "reasoning": thought_process.reasoning.summary if thought_process.reasoning else "",
                "confidence": thought_process.reasoning.confidence if thought_process.reasoning else 0.5,
                "tools_used": [tool.name for tool in thought_process.available_tools]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/brain/feedback")
async def brain_feedback(
    feedback: str, 
    context: Optional[Dict] = None,
    current_user: User = Depends(require_permission("brain_system", "train"))
):
    """Proporcionar feedback al Brain System (requiere brain_system:train)"""
    try:
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
        # Añadir contexto del usuario
        feedback_context = context or {}
        feedback_context.update({
            "feedback_by_user_id": current_user.id,
            "feedback_by_username": current_user.username
        })
        
        await brain.learn(feedback, feedback_context)
        return {"success": True, "message": "Feedback processed"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/brain/stats")
async def brain_stats(
    current_user: User = Depends(require_permission("brain_system", "query"))
):
    """Estadísticas del Brain System (requiere brain_system:query)"""
    try:
        if not brain:
            return {
                "success": True,
                "data": {
                    "status": "disabled",
                    "message": "Brain System not configured"
                }
            }
        
        memory_stats = brain.memory.get_summary()
        
        return {
            "success": True,
            "data": {
                "status": "active",
                "memory": memory_stats,
                "tools_available": len(brain.tools.list_tools()),
                "learning_enabled": brain.config.enable_learning
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# ENDPOINTS DE UTILIDADES (PÚBLICOS Y PROTEGIDOS)
# ================================

@app.get("/api/health")
async def health_check():
    """Health check del API (público)"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "rbac_enabled": True,
        "brain_available": brain is not None,
        "environment": "production" if Config.IS_PRODUCTION else "development",
        "siteground": Config.IS_SITEGROUND
    }

@app.get("/api/tools")
async def list_tools(
    current_user: User = Depends(require_permission("brain_system", "query"))
):
    """Lista de herramientas disponibles (requiere brain_system:query)"""
    if not brain:
        return {"tools": [], "message": "Brain System not available"}
    
    return {"tools": brain.tools.list_tools()}

# ================================
# ENDPOINT DE INFORMACIÓN DEL SISTEMA
# ================================

@app.get("/api/system/info")
async def system_info(
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Información del sistema (público con datos limitados)"""
    base_info = {
        "name": "Artyco Financial API",
        "version": "2.0.0",
        "features": ["RBAC", "Brain System", "Financial Analysis"],
        "authentication_required": True
    }
    
    if current_user:
        # Usuario autenticado ve más información
        base_info.update({
            "user": {
                "username": current_user.username,
                "roles": [role.name for role in current_user.roles],
                "is_superuser": current_user.is_superuser
            },
            "available_endpoints": {
                "financial": current_user.has_permission("financial_data", "read"),
                "portfolio": current_user.has_permission("portfolio", "analyze"),
                "risk_analysis": current_user.has_permission("risk_analysis", "execute"),
                "brain_system": current_user.has_permission("brain_system", "query"),
                "user_management": current_user.has_permission("users", "read"),
                "admin": current_user.has_permission("system", "admin")
            }
        })
    
    return base_info

# ================================
# ARRANQUE DEL SERVIDOR
# ================================

if __name__ == "__main__":
    print("🚀 Starting Artyco Financial API Server with RBAC...")
    print(f"📡 Brain System integration: {'enabled' if Config.ANTHROPIC_API_KEY else 'disabled'}")
    print(f"🔧 CORS configured for: {', '.join(Config.CORS_ORIGINS)}")
    print(f"🔒 RBAC system: enabled")
    print(f"🗄️ Database: {Config.get_database_url()}")
    
    uvicorn.run(
        app,
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=Config.RELOAD,
        log_level="info" if Config.DEBUG else "warning"
    )
