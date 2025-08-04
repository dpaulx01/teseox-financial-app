#!/usr/bin/env python3
"""
FastAPI Server para el Brain System
Expone las capacidades financieras del Brain como API REST
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import uvicorn

from brain import Brain, BrainConfig
from brain.core.config import ModelProvider, ModelConfig
from brain.tools.financial_tools import (
    PortfolioAnalyzer, RiskCalculator, 
    TransactionAnalyzer, FinancialCalculator
)

# Modelos de datos para la API
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
    title="Artyco Financial API",
    description="API REST para análisis financiero con IA integrada",
    version="1.0.0"
)

# Configurar CORS para el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Brain System
brain = None

@app.on_event("startup")
async def startup_event():
    """Inicializar Brain System al arrancar la API"""
    global brain
    
    config = BrainConfig(
        name="Artyco Financial Brain",
        primary_model=ModelConfig(
            provider=ModelProvider.ANTHROPIC,
            model_name="claude-3-haiku-20240307"
        ),
        enable_learning=True,
        enable_logging=True
    )
    
    brain = Brain(config)
    print("🧠 Brain System initialized for API")

# ================================
# ENDPOINTS DE ANÁLISIS FINANCIERO
# ================================

@app.post("/api/portfolio/analyze")
async def analyze_portfolio(request: PortfolioRequest):
    """Análisis de portfolio de inversiones"""
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
async def analyze_risk(request: RiskAnalysisRequest):
    """Análisis de riesgo financiero"""
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
async def analyze_transactions(request: TransactionRequest):
    """Análisis de patrones transaccionales"""
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
async def financial_calculate(request: FinancialCalculationRequest):
    """Cálculos financieros avanzados"""
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
# ENDPOINT PRINCIPAL PARA PyG
# ================================

@app.post("/api/pyg/analyze")
async def analyze_pyg(request: PyGAnalysisRequest):
    """
    Endpoint principal para análisis PyG
    Aquí implementaremos la lógica equivalent a pnlCalculator.ts
    """
    try:
        # Por ahora, delegamos al Brain System para análisis inteligente
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
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
            "view_type": request.view_type
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
# BRAIN SYSTEM ENDPOINTS
# ================================

@app.post("/api/brain/query")
async def brain_query(request: BrainQueryRequest):
    """Query directo al Brain System"""
    try:
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
        thought_process = await brain.think(request.prompt, request.context)
        
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
async def brain_feedback(feedback: str, context: Optional[Dict] = None):
    """Proporcionar feedback al Brain System"""
    try:
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
        await brain.learn(feedback, context)
        return {"success": True, "message": "Feedback processed"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/brain/stats")
async def brain_stats():
    """Estadísticas del Brain System"""
    try:
        if not brain:
            raise HTTPException(status_code=503, detail="Brain System not available")
        
        memory_stats = brain.memory.get_summary()
        
        return {
            "success": True,
            "data": {
                "memory": memory_stats,
                "tools_available": len(brain.tools.list_tools()),
                "learning_enabled": brain.config.enable_learning
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# ENDPOINTS DE UTILIDADES
# ================================

@app.get("/api/health")
async def health_check():
    """Health check del API"""
    return {
        "status": "healthy",
        "brain_available": brain is not None,
        "version": "1.0.0"
    }

@app.get("/api/tools")
async def list_tools():
    """Lista de herramientas disponibles"""
    if not brain:
        return {"tools": []}
    
    return {"tools": brain.tools.list_tools()}

# ================================
# ARRANQUE DEL SERVIDOR
# ================================

if __name__ == "__main__":
    print("🚀 Starting Artyco Financial API Server...")
    print("📡 Brain System integration enabled")
    print("🔧 CORS configured for React frontend")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )