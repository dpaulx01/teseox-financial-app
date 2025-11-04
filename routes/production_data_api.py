"""
API para gestionar datos agregados de producción y configuración operativa.
Persistimos los datos en MySQL para que todo el ecosistema dependa solo de la base.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

import jwt
import os

from database.connection import get_db
from models.production import (
    ProductionMonthlyData,
    ProductionConfigModel,
    ProductionCombinedData,
)
from models.sales import SalesTransaction
from models.user import User

router = APIRouter(prefix="/api/production", tags=["Production Data"])

# ---------------------------------------------------------------------------
# Autenticación (mismas reglas que financial_data)
# ---------------------------------------------------------------------------

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

MONTH_INDEX = {name.lower(): idx + 1 for idx, name in enumerate(MONTH_NAMES)}


def month_to_int(value: str | int) -> int:
    if isinstance(value, int):
        if 1 <= value <= 12:
            return value
        raise ValueError("El mes numérico debe estar entre 1 y 12.")
    value = value.strip()
    if value.isdigit():
        return month_to_int(int(value))
    lowered = value.lower()
    if lowered in MONTH_INDEX:
        return MONTH_INDEX[lowered]
    raise ValueError(f"Mes '{value}' no es válido. Use nombres (Enero) o números (1-12).")


def month_to_name(month: int) -> str:
    if 1 <= month <= 12:
        return MONTH_NAMES[month - 1]
    return f"Mes {month}"


def decimal_from_value(value: Optional[float | int | str], default: Decimal = Decimal("0")) -> Decimal:
    if value is None:
        return default
    return Decimal(str(value))


# ---------------------------------------------------------------------------
# Esquemas Pydantic
# ---------------------------------------------------------------------------

class ProductionRecordInput(BaseModel):
    month: str | int
    metrosProducidos: float = Field(0, ge=0)
    metrosVendidos: float = Field(0, ge=0)
    unidadesProducidas: Optional[float] = Field(0, ge=0)
    unidadesVendidas: Optional[float] = Field(0, ge=0)
    capacidadInstalada: Optional[float] = Field(0, ge=0)

    @validator("month")
    def validate_month(cls, value: str | int) -> str | int:
        month_to_int(value)  # Will raise if invalid
        return value


class ProductionDataPayload(BaseModel):
    year: int = Field(..., ge=1900, le=2100)
    records: List[ProductionRecordInput]
    replaceExisting: bool = Field(True, alias="replaceExisting")

    class Config:
        allow_population_by_field_name = True


class ProductionConfigPayload(BaseModel):
    year: int = Field(..., ge=1900, le=2100)
    capacidadMaximaMensual: float = Field(..., ge=0)
    costoFijoProduccion: float = Field(..., ge=0)
    metaPrecioPromedio: float = Field(..., ge=0)
    metaMargenMinimo: float = Field(..., ge=0, le=100)


class CombinedDataPayload(BaseModel):
    year: int = Field(..., ge=1900, le=2100)
    data: Dict


# ---------------------------------------------------------------------------
# Endpoints para datos mensuales
# ---------------------------------------------------------------------------

@router.get("/data")
def get_production_data(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    rows = (
        db.query(ProductionMonthlyData)
        .filter(
            ProductionMonthlyData.company_id == company_id,
            or_(
                ProductionMonthlyData.year == year,
                ProductionMonthlyData.period_year == year,
            ),
        )
        .order_by(ProductionMonthlyData.period_month.asc())
        .all()
    )

    records = []
    for row in rows:
        month_number = row.month or row.period_month
        records.append({
            "month": month_to_name(month_number),
            "monthNumber": month_number,
            "metrosProducidos": float(row.metros_producidos or 0),
            "metrosVendidos": float(row.metros_vendidos or 0),
            "unidadesProducidas": float(row.unidades_producidas or 0),
            "unidadesVendidas": float(row.unidades_vendidas or 0),
            "capacidadInstalada": float(row.capacidad_instalada or 0),
        })

    if not records:
        sales_rows = (
            db.query(
                SalesTransaction.month.label("month"),
                func.sum(SalesTransaction.m2).label("metros"),
                func.sum(SalesTransaction.cantidad_facturada).label("unidades"),
            )
            .filter(
                SalesTransaction.company_id == company_id,
                SalesTransaction.year == year,
            )
            .group_by(SalesTransaction.month)
            .order_by(SalesTransaction.month.asc())
            .all()
        )

        for row in sales_rows:
            month_number = int(row.month or 0)
            if month_number < 1 or month_number > 12:
                continue
            metros = float(row.metros or 0)
            records.append({
                "month": month_to_name(month_number),
                "monthNumber": month_number,
                "metrosProducidos": metros,
                "metrosVendidos": metros,
                "unidadesProducidas": float(row.unidades or 0),
                "unidadesVendidas": float(row.unidades or 0),
                "capacidadInstalada": 0.0,
            })

        records.sort(key=lambda x: x["monthNumber"])

    return {
        "success": True,
        "data": records,
        "count": len(records),
    }


@router.post("/data")
def upsert_production_data(
    payload: ProductionDataPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1

    if payload.replaceExisting:
        (
            db.query(ProductionMonthlyData)
            .filter(
                ProductionMonthlyData.company_id == company_id,
                or_(
                    ProductionMonthlyData.year == payload.year,
                    ProductionMonthlyData.period_year == payload.year,
                ),
            )
            .delete(synchronize_session=False)
        )
        db.flush()

    for record in payload.records:
        month_number = month_to_int(record.month)

        existing = (
            db.query(ProductionMonthlyData)
            .filter(
                ProductionMonthlyData.company_id == company_id,
                or_(
                    ProductionMonthlyData.year == payload.year,
                    ProductionMonthlyData.period_year == payload.year,
                ),
                or_(
                    ProductionMonthlyData.month == month_number,
                    ProductionMonthlyData.period_month == month_number,
                ),
            )
            .first()
        )

        if existing:
            target = existing
        else:
            target = ProductionMonthlyData(
                company_id=company_id,
                year=payload.year,
                month=month_number,
                period_year=payload.year,
                period_month=month_number,
            )
            db.add(target)

        target.year = payload.year
        target.month = month_number
        target.period_year = payload.year
        target.period_month = month_number
        target.metros_producidos = decimal_from_value(record.metrosProducidos)
        target.metros_vendidos = decimal_from_value(record.metrosVendidos)
        target.unidades_producidas = decimal_from_value(record.unidadesProducidas)
        target.unidades_vendidas = decimal_from_value(record.unidadesVendidas)
        target.capacidad_instalada = decimal_from_value(record.capacidadInstalada)

    db.commit()
    return {"success": True, "message": "Datos de producción guardados correctamente", "count": len(payload.records)}


@router.delete("/data")
def delete_production_data(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    deleted = (
        db.query(ProductionMonthlyData)
        .filter(
            ProductionMonthlyData.company_id == company_id,
            or_(
                ProductionMonthlyData.year == year,
                ProductionMonthlyData.period_year == year,
            ),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"success": True, "deleted": deleted}


# ---------------------------------------------------------------------------
# Endpoints de configuración
# ---------------------------------------------------------------------------

@router.get("/config")
def get_production_config(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    config = (
        db.query(ProductionConfigModel)
        .filter(
            ProductionConfigModel.company_id == company_id,
            ProductionConfigModel.year == year,
        )
        .first()
    )

    if not config:
        return {
            "success": True,
            "data": None,
            "message": "No hay configuración guardada para este año.",
        }

    return {
        "success": True,
        "data": {
            "year": config.year,
            "capacidadMaximaMensual": float(config.capacidad_maxima_mensual or 0),
            "costoFijoProduccion": float(config.costo_fijo_produccion or 0),
            "metaPrecioPromedio": float(config.meta_precio_promedio or 0),
            "metaMargenMinimo": float(config.meta_margen_minimo or 0),
            "lastUpdated": config.last_updated.isoformat() if config.last_updated else None,
        },
    }


@router.post("/config")
def save_production_config(
    payload: ProductionConfigPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    config = (
        db.query(ProductionConfigModel)
        .filter(
            ProductionConfigModel.company_id == company_id,
            ProductionConfigModel.year == payload.year,
        )
        .first()
    )

    if not config:
        config = ProductionConfigModel(
            company_id=company_id,
            year=payload.year,
        )
        db.add(config)

    config.capacidad_maxima_mensual = decimal_from_value(payload.capacidadMaximaMensual)
    config.costo_fijo_produccion = decimal_from_value(payload.costoFijoProduccion)
    config.meta_precio_promedio = decimal_from_value(payload.metaPrecioPromedio)
    config.meta_margen_minimo = decimal_from_value(payload.metaMargenMinimo, Decimal("0"))

    db.commit()
    return {"success": True, "message": "Configuración guardada correctamente"}


@router.delete("/config")
def delete_production_config(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    deleted = (
        db.query(ProductionConfigModel)
        .filter(
            ProductionConfigModel.company_id == company_id,
            ProductionConfigModel.year == year,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"success": True, "deleted": deleted}


# ---------------------------------------------------------------------------
# Datos combinados (persistencia JSON)
# ---------------------------------------------------------------------------

@router.get("/combined")
def get_combined_data(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    combined = (
        db.query(ProductionCombinedData)
        .filter(
            ProductionCombinedData.company_id == company_id,
            ProductionCombinedData.year == year,
        )
        .first()
    )

    if not combined:
        return {"success": True, "data": None}

    return {
        "success": True,
        "data": combined.data,
        "lastUpdated": combined.last_updated.isoformat() if combined.last_updated else None,
    }


@router.post("/combined")
def save_combined_data(
    payload: CombinedDataPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    combined = (
        db.query(ProductionCombinedData)
        .filter(
            ProductionCombinedData.company_id == company_id,
            ProductionCombinedData.year == payload.year,
        )
        .first()
    )

    if not combined:
        combined = ProductionCombinedData(
            company_id=company_id,
            year=payload.year,
            data=payload.data,
        )
        db.add(combined)
    else:
        combined.data = payload.data

    db.commit()
    return {"success": True, "message": "Datos combinados guardados"}


@router.delete("/combined")
def delete_combined_data(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1
    deleted = (
        db.query(ProductionCombinedData)
        .filter(
            ProductionCombinedData.company_id == company_id,
            ProductionCombinedData.year == year,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"success": True, "deleted": deleted}


# ---------------------------------------------------------------------------
# Resumen rápido (para UI)
# ---------------------------------------------------------------------------

@router.get("/summary")
def get_production_summary(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1

    production_count = (
        db.query(func.count(ProductionMonthlyData.id))
        .filter(
            ProductionMonthlyData.company_id == company_id,
            or_(
                ProductionMonthlyData.year == year,
                ProductionMonthlyData.period_year == year,
            ),
        )
        .scalar()
    ) or 0

    derived_months = 0
    if production_count == 0:
        derived_months = (
            db.query(func.count(func.distinct(SalesTransaction.month)))
            .filter(
                SalesTransaction.company_id == company_id,
                SalesTransaction.year == year,
            )
            .scalar()
        ) or 0

    last_sales_update = None
    if derived_months:
        last_sales_update = (
            db.query(func.max(SalesTransaction.updated_at))
            .filter(
                SalesTransaction.company_id == company_id,
                SalesTransaction.year == year,
            )
            .scalar()
        )

    config_exists = db.query(ProductionConfigModel).filter(
        ProductionConfigModel.company_id == company_id,
        ProductionConfigModel.year == year,
    ).first()

    combined = db.query(ProductionCombinedData).filter(
        ProductionCombinedData.company_id == company_id,
        ProductionCombinedData.year == year,
    ).first()

    return {
        "success": True,
        "data": {
            "hasProductionData": production_count > 0,
            "records": int(production_count or derived_months),
            "hasConfig": config_exists is not None,
            "hasCombinedData": combined is not None,
            "lastUpdated": (
                combined.last_updated.isoformat()
                if combined and combined.last_updated
                else (last_sales_update.isoformat() if last_sales_update else None)
            ),
            "derivedFromSales": production_count == 0 and derived_months > 0,
        },
    }


@router.get("/years")
def get_available_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 1

    year_values = set()

    production_years = (
        db.query(func.distinct(func.coalesce(ProductionMonthlyData.year, ProductionMonthlyData.period_year)))
        .filter(ProductionMonthlyData.company_id == company_id)
        .all()
    )
    for row in production_years:
        if row[0]:
            year_values.add(int(row[0]))

    config_years = (
        db.query(func.distinct(ProductionConfigModel.year))
        .filter(ProductionConfigModel.company_id == company_id)
        .all()
    )
    for row in config_years:
        if row[0]:
            year_values.add(int(row[0]))

    combined_years = (
        db.query(func.distinct(ProductionCombinedData.year))
        .filter(ProductionCombinedData.company_id == company_id)
        .all()
    )
    for row in combined_years:
        if row[0]:
            year_values.add(int(row[0]))

    sales_years = (
        db.query(func.distinct(SalesTransaction.year))
        .filter(SalesTransaction.company_id == company_id)
        .all()
    )
    for row in sales_years:
        if row[0]:
            year_values.add(int(row[0]))

    if not year_values:
        year_values.add(datetime.utcnow().year)

    years = sorted(year_values)
    return {"success": True, "years": years}
