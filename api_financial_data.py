"""
Financial Data API Endpoints
Migrated from PHP to FastAPI for RBAC integration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DECIMAL, TIMESTAMP, text, and_, func
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime, date
import json

# Import from main RBAC module
import sys
sys.path.append('.')
from api_rbac_minimal import get_db, get_current_user, User, Base

router = APIRouter(prefix="/api/financial", tags=["Financial Data"])

# ========================================
# DATABASE MODELS
# ========================================

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500))
    industry = Column(String(100))
    currency = Column(String(10), default="USD")
    created_by = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow)

class FinancialData(Base):
    __tablename__ = "financial_data"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, default=1)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # Financial metrics
    ingresos = Column(DECIMAL(20,2), default=0)
    costo_ventas_total = Column(DECIMAL(20,2), default=0)
    gastos_admin_total = Column(DECIMAL(20,2), default=0)
    gastos_ventas_total = Column(DECIMAL(20,2), default=0)
    utilidad_bruta = Column(DECIMAL(20,2), default=0)
    ebitda = Column(DECIMAL(20,2), default=0)
    utilidad_neta = Column(DECIMAL(20,2), default=0)
    
    # Metadata
    upload_source = Column(String(100), default="manual")
    created_by = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow)

class ProductionData(Base):
    __tablename__ = "production_data"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, default=1)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # Production metrics
    metros_producidos = Column(DECIMAL(12,2), default=0)
    metros_vendidos = Column(DECIMAL(12,2), default=0)
    unidades_producidas = Column(Integer, default=0)
    unidades_vendidas = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow)

# ========================================
# PYDANTIC MODELS
# ========================================

class FinancialDataCreate(BaseModel):
    year: int
    month: int
    ingresos: float = 0
    costo_ventas_total: float = 0
    gastos_admin_total: float = 0
    gastos_ventas_total: float = 0
    utilidad_bruta: float = 0
    ebitda: float = 0
    utilidad_neta: float = 0

class FinancialDataResponse(BaseModel):
    id: int
    company_id: int
    year: int
    month: int
    ingresos: float
    costo_ventas_total: float
    gastos_admin_total: float
    gastos_ventas_total: float
    utilidad_bruta: float
    ebitda: float
    utilidad_neta: float
    created_at: datetime

class ProductionDataCreate(BaseModel):
    year: int
    month: int
    metros_producidos: float = 0
    metros_vendidos: float = 0
    unidades_producidas: int = 0
    unidades_vendidas: int = 0

class ProductionDataResponse(BaseModel):
    id: int
    company_id: int
    year: int
    month: int
    metros_producidos: float
    metros_vendidos: float
    unidades_producidas: int
    unidades_vendidas: int
    created_at: datetime

class BulkDataUpload(BaseModel):
    data_type: str  # 'financial' or 'production'
    records: List[Dict[str, Any]]

# ========================================
# UTILITY FUNCTIONS
# ========================================

def require_permission(resource: str, action: str):
    """Decorator to check user permissions"""
    def decorator(current_user: User = Depends(get_current_user)):
        # For now, allow all authenticated users
        # TODO: Implement proper permission checking
        if not current_user.is_active:
            raise HTTPException(status_code=403, detail="User is not active")
        return current_user
    return decorator

def get_company_id(current_user: User) -> int:
    """Get company ID for current user"""
    # For now, use default company
    return 1

# ========================================
# FINANCIAL DATA ENDPOINTS
# ========================================

@router.get("/data", response_model=Dict[str, Any])
def get_financial_data(
    year: int = Query(datetime.now().year),
    current_user: User = Depends(require_permission("financial", "read")),
    db: Session = Depends(get_db)
):
    """Get comprehensive financial data for a specific year"""
    try:
        company_id = get_company_id(current_user)
        
        # Monthly data
        monthly_query = db.query(FinancialData).filter(
            and_(
                FinancialData.company_id == company_id,
                FinancialData.year == year
            )
        ).order_by(FinancialData.month)
        
        monthly_records = monthly_query.all()
        
        # Convert to monthly dictionary using month names like in original project
        month_names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        
        monthly_data = {}
        for record in monthly_records:
            month_name = month_names[record.month]  # record.month is 1-12
            monthly_data[month_name] = {
                "ingresos": float(record.ingresos),
                "costo_ventas_total": float(record.costo_ventas_total),
                "gastos_admin_total": float(record.gastos_admin_total),
                "gastos_ventas_total": float(record.gastos_ventas_total),
                "utilidad_bruta": float(record.utilidad_bruta),
                "ebitda": float(record.ebitda),
                "utilidad_neta": float(record.utilidad_neta)
            }
        
        # Yearly totals
        yearly_query = db.query(
            func.sum(FinancialData.ingresos).label('ingresos'),
            func.sum(FinancialData.costo_ventas_total).label('costo_ventas_total'),
            func.sum(FinancialData.gastos_admin_total).label('gastos_admin_total'),
            func.sum(FinancialData.gastos_ventas_total).label('gastos_ventas_total'),
            func.sum(FinancialData.utilidad_bruta).label('utilidad_bruta'),
            func.sum(FinancialData.ebitda).label('ebitda'),
            func.sum(FinancialData.utilidad_neta).label('utilidad_neta')
        ).filter(
            and_(
                FinancialData.company_id == company_id,
                FinancialData.year == year
            )
        ).first()
        
        yearly_data = {
            "ingresos": float(yearly_query.ingresos or 0),
            "costo_ventas_total": float(yearly_query.costo_ventas_total or 0),
            "gastos_admin_total": float(yearly_query.gastos_admin_total or 0),
            "gastos_ventas_total": float(yearly_query.gastos_ventas_total or 0),
            "utilidad_bruta": float(yearly_query.utilidad_bruta or 0),
            "ebitda": float(yearly_query.ebitda or 0),
            "utilidad_neta": float(yearly_query.utilidad_neta or 0)
        }
        
        # Average data
        count_months = len(monthly_records)
        average_data = {}
        if count_months > 0:
            for key, value in yearly_data.items():
                average_data[key] = value / count_months
        
        return {
            "monthly": monthly_data,
            "yearly": yearly_data,
            "average": average_data,
            "metadata": {
                "year": year,
                "months_with_data": count_months,
                "company_id": company_id,
                "generated_at": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving financial data: {str(e)}")

@router.post("/data")
def create_financial_data(
    data: FinancialDataCreate,
    current_user: User = Depends(require_permission("financial", "write")),
    db: Session = Depends(get_db)
):
    """Create or update financial data for a specific period"""
    try:
        company_id = get_company_id(current_user)
        
        # Check if record exists
        existing = db.query(FinancialData).filter(
            and_(
                FinancialData.company_id == company_id,
                FinancialData.year == data.year,
                FinancialData.month == data.month
            )
        ).first()
        
        if existing:
            # Update existing record
            for field, value in data.dict().items():
                setattr(existing, field, value)
            existing.updated_at = datetime.utcnow()
            existing.created_by = current_user.id
            db.commit()
            db.refresh(existing)
            return {"message": "Financial data updated", "id": existing.id}
        else:
            # Create new record
            new_record = FinancialData(
                company_id=company_id,
                created_by=current_user.id,
                **data.dict()
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            return {"message": "Financial data created", "id": new_record.id}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving financial data: {str(e)}")

@router.post("/data/bulk")
def bulk_upload_financial_data(
    upload: BulkDataUpload,
    current_user: User = Depends(require_permission("financial", "write")),
    db: Session = Depends(get_db)
):
    """Bulk upload financial data from CSV or other sources"""
    try:
        company_id = get_company_id(current_user)
        created_count = 0
        updated_count = 0
        errors = []
        
        for i, record_data in enumerate(upload.records):
            try:
                if upload.data_type == "financial":
                    # Validate required fields
                    if 'year' not in record_data or 'month' not in record_data:
                        errors.append(f"Row {i+1}: Missing year or month")
                        continue
                    
                    year = int(record_data['year'])
                    month = int(record_data['month'])
                    
                    # Check if exists
                    existing = db.query(FinancialData).filter(
                        and_(
                            FinancialData.company_id == company_id,
                            FinancialData.year == year,
                            FinancialData.month == month
                        )
                    ).first()
                    
                    if existing:
                        # Update
                        for field, value in record_data.items():
                            if hasattr(existing, field) and field not in ['year', 'month']:
                                setattr(existing, field, float(value) if value else 0)
                        existing.updated_at = datetime.utcnow()
                        existing.created_by = current_user.id
                        updated_count += 1
                    else:
                        # Create
                        financial_data = {
                            'company_id': company_id,
                            'created_by': current_user.id,
                            'year': year,
                            'month': month
                        }
                        
                        # Map fields
                        for field, value in record_data.items():
                            if field in ['ingresos', 'costo_ventas_total', 'gastos_admin_total', 
                                       'gastos_ventas_total', 'utilidad_bruta', 'ebitda', 'utilidad_neta']:
                                financial_data[field] = float(value) if value else 0
                        
                        new_record = FinancialData(**financial_data)
                        db.add(new_record)
                        created_count += 1
                        
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Bulk upload completed",
            "created": created_count,
            "updated": updated_count,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error in bulk upload: {str(e)}")

# ========================================
# PRODUCTION DATA ENDPOINTS
# ========================================

@router.get("/production")
def get_production_data(
    year: int = Query(datetime.now().year),
    current_user: User = Depends(require_permission("operational", "read")),
    db: Session = Depends(get_db)
):
    """Get production data for a specific year"""
    try:
        company_id = get_company_id(current_user)
        
        production_records = db.query(ProductionData).filter(
            and_(
                ProductionData.company_id == company_id,
                ProductionData.year == year
            )
        ).order_by(ProductionData.month).all()
        
        # Convert to monthly format
        monthly_data = {}
        for record in production_records:
            month_key = f"{year}-{record.month:02d}"
            monthly_data[month_key] = {
                "metros_producidos": float(record.metros_producidos),
                "metros_vendidos": float(record.metros_vendidos),
                "unidades_producidas": record.unidades_producidas,
                "unidades_vendidas": record.unidades_vendidas
            }
        
        return {
            "monthly": monthly_data,
            "metadata": {
                "year": year,
                "months_with_data": len(production_records),
                "company_id": company_id
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving production data: {str(e)}")

@router.post("/production")
def create_production_data(
    data: ProductionDataCreate,
    current_user: User = Depends(require_permission("operational", "write")),
    db: Session = Depends(get_db)
):
    """Create or update production data"""
    try:
        company_id = get_company_id(current_user)
        
        # Check if exists
        existing = db.query(ProductionData).filter(
            and_(
                ProductionData.company_id == company_id,
                ProductionData.year == data.year,
                ProductionData.month == data.month
            )
        ).first()
        
        if existing:
            # Update
            for field, value in data.dict().items():
                setattr(existing, field, value)
            existing.updated_at = datetime.utcnow()
            existing.created_by = current_user.id
            db.commit()
            return {"message": "Production data updated", "id": existing.id}
        else:
            # Create
            new_record = ProductionData(
                company_id=company_id,
                created_by=current_user.id,
                **data.dict()
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            return {"message": "Production data created", "id": new_record.id}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving production data: {str(e)}")

# ========================================
# UTILITY ENDPOINTS
# ========================================

@router.get("/companies")
def get_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of companies user has access to"""
    try:
        companies = db.query(Company).all()
        return [
            {
                "id": company.id,
                "name": company.name,
                "description": company.description,
                "industry": company.industry,
                "currency": company.currency
            }
            for company in companies
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving companies: {str(e)}")

@router.delete("/data/{year}/{month}")
def delete_financial_data(
    year: int,
    month: int,
    current_user: User = Depends(require_permission("financial", "delete")),
    db: Session = Depends(get_db)
):
    """Delete financial data for a specific period"""
    try:
        company_id = get_company_id(current_user)
        
        record = db.query(FinancialData).filter(
            and_(
                FinancialData.company_id == company_id,
                FinancialData.year == year,
                FinancialData.month == month
            )
        ).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Financial data not found")
        
        db.delete(record)
        db.commit()
        
        return {"message": f"Financial data for {year}-{month:02d} deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting financial data: {str(e)}")

@router.get("/health")
def financial_api_health():
    """Health check for financial API"""
    return {
        "status": "healthy",
        "service": "financial-api",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }