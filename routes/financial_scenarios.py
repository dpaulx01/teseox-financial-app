"""
Financial Scenarios API routes for Balance Interno module
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from database.connection import get_db
from auth.dependencies import get_current_user
from models.user import User
from models.financial_scenario import FinancialScenario

router = APIRouter(prefix="/api/scenarios", tags=["Financial Scenarios"])

# Pydantic Models para validación de datos
class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_year: int
    category: str = "simulación"
    is_template: bool = False
    financial_data: Dict[str, Any]  # Datos financieros completos

class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    financial_data: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    status: Optional[str] = None

class ScenarioShare(BaseModel):
    user_ids: List[int]
    is_shared: bool

class ScenarioDuplicate(BaseModel):
    new_name: str

# ===== ENDPOINTS CRUD =====

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crear nuevo escenario financiero
    
    - **name**: Nombre del escenario
    - **description**: Descripción opcional
    - **base_year**: Año base para los datos
    - **category**: Categoría (proyección, simulación, análisis)
    - **financial_data**: Datos financieros completos (formato FinancialData)
    """
    
    # Validar que el usuario tenga permisos (por ahora todos los usuarios autenticados pueden crear)
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Crear nuevo escenario
    new_scenario = FinancialScenario(
        name=scenario_data.name,
        description=scenario_data.description,
        base_year=scenario_data.base_year,
        financial_data=scenario_data.financial_data,
        category=scenario_data.category,
        is_template=scenario_data.is_template,
        owner_id=current_user.id
    )
    
    db.add(new_scenario)
    db.commit()
    db.refresh(new_scenario)
    
    return {
        "id": new_scenario.id,
        "message": "Scenario created successfully",
        "scenario": new_scenario.get_metadata()
    }

@router.get("/", response_model=List[Dict[str, Any]])
async def list_scenarios(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    include_shared: bool = Query(True, description="Include shared scenarios"),
    include_templates: bool = Query(True, description="Include template scenarios"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar escenarios del usuario (propios y opcionalmente compartidos)
    
    - **category**: Filtrar por categoría (proyección, simulación, análisis)
    - **status**: Filtrar por estado (draft, active, archived)
    - **include_shared**: Incluir escenarios compartidos conmigo
    - **include_templates**: Incluir plantillas
    """
    
    query = db.query(FinancialScenario)
    
    if include_shared:
        # Incluir escenarios propios y compartidos
        query = query.filter(
            (FinancialScenario.owner_id == current_user.id) |
            (FinancialScenario.is_shared.is_(True))
        )
    else:
        query = query.filter(FinancialScenario.owner_id == current_user.id)
    
    # Aplicar filtros
    if category:
        query = query.filter(FinancialScenario.category == category)
    if status:
        query = query.filter(FinancialScenario.status == status)
    if not include_templates:
        query = query.filter(FinancialScenario.is_template.is_(False))
    
    # Ordenar por fecha de actualización descendente
    query = query.order_by(FinancialScenario.updated_at.desc())
    
    scenarios = query.all()
    
    # Filtrar por acceso específico y devolver metadatos
    accessible_scenarios = []
    for scenario in scenarios:
        if scenario.has_access(current_user.id):
            accessible_scenarios.append(scenario.get_metadata())
    
    return accessible_scenarios

@router.get("/{scenario_id}")
async def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener escenario específico con datos financieros completos
    
    - **scenario_id**: ID del escenario a obtener
    """
    
    scenario = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id
    ).first()
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    if not scenario.has_access(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this scenario"
        )
    
    # Actualizar last_accessed
    scenario.last_accessed = func.current_timestamp()
    db.commit()
    
    return {
        "id": scenario.id,
        "name": scenario.name,
        "description": scenario.description,
        "financial_data": scenario.financial_data,
        "metadata": scenario.get_metadata()
    }

@router.put("/{scenario_id}")
async def update_scenario(
    scenario_id: int,
    updates: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar escenario (solo propietarios)
    
    - **scenario_id**: ID del escenario a actualizar
    - **updates**: Campos a actualizar
    """
    
    scenario = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id,
        FinancialScenario.owner_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=404, 
            detail="Scenario not found or access denied"
        )
    
    # Aplicar actualizaciones
    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(scenario, field, value)
    
    db.commit()
    db.refresh(scenario)
    
    return {
        "id": scenario.id,
        "message": "Scenario updated successfully",
        "scenario": scenario.get_metadata()
    }

@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Eliminar escenario (solo propietarios)
    
    - **scenario_id**: ID del escenario a eliminar
    """
    
    scenario = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id,
        FinancialScenario.owner_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=404, 
            detail="Scenario not found or access denied"
        )
    
    db.delete(scenario)
    db.commit()
    
    return {"message": "Scenario deleted successfully"}

# ===== OPERACIONES ESPECIALES =====

@router.post("/{scenario_id}/duplicate")
async def duplicate_scenario(
    scenario_id: int,
    duplicate_data: ScenarioDuplicate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Duplicar escenario existente
    
    - **scenario_id**: ID del escenario original
    - **new_name**: Nombre para la copia
    """
    
    original = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    if not original.has_access(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this scenario"
        )
    
    # Crear duplicado
    duplicate = FinancialScenario(
        name=duplicate_data.new_name,
        description=f"Copia de: {original.description}" if original.description else f"Copia de: {original.name}",
        base_year=original.base_year,
        financial_data=original.financial_data,
        category=original.category,
        is_template=False,  # Las copias no son plantillas por defecto
        owner_id=current_user.id
    )
    
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    
    return {
        "id": duplicate.id,
        "message": "Scenario duplicated successfully",
        "original_id": original.id,
        "duplicate": duplicate.get_metadata()
    }

@router.post("/{scenario_id}/share")
async def share_scenario(
    scenario_id: int,
    share_data: ScenarioShare,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compartir escenario con otros usuarios
    
    - **scenario_id**: ID del escenario a compartir
    - **user_ids**: Lista de IDs de usuarios con los que compartir
    - **is_shared**: True para activar compartición, False para desactivar
    """
    
    scenario = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id,
        FinancialScenario.owner_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=404, 
            detail="Scenario not found or access denied"
        )
    
    # Validar que los usuarios existen
    if share_data.is_shared and share_data.user_ids:
        existing_users = db.query(User.id).filter(
            User.id.in_(share_data.user_ids),
            User.is_active.is_(True)
        ).all()
        
        existing_user_ids = [user.id for user in existing_users]
        invalid_user_ids = set(share_data.user_ids) - set(existing_user_ids)
        
        if invalid_user_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or inactive user IDs: {list(invalid_user_ids)}"
            )
    
    # Actualizar compartición
    scenario.is_shared = share_data.is_shared
    scenario.shared_with = share_data.user_ids if share_data.is_shared else []
    
    db.commit()
    
    return {
        "message": "Scenario sharing updated successfully",
        "is_shared": scenario.is_shared,
        "shared_with": scenario.shared_with
    }

@router.get("/{scenario_id}/metadata")
async def get_scenario_metadata(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener solo metadatos del escenario (sin datos financieros)
    
    - **scenario_id**: ID del escenario
    """
    
    scenario = db.query(FinancialScenario).filter(
        FinancialScenario.id == scenario_id
    ).first()
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    if not scenario.has_access(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this scenario"
        )
    
    return scenario.get_metadata()

# ===== ESTADÍSTICAS Y UTILIDADES =====

@router.get("/stats/summary")
async def get_scenarios_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resumen estadístico de escenarios del usuario
    """
    
    # Contar escenarios propios por categoría
    own_scenarios = db.query(FinancialScenario).filter(
        FinancialScenario.owner_id == current_user.id
    )
    
    total_own = own_scenarios.count()
    by_category = {}
    by_status = {}
    
    for scenario in own_scenarios:
        by_category[scenario.category] = by_category.get(scenario.category, 0) + 1
        by_status[scenario.status] = by_status.get(scenario.status, 0) + 1
    
    # Contar escenarios compartidos conmigo
    shared_scenarios = db.query(FinancialScenario).filter(
        FinancialScenario.is_shared.is_(True),
        FinancialScenario.owner_id != current_user.id
    ).count()
    
    return {
        "total_own_scenarios": total_own,
        "shared_scenarios_accessible": shared_scenarios,
        "scenarios_by_category": by_category,
        "scenarios_by_status": by_status,
        "total_accessible": total_own + shared_scenarios
    }