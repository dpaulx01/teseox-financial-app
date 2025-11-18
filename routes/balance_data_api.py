"""
API para gestionar estados de situación (Balance General).
Permite cargar datos jerárquicos (Activo, Pasivo, Patrimonio),
consultar reportes y obtener métricas financieras clave.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_permission
from auth.tenant_context import get_current_tenant
from database.connection import get_db
from models.balance import BalanceData, RawBalanceData, BalanceConfig
from models.user import User
from services.balance_processor import (
    build_balance_tree,
    compute_balance_core,
    calculate_ratios,
    fetch_financial_summary,
    aggregate_balance_trends,
)

router = APIRouter(prefix="/api/balance", tags=["Balance General"])


def _get_company_id(current_user: User) -> int:
    tenant_id = get_current_tenant()
    company_id = tenant_id or getattr(current_user, "company_id", None)
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin empresa asignada"
        )
    return int(company_id)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class BalanceUploadRow(BaseModel):
    code: str = Field(..., description="Código jerárquico, ej: 1.1.2")
    name: str = Field(..., description="Nombre de la cuenta")
    value: float = Field(..., description="Saldo de la cuenta")

    @validator("code")
    def validate_code(cls, value: str) -> str:
        if not value:
            raise ValueError("El código de cuenta no puede estar vacío")
        return value.strip()

    @validator("name")
    def validate_name(cls, value: str) -> str:
        if not value:
            raise ValueError("El nombre de la cuenta no puede estar vacío")
        return value.strip()


class BalanceUploadPayload(BaseModel):
    year: int = Field(..., ge=1900, le=2100)
    month: Optional[int] = Field(None, ge=1, le=12)
    rows: List[BalanceUploadRow] = Field(..., min_items=1)
    replace_existing: bool = True


class BalanceTreeNode(BaseModel):
    code: str
    name: str
    value: float
    level: int
    children: List["BalanceTreeNode"] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True


BalanceTreeNode.update_forward_refs()


class BalanceMetrics(BaseModel):
    activos: float
    pasivos: float
    patrimonio: float
    capital_trabajo: float
    liquidez_corriente: Optional[float]
    razon_rapida: Optional[float]
    endeudamiento: Optional[float]
    deuda_capital: Optional[float]
    balance_check: float


class BalanceDataResponse(BaseModel):
    totals: Dict[str, float]
    metrics: BalanceMetrics
    tree: List[BalanceTreeNode]
    lastUpdated: Optional[str]


class BalanceDataAPIResponse(BaseModel):
    success: bool
    data: BalanceDataResponse


class BalanceFinancialSummary(BaseModel):
    ingresos: float
    utilidad_neta: float
    utilidad_operacional: float


class BalanceRatios(BaseModel):
    activos: float
    pasivos: float
    patrimonio: float
    capital_trabajo: float
    liquidez_corriente: Optional[float]
    razon_rapida: Optional[float]
    endeudamiento: Optional[float]
    deuda_capital: Optional[float]
    roe: Optional[float]
    roa: Optional[float]
    operating_margin: Optional[float]
    profit_margin: Optional[float]
    assets_to_equity: Optional[float]
    debt_to_equity: Optional[float]
    financials: BalanceFinancialSummary


class BalanceRatiosResponse(BaseModel):
    success: bool
    data: BalanceRatios


class BalanceTrendPoint(BaseModel):
    year: int
    month: Optional[int] = None
    activos: float
    pasivos: float
    patrimonio: float
    capital_trabajo: float
    liquidez_corriente: Optional[float]
    razon_rapida: Optional[float]
    balance_check: float


class BalanceTrendsResponse(BaseModel):
    success: bool
    data: List[BalanceTrendPoint]


def _dict_to_tree(nodes: List[Dict[str, object]]) -> List[BalanceTreeNode]:
    def convert(node_dict: Dict[str, object]) -> BalanceTreeNode:
        children = node_dict.get("children", []) or []
        return BalanceTreeNode(
            code=str(node_dict.get("code", "")),
            name=str(node_dict.get("name", "")),
            value=float(node_dict.get("value", 0)),
            level=int(node_dict.get("level", 0)),
            children=[convert(child) for child in children],
        )

    return [convert(node) for node in nodes]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", dependencies=[Depends(require_permission("financial_data", "manage"))])
def upload_balance_data(
    payload: BalanceUploadPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    if payload.replace_existing:
        db.query(BalanceData).filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year == payload.year,
            BalanceData.period_month == payload.month,
        ).delete(synchronize_session=False)

        db.query(RawBalanceData).filter(
            RawBalanceData.company_id == company_id,
            RawBalanceData.period_year == payload.year,
            RawBalanceData.period_month == payload.month,
        ).delete(synchronize_session=False)

    # Insertar nuevos registros
    for idx, row in enumerate(payload.rows):
        level = row.code.count(".") + 1
        parent = _parent_code(row.code)

        db.add(
            BalanceData(
                company_id=company_id,
                period_year=payload.year,
                period_month=payload.month,
                account_code=row.code,
                account_name=row.name,
                level=level,
                parent_code=parent,
                balance=_decimal(row.value),
            )
        )

        db.add(
            RawBalanceData(
                company_id=company_id,
                period_year=payload.year,
                period_month=payload.month,
                row_index=idx,
                account_code=row.code,
                account_name=row.name,
                balance=_decimal(row.value),
                extra=None,
            )
        )

    db.commit()

    return {
        "success": True,
        "message": "Balance cargado correctamente",
        "rows": len(payload.rows),
    }


@router.get("/data", response_model=BalanceDataAPIResponse)
def get_balance_data(
    year: int = Query(..., ge=1900, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    rows: List[BalanceData] = (
        db.query(BalanceData)
        .filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year == year,
            BalanceData.period_month == month,
        )
        .order_by(BalanceData.level.asc(), BalanceData.account_code.asc())
        .all()
    )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron datos de balance para el periodo seleccionado.",
        )

    totals, metrics_map = compute_balance_core(rows)
    tree_dict = build_balance_tree(rows)
    tree_nodes = _dict_to_tree(tree_dict)
    last_updated = max((r.updated_at for r in rows if r.updated_at), default=None)

    metrics = BalanceMetrics(
        activos=totals.get("activos", 0.0),
        pasivos=totals.get("pasivos", 0.0),
        patrimonio=totals.get("patrimonio", 0.0),
        capital_trabajo=metrics_map.get("capital_trabajo", 0.0),
        liquidez_corriente=metrics_map.get("liquidez_corriente"),
        razon_rapida=metrics_map.get("razon_rapida"),
        endeudamiento=metrics_map.get("endeudamiento"),
        deuda_capital=metrics_map.get("deuda_capital"),
        balance_check=metrics_map.get("balance_check", 0.0),
    )

    return BalanceDataAPIResponse(
        success=True,
        data=BalanceDataResponse(
            totals=totals,
            metrics=metrics,
            tree=tree_nodes,
            lastUpdated=last_updated.isoformat() if last_updated else None,
        ),
    )


@router.get("/ratios", response_model=BalanceRatiosResponse)
def get_balance_ratios(
    year: int = Query(..., ge=1900, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    rows: List[BalanceData] = (
        db.query(BalanceData)
        .filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year == year,
            BalanceData.period_month == month,
        )
        .all()
    )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron datos de balance para el periodo seleccionado.",
        )

    _, metrics_map = compute_balance_core(rows)
    financial_summary = fetch_financial_summary(db, company_id, year)
    ratios_map = calculate_ratios(metrics_map, financial_summary)

    ratios = BalanceRatios(
        activos=ratios_map.get("activos", 0.0),
        pasivos=ratios_map.get("pasivos", 0.0),
        patrimonio=ratios_map.get("patrimonio", 0.0),
        capital_trabajo=ratios_map.get("capital_trabajo", 0.0),
        liquidez_corriente=ratios_map.get("liquidez_corriente"),
        razon_rapida=ratios_map.get("razon_rapida"),
        endeudamiento=ratios_map.get("endeudamiento"),
        deuda_capital=ratios_map.get("deuda_capital"),
        roe=ratios_map.get("roe"),
        roa=ratios_map.get("roa"),
        operating_margin=ratios_map.get("operating_margin"),
        profit_margin=ratios_map.get("profit_margin"),
        assets_to_equity=ratios_map.get("assets_to_equity"),
        debt_to_equity=ratios_map.get("debt_to_equity"),
        financials=BalanceFinancialSummary(**financial_summary),
    )

    return BalanceRatiosResponse(success=True, data=ratios)


@router.get("/trends", response_model=BalanceTrendsResponse)
def get_balance_trends(
    start_year: int = Query(..., ge=1900, le=2100),
    end_year: int = Query(..., ge=1900, le=2100),
    granularity: Literal["annual", "monthly"] = Query("annual"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    points = aggregate_balance_trends(
        db=db,
        company_id=company_id,
        start_year=start_year,
        end_year=end_year,
        granularity=granularity,
    )

    trend_points = [BalanceTrendPoint(**point) for point in points]
    return BalanceTrendsResponse(success=True, data=trend_points)


@router.get("/summary")
def get_balance_summary(
    year: int = Query(..., ge=1900, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    record_count = (
        db.query(func.count(BalanceData.id))
        .filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year == year,
        )
        .scalar()
    ) or 0

    last_raw = (
        db.query(func.max(RawBalanceData.created_at))
        .filter(
            RawBalanceData.company_id == company_id,
            RawBalanceData.period_year == year,
        )
        .scalar()
    )

    config = (
        db.query(BalanceConfig)
        .filter(
            BalanceConfig.company_id == company_id,
            BalanceConfig.year == year,
        )
        .first()
    )

    return {
        "success": True,
        "data": {
            "hasBalanceData": record_count > 0,
            "records": int(record_count),
            "hasConfig": config is not None,
            "lastUpdated": last_raw.isoformat() if last_raw else None,
        },
    }


@router.get("/years")
def get_balance_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    results = (
        db.query(func.distinct(BalanceData.period_year))
        .filter(BalanceData.company_id == company_id)
        .order_by(BalanceData.period_year.desc())
        .all()
    )

    years = [row[0] for row in results if row[0]]

    if not years:
        years = [datetime.utcnow().year]

    return {"success": True, "years": years}


@router.post("/config", dependencies=[Depends(require_permission("financial_data", "manage"))])
def save_balance_config(
    year: int = Query(..., ge=1900, le=2100),
    working_capital_target: Optional[float] = Query(None),
    liquidity_target: Optional[float] = Query(None),
    leverage_target: Optional[float] = Query(None),
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    config = (
        db.query(BalanceConfig)
        .filter(BalanceConfig.company_id == company_id, BalanceConfig.year == year)
        .first()
    )

    if not config:
        config = BalanceConfig(company_id=company_id, year=year)
        db.add(config)

    config.working_capital_target = working_capital_target
    config.liquidity_target = liquidity_target
    config.leverage_target = leverage_target
    config.notes = notes

    db.commit()

    return {"success": True, "message": "Configuración de balance guardada correctamente"}


@router.delete("/data", dependencies=[Depends(require_permission("financial_data", "manage"))])
def delete_balance_data(
    year: int = Query(..., ge=1900, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user)

    deleted = (
        db.query(BalanceData)
        .filter(
            BalanceData.company_id == company_id,
            BalanceData.period_year == year,
            BalanceData.period_month == month,
        )
        .delete(synchronize_session=False)
    )

    db.query(RawBalanceData).filter(
        RawBalanceData.company_id == company_id,
        RawBalanceData.period_year == year,
        RawBalanceData.period_month == month,
    ).delete(synchronize_session=False)

    db.commit()

    return {"success": True, "deleted": int(deleted)}


def _parent_code(code: str) -> Optional[str]:
    return code.rsplit(".", 1)[0] if "." in code else None


def _decimal(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
