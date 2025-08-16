"""
Router para configuración de análisis financieros
Gestiona patrones de exclusión para EBITDA y otros análisis
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis")

# Pydantic models
class PatternCreate(BaseModel):
    pattern_group: str
    pattern_name: str
    pattern_value: str
    pattern_type: str = "contains"

class PatternUpdate(BaseModel):
    pattern_id: int
    pattern_group: str
    pattern_name: str
    pattern_value: str
    pattern_type: str = "contains"

class PatternDelete(BaseModel):
    pattern_id: int

# Configuración por defecto (fallback si no hay BD)
DEFAULT_PATTERNS = {
    "depreciacion": [
        {"id": 1, "name": "Depreciación (con acento)", "value": "depreciación", "type": "contains"},
        {"id": 2, "name": "Depreciacion (sin acento)", "value": "depreciacion", "type": "contains"},
        {"id": 3, "name": "Amortización (con acento)", "value": "amortización", "type": "contains"},
        {"id": 4, "name": "Amortizacion (sin acento)", "value": "amortizacion", "type": "contains"},
        {"id": 5, "name": "Propiedades Plantas", "value": "propiedades", "type": "contains"},
        {"id": 6, "name": "Intangibles", "value": "intangible", "type": "contains"}
    ],
    "intereses": [
        {"id": 8, "name": "Intereses", "value": "interes", "type": "contains"},
        {"id": 9, "name": "Interés (con acento)", "value": "interés", "type": "contains"},
        {"id": 10, "name": "Gastos financieros", "value": "gastos financieros", "type": "contains"},
        {"id": 11, "name": "Financiero", "value": "financiero", "type": "contains"},
        {"id": 12, "name": "Gastos de gestión", "value": "gastos de gestión y credito", "type": "contains"},
        {"id": 13, "name": "Préstamo", "value": "préstamo", "type": "contains"},
        {"id": 14, "name": "Prestamo", "value": "prestamo", "type": "contains"},
        {"id": 15, "name": "Crédito", "value": "crédito", "type": "contains"},
        {"id": 16, "name": "Credito", "value": "credito", "type": "contains"}
    ]
}

DEFAULT_ANALYSIS_TYPES = [
    {
        "id": 1,
        "code": "contable",
        "name": "Análisis Contable",
        "description": "Análisis financiero tradicional",
        "calculation_method": "standard",
        "is_active": True,
        "sort_order": 1
    },
    {
        "id": 2,
        "code": "operativo", 
        "name": "Análisis Operativo",
        "description": "Análisis operativo EBIT",
        "calculation_method": "ebit",
        "is_active": True,
        "sort_order": 2
    },
    {
        "id": 3,
        "code": "caja",
        "name": "Análisis de Caja",
        "description": "Análisis de flujo de caja EBITDA",
        "calculation_method": "ebitda",
        "is_active": True,
        "sort_order": 3
    }
]

@router.get("/types")
async def get_analysis_types():
    """Obtener tipos de análisis disponibles"""
    try:
        # TODO: Implementar consulta a BD cuando las tablas estén creadas
        # Por ahora devolver datos por defecto
        return {
            "success": True,
            "data": DEFAULT_ANALYSIS_TYPES
        }
    except Exception as e:
        logger.error(f"Error al obtener tipos de análisis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patterns")
async def get_exclusion_patterns():
    """Obtener patrones de exclusión"""
    try:
        # TODO: Implementar consulta a BD cuando las tablas estén creadas
        # Por ahora devolver datos por defecto
        return {
            "success": True,
            "data": DEFAULT_PATTERNS
        }
    except Exception as e:
        logger.error(f"Error al obtener patrones: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_analysis_config():
    """Obtener configuración completa de análisis"""
    try:
        return {
            "success": True,
            "data": {
                "analysis_types": DEFAULT_ANALYSIS_TYPES,
                "exclusion_patterns": DEFAULT_PATTERNS,
                "break_even_configs": {
                    "contable": {
                        "includeDepreciacion": True,
                        "includeIntereses": True,
                        "description": "Punto de Equilibrio Contable (Estándar)",
                        "objective": "Nivel de ventas donde la utilidad neta contable es cero."
                    },
                    "operativo": {
                        "includeDepreciacion": True,
                        "includeIntereses": False,
                        "description": "Punto de Equilibrio Operativo (EBIT)",
                        "objective": "Nivel de ventas donde las ganancias antes de intereses e impuestos son cero."
                    },
                    "caja": {
                        "includeDepreciacion": False,
                        "includeIntereses": False,
                        "description": "Punto de Equilibrio de Caja (EBITDA)",
                        "objective": "Nivel de ventas donde las entradas de efectivo igualan las salidas."
                    }
                },
                "lastUpdated": "2025-01-23T12:00:00Z"
            }
        }
    except Exception as e:
        logger.error(f"Error al obtener configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patterns/add")
async def add_pattern(pattern: PatternCreate):
    """Agregar nuevo patrón de exclusión"""
    try:
        # TODO: Implementar INSERT en BD
        logger.info(f"Agregando patrón: {pattern.dict()}")
        
        # Simular éxito por ahora
        return {
            "success": True,
            "message": "Patrón agregado correctamente",
            "data": {
                "id": 999,  # ID simulado
                **pattern.dict()
            }
        }
    except Exception as e:
        logger.error(f"Error al agregar patrón: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patterns/update")
async def update_pattern(pattern: PatternUpdate):
    """Actualizar patrón existente"""
    try:
        # TODO: Implementar UPDATE en BD
        logger.info(f"Actualizando patrón: {pattern.dict()}")
        
        return {
            "success": True,
            "message": "Patrón actualizado correctamente"
        }
    except Exception as e:
        logger.error(f"Error al actualizar patrón: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patterns/delete")
async def delete_pattern(pattern: PatternDelete):
    """Eliminar patrón de exclusión"""
    try:
        # TODO: Implementar DELETE en BD
        logger.info(f"Eliminando patrón ID: {pattern.pattern_id}")
        
        return {
            "success": True,
            "message": "Patrón eliminado correctamente"
        }
    except Exception as e:
        logger.error(f"Error al eliminar patrón: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def analysis_health_check():
    """Health check para el módulo de análisis"""
    return {
        "status": "healthy",
        "module": "analysis_config",
        "version": "1.0.0",
        "features": ["patterns", "types", "config"]
    }