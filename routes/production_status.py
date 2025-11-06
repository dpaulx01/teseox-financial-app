"""
Rutas para el módulo Status Producción.

Permite cargar cotizaciones en Excel, extraer sus líneas de producto y gestionar
el estado operativo (fechas, estatus, notas, pagos) de cada ítem.
"""
from __future__ import annotations

import io
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, cast

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

try:
    import pandas as pd
except ImportError:  # pragma: no cover - optional dependency
    pd = None

try:  # pragma: no cover - optional dependency
    import holidays  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    holidays = None

from auth.dependencies import get_current_user
from config import Config
from database.connection import get_db
from models import User
from models.production import (
    ProductionDailyPlan,
    ProductionPayment,
    ProductionProduct,
    ProductionQuote,
    ProductionStatusEnum,
    ProductionTypeEnum,
)


# ---------------------------------------------------------------------------
# Pydantic Models for Dashboard
# ---------------------------------------------------------------------------

class KpiCard(BaseModel):
    label: str
    value: str
    color: Optional[str] = None

class DistributionChartItem(BaseModel):
    name: str
    value: float

class UpcomingDeliveryItem(BaseModel):
    id: int
    numero_cotizacion: Optional[str] = None
    descripcion: str
    cliente: Optional[str] = None
    fecha_entrega: date
    dias_restantes: int
    estatus: Optional[str] = None

class StatusBreakdownItem(BaseModel):
    status: str
    count: int
    total_value: float
    percent: float
    total_units: float
    total_metros: float

class RiskAlertItem(BaseModel):
    id: int
    numero_cotizacion: Optional[str] = None
    descripcion: str
    cliente: Optional[str] = None
    fecha_entrega: Optional[date] = None
    dias: int
    tipo: str
    severidad: str
    estatus: Optional[str] = None

class WorkloadSnapshot(BaseModel):
    ingresos_hoy_unidades: float
    ingresos_hoy_metros: float
    ingresos_semana_unidades: float
    ingresos_semana_metros: float
    entregas_semana_unidades: float
    entregas_semana_metros: float
    promedio_plazo_dias: Optional[float] = None
    promedio_retraso_dias: Optional[float] = None

class FinancialSummary(BaseModel):
    total_en_produccion: float  # Suma de valor_subtotal de productos activos
    total_cotizaciones_activas: float  # Suma de valor_total de cotizaciones activas
    valor_atrasado: float
    valor_listo_para_retiro: float
    saldo_por_cobrar: float

class DataGapDetail(BaseModel):
    item_id: int
    numero_cotizacion: Optional[str] = None
    descripcion: str
    cliente: Optional[str] = None
    estatus: Optional[str] = None
    issues: List[str]

class DataGapSummary(BaseModel):
    sin_fecha_entrega: int
    sin_estatus: int
    sin_cliente: int
    sin_cantidad: int
    sin_programacion: int
    sin_factura: int
    detalles: List[DataGapDetail]

class TopClientItem(BaseModel):
    name: str
    item_count: int
    total_value: float
    total_units: float
    total_metros: float

class DailyWorkloadItem(BaseModel):
    fecha: date
    metros: float
    unidades: float

class DailyProductionPlanEntry(BaseModel):
    fecha: date
    metros: float = Field(0, ge=0)
    unidades: float = Field(0, ge=0)
    notas: Optional[str] = None

    @validator("notas")
    def strip_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

class DailyProductionPlanPayload(BaseModel):
    plan: List[DailyProductionPlanEntry]

    @validator("plan")
    def validate_plan(cls, value: List[DailyProductionPlanEntry]) -> List[DailyProductionPlanEntry]:
        seen: Set[date] = set()
        for entry in value:
            if entry.fecha in seen:
                raise ValueError("Las fechas del plan diario deben ser únicas.")
            seen.add(entry.fecha)
        return value

class DailyProductionPlanResponse(BaseModel):
    item_id: int = Field(..., alias="item_id")
    plan: List[DailyProductionPlanEntry]

    class Config:
        allow_population_by_field_name = True


class DailyScheduleItem(BaseModel):
    item_id: int
    numero_cotizacion: Optional[str] = None
    cliente: Optional[str] = None
    descripcion: str
    metros: float
    unidades: float
    estatus: Optional[str] = None
    manual: bool = False


class DailyScheduleDay(BaseModel):
    fecha: date
    metros: float
    unidades: float
    capacidad: Optional[float] = None
    manual: bool = False
    items: List[DailyScheduleItem]


class DailyScheduleResponse(BaseModel):
    days: List[DailyScheduleDay]


# Stock Planning Models
class StockProductProgramming(BaseModel):
    """Programación diaria de un producto de stock."""
    fecha: date
    cantidad: float


class StockProductParsed(BaseModel):
    """Producto extraído del Excel de programación de stock."""
    nombre: str
    categoria: Optional[str] = None
    unidad: Optional[str] = None
    programacion_diaria: List[StockProductProgramming]


class StockPlanningParsedData(BaseModel):
    """Datos parseados del Excel de Contifico (sin guardar aún)."""
    numero_pedido: str
    responsable: Optional[str] = None
    local: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    productos: List[StockProductParsed]


class StockPlanningConfirmRequest(BaseModel):
    """Solicitud para confirmar y guardar la programación de stock con datos adicionales del usuario."""
    parsed_data: StockPlanningParsedData
    bodega: str = Field(..., min_length=1, description="Bodega destino para el pedido de stock")
    notas: Optional[str] = Field(None, description="Notas adicionales sobre el pedido")


class StockPlanningUploadResponse(BaseModel):
    """Respuesta al subir el Excel de programación de stock."""
    parsed_data: StockPlanningParsedData
    message: str


class DashboardKpisResponse(BaseModel):
    kpi_cards: List[KpiCard]
    production_load_chart: List[DistributionChartItem]
    status_breakdown: List[StatusBreakdownItem]
    risk_alerts: List[RiskAlertItem]
    workload_snapshot: WorkloadSnapshot
    financial_summary: FinancialSummary
    top_clients: List[TopClientItem]
    upcoming_deliveries: List[UpcomingDeliveryItem]
    data_gaps: DataGapSummary
    daily_workload: List[DailyWorkloadItem]


router = APIRouter(prefix="/production", tags=["Status Producción"])

@router.get("/dashboard/kpis", response_model=DashboardKpisResponse)
async def get_dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint para obtener los KPIs del dashboard de producción.
    """
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    history_window_days = 31
    month_start = date(today.year, today.month, 1)
    min_allowed_date = min(month_start, today - timedelta(days=history_window_days))
    decimal_zero = Decimal(0)

    active_statuses = [
        ProductionStatusEnum.EN_COLA,
        ProductionStatusEnum.EN_PRODUCCION,
        ProductionStatusEnum.PRODUCCION_PARCIAL,
        ProductionStatusEnum.LISTO_PARA_RETIRO,
    ]
    status_summary: Dict[str, Dict[str, Decimal | int]] = {
        status.value: {
            "count": 0,
            "value": decimal_zero,
            "units": decimal_zero,
            "metros": decimal_zero,
        }
        for status in active_statuses
    }
    status_summary["Sin estatus"] = {
        "count": 0,
        "value": decimal_zero,
        "units": decimal_zero,
        "metros": decimal_zero,
    }

    active_items: List[ProductionProduct] = (
        db.query(ProductionProduct)
        .options(joinedload(ProductionProduct.cotizacion))
        .filter(
            ProductionProduct.estatus != ProductionStatusEnum.ENTREGADO,
            ProductionProduct.estatus != ProductionStatusEnum.EN_BODEGA
        )
        .all()
    )

    overdue_items: List[ProductionProduct] = []
    due_next_7_items: List[ProductionProduct] = []
    due_next_7_ids: Set[int] = set()
    due_soon_items: List[Tuple[ProductionProduct, int]] = []
    missing_date_items: List[ProductionProduct] = []
    missing_status_items: List[ProductionProduct] = []
    client_summary: Dict[str, Dict[str, Decimal | int]] = defaultdict(
        lambda: {
            "count": 0,
            "value": decimal_zero,
            "units": decimal_zero,
            "metros": decimal_zero,
        }
    )

    sin_cliente = 0
    ingresos_hoy_unidades = decimal_zero
    ingresos_hoy_metros = decimal_zero
    ingresos_semana_unidades = decimal_zero
    ingresos_semana_metros = decimal_zero
    plazo_dias: List[int] = []
    overdue_days: List[int] = []
    valor_listo_para_retiro = decimal_zero
    missing_quantity = 0
    schedule_map: Dict[date, Dict[str, Decimal]] = defaultdict(
        lambda: {"metros": decimal_zero, "unidades": decimal_zero}
    )
    gap_registry: Dict[int, Dict[str, Any]] = {}

    def register_gap(item: ProductionProduct, issue: str) -> None:
        entry = gap_registry.setdefault(
            item.id,
            {
                "item": item,
                "quote": item.cotizacion,
                "issues": set(),
            },
        )
        issues_set: Set[str] = entry["issues"]  # type: ignore[assignment]
        issues_set.add(issue)

    manual_plan_by_item: Dict[int, List[ProductionDailyPlan]] = defaultdict(list)
    if active_items:
        plan_entries = (
            db.query(ProductionDailyPlan)
            .filter(ProductionDailyPlan.producto_id.in_([item.id for item in active_items]))
            .all()
        )
        for plan_entry in plan_entries:
            manual_plan_by_item[plan_entry.producto_id].append(plan_entry)
        for entries in manual_plan_by_item.values():
            entries.sort(key=lambda entry: entry.fecha)

    for item in active_items:
        quote = item.cotizacion
        if _is_metadata_description(item.descripcion, quote.odc if quote else None):
            continue
        if _is_service_product(item.descripcion):
            continue

        if not item.estatus:
            register_gap(item, "sin_estatus")
            missing_status_items.append(item)

        status_label = item.estatus.value if item.estatus else "Sin estatus"
        if status_label not in status_summary:
            status_summary[status_label] = {
                "count": 0,
                "value": decimal_zero,
                "units": decimal_zero,
                "metros": decimal_zero,
            }
        entry = status_summary[status_label]
        entry["count"] = int(entry["count"]) + 1

        item_value = item.valor_subtotal if item.valor_subtotal is not None else decimal_zero
        entry["value"] = entry["value"] + item_value

        quantity_value, quantity_unit = _extract_quantity_info(item.cantidad)
        if quantity_value is None:
            missing_quantity += 1
            register_gap(item, "sin_cantidad")
        else:
            if quantity_unit == "metros":
                entry["metros"] = entry["metros"] + quantity_value
            else:
                entry["units"] = entry["units"] + quantity_value

        if item.estatus == ProductionStatusEnum.LISTO_PARA_RETIRO:
            valor_listo_para_retiro += item_value

        if quote and quote.fecha_ingreso:
            ingreso_date = quote.fecha_ingreso.date()
            if quantity_value is not None:
                if ingreso_date == today:
                    if quantity_unit == "metros":
                        ingresos_hoy_metros += quantity_value
                    else:
                        ingresos_hoy_unidades += quantity_value
                if ingreso_date >= start_of_week:
                    if quantity_unit == "metros":
                        ingresos_semana_metros += quantity_value
                    else:
                        ingresos_semana_unidades += quantity_value

        client_name = None
        if quote and quote.cliente and quote.cliente.strip():
            client_name = quote.cliente.strip()
            client_summary[client_name]["count"] = int(client_summary[client_name]["count"]) + 1
            client_summary[client_name]["value"] = client_summary[client_name]["value"] + item_value
            if quantity_value is not None:
                if quantity_unit == "metros":
                    client_summary[client_name]["metros"] = (
                        client_summary[client_name]["metros"] + quantity_value
                    )
                else:
                    client_summary[client_name]["units"] = (
                        client_summary[client_name]["units"] + quantity_value
                    )
        else:
            sin_cliente += 1
            register_gap(item, "sin_cliente")

        if not item.factura or not item.factura.strip():
            register_gap(item, "sin_factura")

        manual_plan_entries = manual_plan_by_item.get(item.id, [])
        # Solo considerar como plan manual si fue editado manualmente
        manually_edited_entries = [
            entry for entry in manual_plan_entries 
            if getattr(entry, 'is_manually_edited', True)  # True por defecto para compatibilidad
        ]
        has_manual_plan = bool(manual_plan_entries)
        if not has_manual_plan and item.fecha_entrega is None:
            register_gap(item, "sin_programacion")
        
        if manually_edited_entries:
            for plan_entry in manually_edited_entries:
                metros_plan = Decimal(plan_entry.metros or decimal_zero)
                unidades_plan = Decimal(plan_entry.unidades or decimal_zero)
                if metros_plan <= decimal_zero and unidades_plan <= decimal_zero:
                    continue
                raw_plan_date = plan_entry.fecha
                if raw_plan_date < min_allowed_date:
                    continue
                if raw_plan_date < today:
                    if _is_working_day(raw_plan_date):
                        target_date = raw_plan_date
                    else:
                        target_date = _previous_working_day(raw_plan_date, include_today=True)
                else:
                    target_date = raw_plan_date if _is_working_day(raw_plan_date) else _next_working_day(raw_plan_date)
                target_bucket = schedule_map[target_date]
                target_bucket["metros"] = target_bucket["metros"] + metros_plan
                target_bucket["unidades"] = target_bucket["unidades"] + unidades_plan
        elif item.fecha_entrega and quantity_value is not None and quantity_value > decimal_zero:
            end_date = item.fecha_entrega
            if end_date < today:
                target_date = _previous_working_day(end_date, include_today=True)
                if target_date < min_allowed_date:
                    continue
                target_bucket = schedule_map[target_date]
                if quantity_unit == "metros":
                    target_bucket["metros"] = target_bucket["metros"] + quantity_value
                else:
                    target_bucket["unidades"] = target_bucket["unidades"] + quantity_value
            else:
                if quote and quote.fecha_ingreso:
                    start_date = quote.fecha_ingreso.date()
                else:
                    start_date = end_date
                if start_date < today:
                    start_date = today
                start_date = _next_working_day(start_date)

                # Para pedidos de stock, la fecha de entrega es el día que estará disponible
                # Para cotizaciones de cliente, la producción termina un día antes
                is_stock = quote and quote.tipo_produccion == ProductionTypeEnum.STOCK
                if is_stock:
                    # Stock: producción disponible el mismo día (si es hábil)
                    if _is_working_day(end_date):
                        production_end = end_date
                    else:
                        production_end = _previous_working_day(end_date, include_today=False)
                else:
                    # Cliente: producción termina el día hábil anterior a la entrega
                    production_end = _previous_working_day(end_date)

                if production_end < start_date:
                    if start_date == end_date and _is_working_day(start_date):
                        working_days = [start_date]
                    else:
                        working_days = [production_end]
                else:
                    working_days = _iter_working_days(start_date, production_end)
                if not working_days:
                    fallback_date = _previous_working_day(end_date, include_today=True)
                    working_days = [fallback_date]

                share = quantity_value / Decimal(len(working_days))
                for target_date in working_days:
                    if target_date < min_allowed_date:
                        continue
                    bucket_date = target_date
                    target_bucket = schedule_map[bucket_date]
                    if quantity_unit == "metros":
                        target_bucket["metros"] = target_bucket["metros"] + share
                    else:
                        target_bucket["unidades"] = target_bucket["unidades"] + share

        if (
            quote
            and quote.fecha_ingreso
            and item.fecha_entrega
            and quantity_value is not None
            and quantity_value > decimal_zero
        ):
            compromiso = (item.fecha_entrega - quote.fecha_ingreso.date()).days
            if compromiso >= 0:
                plazo_dias.append(compromiso)

        if item.fecha_entrega:
            delta_days = (item.fecha_entrega - today).days
            # No generar alertas para productos ya completados
            is_completed = item.estatus in (ProductionStatusEnum.EN_BODEGA, ProductionStatusEnum.ENTREGADO)

            if delta_days < 0:
                if not is_completed:
                    overdue_items.append(item)
                    overdue_days.append(abs(delta_days))
            else:
                if delta_days <= 7 and item.id not in due_next_7_ids and not is_completed:
                    due_next_7_ids.add(item.id)
                    due_next_7_items.append(item)
                if delta_days <= 3 and not is_completed:
                    due_soon_items.append((item, delta_days))
        else:
            missing_date_items.append(item)
            register_gap(item, "sin_fecha_entrega")

    # Cambiar lógica: entregas programadas para esta semana (no solo entregadas)
    end_of_week = start_of_week + timedelta(days=6)  # Domingo de esta semana
    delivered_week_items = (
        db.query(ProductionProduct)
        .options(joinedload(ProductionProduct.cotizacion))
        .filter(
            ProductionProduct.fecha_entrega >= start_of_week,
            ProductionProduct.fecha_entrega <= end_of_week,
            # Incluir productos en producción Y entregados (entregas programadas)
            ProductionProduct.estatus.in_([
                ProductionStatusEnum.EN_PRODUCCION,
                ProductionStatusEnum.ENTREGADO,
                ProductionStatusEnum.LISTO_PARA_RETIRO
            ])
        )
        .all()
    )

    entregas_semana_unidades = decimal_zero
    entregas_semana_metros = decimal_zero

    for scheduled in delivered_week_items:
        scheduled_quote = scheduled.cotizacion
        if _is_metadata_description(
            scheduled.descripcion, scheduled_quote.odc if scheduled_quote else None
        ):
            continue
        scheduled_quantity, scheduled_unit = _extract_quantity_info(scheduled.cantidad)
        if scheduled_quantity is None:
            continue
        if scheduled_unit == "metros":
            entregas_semana_metros += scheduled_quantity
        else:
            entregas_semana_unidades += scheduled_quantity

    def format_currency(value: Decimal | float | int) -> str:
        decimal_value = value if isinstance(value, Decimal) else Decimal(value or 0)
        return f"${decimal_value:,.2f}"

    total_active = sum(int(data["count"]) for data in status_summary.values())
    overdue_count = len(overdue_items)
    due_next_7_count = len(due_next_7_items)
    sin_fecha_entrega = len(missing_date_items)
    sin_estatus = len(missing_status_items)

    total_valor_activo = sum(data["value"] for data in status_summary.values())
    
    # Calcular valor total de cotizaciones activas (no solo suma de productos)
    # Obtener IDs únicos de cotizaciones con productos activos
    active_quote_ids = (
        db.query(ProductionQuote.id.distinct())
        .join(ProductionProduct)
        .filter(
            ProductionProduct.estatus != ProductionStatusEnum.ENTREGADO,
            ProductionProduct.estatus != ProductionStatusEnum.EN_BODEGA
        )
        .subquery()
    )
    
    # Sumar valor_total de esas cotizaciones
    total_cotizaciones_activas = (
        db.query(func.sum(ProductionQuote.valor_total))
        .filter(
            ProductionQuote.id.in_(active_quote_ids),
            ProductionQuote.valor_total.isnot(None)
        )
        .scalar()
    ) or decimal_zero
    
    overdue_value = sum(
        item.valor_subtotal if item.valor_subtotal is not None else decimal_zero
        for item in overdue_items
    )

    # Saldo Total por Cobrar
    quotes_with_payments = (
        db.query(
            ProductionQuote.valor_total,
            func.sum(ProductionPayment.monto).label("total_abonado"),
        )
        .outerjoin(ProductionPayment)
        .group_by(ProductionQuote.id)
        .all()
    )

    saldo_total_por_cobrar = decimal_zero
    for registro in quotes_with_payments:
        valor_total = registro.valor_total or decimal_zero
        total_abonado = registro.total_abonado or decimal_zero
        saldo_total_por_cobrar += valor_total - total_abonado
    if saldo_total_por_cobrar < decimal_zero:
        saldo_total_por_cobrar = decimal_zero

    kpi_cards = [
        KpiCard(label="Líneas activas", value=str(total_active)),
        KpiCard(
            label="Pedidos atrasados",
            value=str(overdue_count),
            color="red" if overdue_count > 0 else None,
        ),
        KpiCard(label="Entregas próximos 7 días", value=str(due_next_7_count)),
        KpiCard(label="Valor activo", value=format_currency(total_valor_activo)),
        KpiCard(label="Saldo por cobrar", value=format_currency(saldo_total_por_cobrar)),
    ]

    status_order = [status.value for status in active_statuses] + ["Sin estatus"]
    production_load_chart = [
        DistributionChartItem(
            name=status_label,
            value=float(
                (status_summary[status_label]["units"] or decimal_zero)
                + (status_summary[status_label]["metros"] or decimal_zero)
            ),
        )
        for status_label in status_order
        if status_label in status_summary and status_summary[status_label]["count"]
    ]

    status_breakdown = [
        StatusBreakdownItem(
            status=status_label,
            count=int(status_summary[status_label]["count"]),
            total_value=float(status_summary[status_label]["value"]),
            percent=round(
                (int(status_summary[status_label]["count"]) / total_active) * 100, 2
            )
            if total_active
            else 0.0,
            total_units=float(status_summary[status_label]["units"]),
            total_metros=float(status_summary[status_label]["metros"]),
        )
        for status_label in status_order
        if status_label in status_summary and status_summary[status_label]["count"]
    ]

    risk_alerts: List[RiskAlertItem] = []
    added_alerts: Set[Tuple[str, int]] = set()

    def append_alert(item: ProductionProduct, tipo: str, dias: int, severidad: str) -> None:
        key = (tipo, item.id)
        if key in added_alerts:
            return
        added_alerts.add(key)
        risk_alerts.append(
            RiskAlertItem(
                id=item.id,
                numero_cotizacion=item.cotizacion.numero_cotizacion if item.cotizacion else None,
                descripcion=item.descripcion,
                cliente=item.cotizacion.cliente if item.cotizacion else None,
                fecha_entrega=item.fecha_entrega,
                dias=dias,
                tipo=tipo,
                severidad=severidad,
                estatus=item.estatus.value if item.estatus else None,
            )
        )

    for item in overdue_items:
        dias_atraso = (today - item.fecha_entrega).days if item.fecha_entrega else 0
        append_alert(item, "overdue", dias_atraso, "high")

    for item, dias in due_soon_items:
        append_alert(item, "due_soon", dias, "medium")

    for item in missing_date_items:
        append_alert(item, "missing_date", 0, "medium")

    for item in missing_status_items:
        append_alert(item, "missing_status", 0, "low")

    severity_rank = {"high": 0, "medium": 1, "low": 2}
    risk_alerts.sort(
        key=lambda alert: (
            severity_rank.get(alert.severidad, 3),
            -alert.dias if alert.tipo == "overdue" else alert.dias,
        )
    )
    risk_alerts = risk_alerts[:12]

    promedio_plazo = round(sum(plazo_dias) / len(plazo_dias), 1) if plazo_dias else None
    promedio_retraso = round(sum(overdue_days) / len(overdue_days), 1) if overdue_days else None

    workload_snapshot = WorkloadSnapshot(
        ingresos_hoy_unidades=float(ingresos_hoy_unidades),
        ingresos_hoy_metros=float(ingresos_hoy_metros),
        ingresos_semana_unidades=float(ingresos_semana_unidades),
        ingresos_semana_metros=float(ingresos_semana_metros),
        entregas_semana_unidades=float(entregas_semana_unidades),
        entregas_semana_metros=float(entregas_semana_metros),
        promedio_plazo_dias=promedio_plazo,
        promedio_retraso_dias=promedio_retraso,
    )

    financial_summary = FinancialSummary(
        total_en_produccion=float(total_valor_activo),
        total_cotizaciones_activas=float(total_cotizaciones_activas),
        valor_atrasado=float(overdue_value),
        valor_listo_para_retiro=float(valor_listo_para_retiro),
        saldo_por_cobrar=float(saldo_total_por_cobrar),
    )

    top_clients = [
        TopClientItem(
            name=name or "N/A",
            item_count=int(data["count"]),
            total_value=float(data["value"]),
            total_units=float(data["units"]),
            total_metros=float(data["metros"]),
        )
        for name, data in sorted(
            client_summary.items(),
            key=lambda pair: (
                pair[1]["metros"],
                pair[1]["units"],
            ),
            reverse=True,
        )[:5]
    ]

    upcoming_deliveries = [
        UpcomingDeliveryItem(
            id=item.id,
            numero_cotizacion=item.cotizacion.numero_cotizacion if item.cotizacion else None,
            descripcion=item.descripcion,
            cliente=item.cotizacion.cliente if item.cotizacion else None,
            fecha_entrega=item.fecha_entrega,
            dias_restantes=(item.fecha_entrega - today).days if item.fecha_entrega else 0,
            estatus=item.estatus.value if item.estatus else None,
        )
        for item in sorted(
            (itm for itm in due_next_7_items if itm.fecha_entrega is not None),
            key=lambda itm: itm.fecha_entrega,
        )[:10]
    ]

    issue_keys = [
        "sin_fecha_entrega",
        "sin_estatus",
        "sin_cliente",
        "sin_cantidad",
        "sin_programacion",
        "sin_factura",
    ]
    issue_counts = {key: 0 for key in issue_keys}
    for record in gap_registry.values():
        issues_set = cast(Set[str], record["issues"])
        for key in issue_keys:
            if key in issues_set:
                issue_counts[key] += 1

    severity_weights = {
        "sin_fecha_entrega": 0,
        "sin_programacion": 1,
        "sin_estatus": 2,
        "sin_cliente": 3,
        "sin_cantidad": 4,
        "sin_factura": 5,
    }

    gap_details_list: List[DataGapDetail] = []
    for record in gap_registry.values():
        issues_set = cast(Set[str], record["issues"])
        sorted_issues = sorted(issues_set, key=lambda issue: severity_weights.get(issue, 99))
        quote = record["quote"]
        gap_details_list.append(
            DataGapDetail(
                item_id=record["item"].id,
                numero_cotizacion=quote.numero_cotizacion if quote else None,
                descripcion=record["item"].descripcion,
                cliente=quote.cliente.strip() if quote and quote.cliente else None,
                estatus=record["item"].estatus.value if record["item"].estatus else None,
                issues=sorted_issues,
            )
        )

    gap_details_list.sort(
        key=lambda detail: (
            severity_weights.get(detail.issues[0], 99) if detail.issues else 99,
            detail.numero_cotizacion or "",
            detail.item_id,
        )
    )

    data_gaps = DataGapSummary(
        sin_fecha_entrega=issue_counts["sin_fecha_entrega"],
        sin_estatus=issue_counts["sin_estatus"],
        sin_cliente=issue_counts["sin_cliente"],
        sin_cantidad=issue_counts["sin_cantidad"],
        sin_programacion=issue_counts["sin_programacion"],
        sin_factura=issue_counts["sin_factura"],
        detalles=gap_details_list,
    )

    max_future = today + timedelta(days=21)
    daily_workload = [
        DailyWorkloadItem(
            fecha=target_date,
            metros=float(values["metros"]),
            unidades=float(values["unidades"]),
        )
        for target_date, values in sorted(schedule_map.items())
        if (values["metros"] > decimal_zero or values["unidades"] > decimal_zero)
        and target_date <= max_future
        and target_date >= min_allowed_date
    ]

    return DashboardKpisResponse(
        kpi_cards=kpi_cards,
        production_load_chart=production_load_chart,
        status_breakdown=status_breakdown,
        risk_alerts=risk_alerts,
        workload_snapshot=workload_snapshot,
        financial_summary=financial_summary,
        top_clients=top_clients,
        upcoming_deliveries=upcoming_deliveries,
        data_gaps=data_gaps,
        daily_workload=daily_workload,
    )



UPLOAD_DIR = Path(Config.UPLOAD_DIR) / "production"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATUS_CHOICES = {status.value for status in ProductionStatusEnum}

_METADATA_KEYWORDS = (
    "TIEMPO DE PRODUCCION",
    "TIEMPO ESTIMADO",
    "DIAS CALENDARIO",
    "DIAS HABILES",
    "ENTREGA ESTIMADA",
    "CONDICIONES DE PAGO",
    "CONDICIONES GENERALES",
    "OBSERVACIONES",
    "PROGRAMACION",
    "DESPACHO",
    "REFERENCIA TRANSPORTE",
)


def _is_metadata_description(descripcion: str | None, odc_value: Optional[str]) -> bool:
    normalized = _strip_accents(descripcion or "").upper()
    if not normalized:
        return False
    normalized_compact = re.sub(r"\s+", " ", normalized)
    normalized_clean = re.sub(r"[^A-Z0-9]", "", normalized)
    if odc_value:
        odc_clean = re.sub(r"[^A-Z0-9]", "", _strip_accents(odc_value).upper())
        if odc_clean and odc_clean in normalized_clean:
            return True
    if any(keyword in normalized for keyword in _METADATA_KEYWORDS):
        return True
    if "||" in (descripcion or ""):
        return True
    if re.match(r"^(?:ODC|ORDEN\s+DE\s+COMPRA)\b", normalized_compact):
        return True
    return False

_QUANTITY_PATTERN = re.compile(r"-?\d+(?:[.,]\d+)?")
_METER_KEYWORDS = (
    "M", "MT", "MTS", "METRO", "METROS", "MTR", "MTRS", "ML", "M2", "M3", "MTS2", "MT2", "MTS3", "MT3"
)
_UNIT_KEYWORDS = (
    "UN", "UNIDAD", "UNIDADES", "UND", "UNDS", "U", "UNID", "UNIDS", "PIEZA", "PIEZAS", "PZA", "PZAS", "PZ", "PZS"
)
_SERVICE_KEYWORDS = (
    "SERVICIO",
    "SERVICIOS",
    "LOGIST",
    "LOGÍSTIC",
    "TRANSPORTE",
    "FLETE",
    "INSTALACION",
    "INSTALACIÓN",
    "MANO DE OBRA",
    "IMPLEMENTACION",
    "IMPLEMENTACIÓN",
)


def _normalize_quantity_unit(raw: Optional[str]) -> str:
    normalized = _strip_accents((raw or "")).upper()
    if not normalized:
        return "unidades"
    normalized = re.sub(r"[^A-Z0-9]", " ", normalized)
    tokens = normalized.split()
    joined = " ".join(tokens)

    for keyword in _METER_KEYWORDS:
        pattern = rf"\b{re.escape(keyword)}\b"
        if re.search(pattern, joined):
            return "metros"

    for keyword in _UNIT_KEYWORDS:
        pattern = rf"\b{re.escape(keyword)}\b"
        if re.search(pattern, joined):
            return "unidades"

    return "unidades"


def _extract_quantity_info(raw: Optional[str]) -> Tuple[Optional[Decimal], str]:
    if not raw:
        return None, "unidades"

    match = _QUANTITY_PATTERN.search(raw.replace(",", "."))
    if not match:
        return None, _normalize_quantity_unit(raw)

    number_str = match.group(0)
    try:
        value = Decimal(number_str)
    except InvalidOperation:
        return None, _normalize_quantity_unit(raw)

    unit = _normalize_quantity_unit(raw)
    return value, unit


def _is_service_product(description: Optional[str]) -> bool:
    normalized = _strip_accents(description or "").upper()
    if not normalized:
        return False
    return any(keyword in normalized for keyword in _SERVICE_KEYWORDS)


_ECUADOR_HOLIDAY_CACHE: Dict[int, Set[date]] = {}


def _calculate_easter_sunday(year: int) -> date:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = 1 + ((h + l - 7 * m + 114) % 31)
    return date(year, month, day)


def _apply_observance_rules(dates: Set[date]) -> Set[date]:
    observed = set(dates)
    for original in dates:
        weekday = original.weekday()
        if weekday == 5:  # Saturday -> Friday
            observed.add(original - timedelta(days=1))
        elif weekday == 6:  # Sunday -> Monday
            observed.add(original + timedelta(days=1))
        elif weekday == 1:  # Tuesday -> Monday
            observed.add(original - timedelta(days=1))
        elif weekday == 2:  # Wednesday -> Friday
            observed.add(original + timedelta(days=2))
        elif weekday == 3:  # Thursday -> Friday
            observed.add(original + timedelta(days=1))
    return observed


def _fallback_ecuador_holidays(year: int) -> Set[date]:
    easter = _calculate_easter_sunday(year)
    carnival_monday = easter - timedelta(days=48)
    carnival_tuesday = easter - timedelta(days=47)
    good_friday = easter - timedelta(days=2)

    base_dates = {
        date(year, 1, 1),   # Año Nuevo
        carnival_monday,
        carnival_tuesday,
        good_friday,
        date(year, 5, 1),   # Día del Trabajo
        date(year, 5, 24),  # Batalla de Pichincha
        date(year, 8, 10),  # Primer Grito de Independencia
        date(year, 10, 9),  # Independencia de Guayaquil
        date(year, 11, 2),  # Día de los Difuntos
        date(year, 11, 3),  # Independencia de Cuenca
        date(year, 12, 25), # Navidad
    }

    return _apply_observance_rules(base_dates)


def _get_ecuador_holidays(year: int) -> Set[date]:
    if year in _ECUADOR_HOLIDAY_CACHE:
        return _ECUADOR_HOLIDAY_CACHE[year]

    holiday_set: Set[date]
    if holidays is not None:
        try:
            country_holidays = holidays.country_holidays("EC", years=[year])  # type: ignore[attr-defined]
            holiday_set = set(country_holidays.keys())
        except Exception:  # pragma: no cover - defensive
            holiday_set = _fallback_ecuador_holidays(year)
    else:
        holiday_set = _fallback_ecuador_holidays(year)

    _ECUADOR_HOLIDAY_CACHE[year] = holiday_set
    return holiday_set


def _is_ecuador_holiday(value: date) -> bool:
    holidays_set = _get_ecuador_holidays(value.year)
    return value in holidays_set


def _is_working_day(value: date) -> bool:
    return value.weekday() < 5 and not _is_ecuador_holiday(value)


def _next_working_day(value: date) -> date:
    candidate = value
    while not _is_working_day(candidate):
        candidate += timedelta(days=1)
    return candidate


def _previous_working_day(value: date, *, include_today: bool = False) -> date:
    candidate = value if include_today else value - timedelta(days=1)
    while not _is_working_day(candidate):
        candidate -= timedelta(days=1)
    return candidate


def _iter_working_days(start: date, end: date) -> List[date]:
    days: List[date] = []
    current = start
    while current <= end:
        if _is_working_day(current):
            days.append(current)
        current += timedelta(days=1)
    return days


# ---------------------------------------------------------------------------
# Utilidades de parsing
# ---------------------------------------------------------------------------

def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _clean_line(line: str) -> str:
    line = _strip_accents(line or "")
    return re.sub(r"\s+", " ", line).strip()


def _parse_decimal(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None

    normalized = re.sub(r"[^\d,.\-]", "", cleaned)
    if normalized in {"", "-", ".", ",", "-.", "-,"}:
        return None

    sign = ""
    if normalized.startswith("-"):
        sign = "-"
        normalized = normalized[1:]

    if not normalized:
        return None

    separator_positions = [idx for idx, ch in enumerate(normalized) if ch in {".", ","}]

    if separator_positions:
        last_sep_index = separator_positions[-1]
        int_part_raw = normalized[:last_sep_index]
        frac_part_raw = normalized[last_sep_index + 1 :]

        int_digits = re.sub(r"[^\d]", "", int_part_raw)
        frac_digits = re.sub(r"[^\d]", "", frac_part_raw)

        if frac_digits:
            candidate = f"{sign}{int_digits or '0'}.{frac_digits}"
        else:
            candidate = f"{sign}{int_digits}{frac_digits}"
    else:
        candidate = f"{sign}{normalized}"

    try:
        return Decimal(candidate)
    except InvalidOperation:
        return None


def _detect_product_lines(lines: List[str]) -> List[str]:
    header_index = next(
        (
            idx
            for idx, line in enumerate(lines)
            if ("DESCRIPCION" in line.upper() or "DESCRIPCIÓN" in line.upper())
            and ("SUBTOTAL" in line.upper() or "VALOR" in line.upper())
        ),
        -1,
    )
    if header_index == -1:
        return []

    product_lines: List[str] = []
    for line in lines[header_index + 1 :]:
        if re.match(r"^(TOTAL|SALDO|OBSERVACIONES|CONDICIONES)", line, re.IGNORECASE):
            break
        product_lines.append(line)
    return product_lines


def _chunk_items(product_lines: List[str]) -> List[str]:
    """
    Agrupa líneas de productos cuando se dividen en varias líneas.
    """
    items: List[str] = []
    current: Optional[str] = None

    for line in product_lines:
        match = re.match(r"^(\d+)\s+(.+)", line)
        if match:
            if current:
                items.append(current.strip())
            current = match.group(2)
        elif current:
            current = f"{current} {line}"

    if current:
        items.append(current.strip())

    return items


def _parse_product_line(content: str) -> Optional[dict]:
    subtotal_match = re.search(r"(\$?\s?[0-9\.,]+)\s*$", content)
    subtotal_raw = subtotal_match.group(1) if subtotal_match else None
    without_subtotal = (
        content[: subtotal_match.start()].strip() if subtotal_match else content
    )

    quantity_match = re.search(
        r"([0-9\.,]+\s*(?:m2|m3|m|kg|lb|l|lts?|unidad(?:es)?|un|u|ud|uds|pz|pzs|pieza(?:s)?|kit|box|rollo(?:s)?|set(?:s)?|bulto(?:s)?|gl|gal|pack|hrs?|horas?)?)$",
        without_subtotal,
        re.IGNORECASE,
    )

    if quantity_match:
        cantidad_raw = quantity_match.group(1)
        descripcion = without_subtotal[: quantity_match.start()].strip()
    else:
        cantidad_raw = None
        descripcion = without_subtotal.strip()

    valor_subtotal = _parse_decimal(subtotal_raw)
    if not descripcion or valor_subtotal is None:
        return None

    return {
        "descripcion": descripcion,
        "cantidad": cantidad_raw,
        "valor_subtotal": valor_subtotal,
    }


def _parse_products(lines: List[str]) -> List[dict]:
    product_lines = _detect_product_lines(lines)
    if not product_lines:
        return []
    chunks = _chunk_items(product_lines)
    products = []
    for chunk in chunks:
        parsed = _parse_product_line(chunk)
        if parsed:
            products.append(parsed)
    return products


def _parse_total(text: str) -> Optional[Decimal]:
    lines = text.splitlines()
    primary_matches: List[Decimal] = []
    fallback_matches: List[Decimal] = []

    for line in lines:
        normalized = line.strip()
        if not normalized:
            continue
        if re.match(r'^\s*(TOTAL|GRAN\s+TOTAL|SALDO)\b', normalized, re.IGNORECASE):
            value = _parse_decimal(normalized.split(':')[-1])
            if value is not None:
                primary_matches.append(value)
        elif re.search(r'TOTAL', normalized, re.IGNORECASE):
            value = _parse_decimal(normalized.split(':')[-1])
            if value is not None:
                fallback_matches.append(value)

    if primary_matches:
        return max(primary_matches)
    if fallback_matches:
        return max(fallback_matches)

    return None


def _extract_table_products(content: bytes) -> List[dict]:
    productos: List[dict] = []
    seen: Set[Tuple[str, str, Decimal]] = set()
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    if not table or len(table) < 2:
                        continue

                    header_info = None
                    for idx, raw_header in enumerate(table[:5]):
                        header_cells = [_clean_line(str(cell)) for cell in raw_header if cell is not None]
                        normalized_headers = [_strip_accents(cell).upper() for cell in header_cells]
                        if not header_cells:
                            continue
                        if any('DESCRIPCION' in cell or 'DESCRIPCIÓN' in cell for cell in normalized_headers) and any(
                            'SUBTOTAL' in cell or 'TOTAL' in cell or 'VALOR' in cell for cell in normalized_headers
                        ):
                            header_info = (idx, header_cells, normalized_headers)
                            break

                    if not header_info:
                        continue

                    header_idx, header_cells, normalized_headers = header_info

                    def _find_index(targets: List[str]) -> Optional[int]:
                        for target in targets:
                            for idx2, header in enumerate(normalized_headers):
                                if target in header:
                                    return idx2
                        return None

                    desc_idx = _find_index(['DESCRIPCION', 'DESCRIPCIÓN'])
                    qty_idx = _find_index(['CANTIDAD'])
                    unit_idx = _find_index(['UNIDAD'])
                    subtotal_idx = _find_index(['SUBTOTAL', 'TOTAL', 'VALOR'])

                    if desc_idx is None or subtotal_idx is None:
                        continue

                    for raw_row in table[header_idx + 1 :]:
                        if not raw_row:
                            continue
                        cells = [_clean_line(str(cell)) for cell in raw_row]
                        if len(cells) < len(header_cells):
                            cells.extend([''] * (len(header_cells) - len(cells)))
                        if not cells:
                            continue

                        joined_upper = " ".join(cells).upper()
                        if joined_upper.startswith('TOTAL') or joined_upper.startswith('SUBTOTAL'):
                            continue

                        descripcion = cells[desc_idx] if desc_idx < len(cells) else ''
                        if not descripcion or descripcion.upper().startswith('TOTAL'):
                            continue

                        quantity_value = cells[qty_idx] if qty_idx is not None and qty_idx < len(cells) else ''
                        unit_value = cells[unit_idx] if unit_idx is not None and unit_idx < len(cells) else ''
                        quantity_text = " ".join(filter(None, [quantity_value, unit_value])).strip()
                        quantity_text = quantity_text or None

                        subtotal_candidate = cells[subtotal_idx] if subtotal_idx < len(cells) else ''
                        subtotal = _parse_decimal(subtotal_candidate)
                        if subtotal is None:
                            for candidate in reversed(cells):
                                subtotal = _parse_decimal(candidate)
                                if subtotal is not None:
                                    break

                        if subtotal is None:
                            continue

                        key = (descripcion.lower(), (quantity_text or '').lower(), subtotal)
                        if key in seen:
                            continue
                        seen.add(key)

                        productos.append(
                            {
                                "descripcion": descripcion,
                                "cantidad": quantity_text,
                                "valor_subtotal": subtotal,
                            }
                        )
    except Exception:
        return []
    return productos


def _read_excel(content: bytes, filename: str):
    if pd is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "El servidor no tiene instaladas las dependencias para procesar Excel. "
                "Instale pandas, openpyxl y xlrd."
            ),
        )

    buffer = io.BytesIO(content)
    extension = Path(filename or "").suffix.lower()
    engine = None
    if extension == ".xls":
        engine = "xlrd"
    elif extension == ".xlsx":
        engine = "openpyxl"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de archivo no soportado.")

    try:
        df = pd.read_excel(buffer, header=None, dtype=str, engine=engine)
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falta instalar el motor para leer Excel (openpyxl o xlrd).",
        ) from exc
    except ValueError:
        buffer.seek(0)
        df = pd.read_excel(buffer, header=None, dtype=str)

    return df.fillna("")


def parse_quote_excel(content: bytes, filename: str) -> dict:
    df = _read_excel(content, filename)
    values = df.applymap(_clean_line).values.tolist()
    flat_text = "\n".join(" ".join(row) for row in values if any(row))
    normalized_text = _strip_accents(flat_text)

    productos: List[dict] = []
    metadata_notes: List[str] = []
    seen: Set[Tuple[str, str, Decimal]] = set()

    header_idx = None
    header_map: dict[str, int] = {}

    quote_number: Optional[str] = None
    for row in values:
        for cell in row:
            if not cell:
                continue
            normalized_cell = _strip_accents(cell).upper()
            match = re.search(r"COT\s*([A-Z0-9\-\.]+)", normalized_cell)
            if match:
                candidate = match.group(1)
                candidate = re.sub(r"[^\w\-]", "", candidate)
                if candidate:
                    quote_number = candidate
                    break
        if quote_number:
            break

    for idx, row in enumerate(values[:50]):
        normalized_row = [_strip_accents(cell).upper() for cell in row]
        if not normalized_row:
            continue
        if (
            any("CANT" in cell for cell in normalized_row)
            and any("UNID" in cell for cell in normalized_row)
            and any("SUBTOTAL" in cell or "TOTAL" in cell or "VALOR" in cell for cell in normalized_row)
            and (any("BIEN" in cell for cell in normalized_row) or any("DESCRIP" in cell for cell in normalized_row))
        ):
            header_idx = idx
            for col_idx, header in enumerate(normalized_row):
                if any(token in header for token in ["CANT", "CANTIDAD"]):
                    header_map['cantidad'] = col_idx
                if any(token in header for token in ["UNID", "UND", "UNIDAD"]):
                    header_map['unidad'] = col_idx
                if any(token in header for token in ["CODIGO", "CÓDIGO", "ITEM", "PRODUCTO"]):
                    header_map['codigo'] = col_idx
                if any(token in header for token in ["BIEN", "SERVICIO", "DESCRIP"]):
                    header_map['descripcion'] = col_idx
                if any(token in header for token in ["SUBTOTAL", "TOTAL", "VALOR"]):
                    header_map['subtotal'] = col_idx
            break

    if header_idx is None or 'descripcion' not in header_map or 'subtotal' not in header_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudieron identificar las columnas principales en el Excel.",
        )

    _qty_idx = header_map.get('cantidad')
    _unidad_idx = header_map.get('unidad')
    _codigo_idx = header_map.get('codigo')
    _desc_idx = header_map['descripcion']
    _subtotal_idx = header_map['subtotal']

    for row in values[header_idx + 1 :]:
        if not row or not any(row):
            continue
        normalized_row = [_strip_accents(cell).upper() for cell in row]
        if normalized_row and (normalized_row[0].startswith('TOTAL') or normalized_row[0].startswith('SUBTOTAL')):
            break

        cells = [cell if isinstance(cell, str) else str(cell) for cell in row]
        cells = cells + [''] * max(0, _subtotal_idx + 1 - len(cells))
        if len(cells) <= _subtotal_idx:
            cells = cells + [''] * (_subtotal_idx + 1 - len(cells))

        subtotal_cell_raw = cells[_subtotal_idx].strip() if _subtotal_idx < len(cells) else ''
        normalized_subtotal_label = re.sub(
            r"[^A-Z]", "", _strip_accents(subtotal_cell_raw).upper()
        )
        if normalized_subtotal_label.startswith("SUBTOTAL") or normalized_subtotal_label.startswith("TOTAL"):
            continue

        descripcion = cells[_desc_idx].strip() if _desc_idx < len(cells) else ''
        if not descripcion or descripcion.upper().startswith('DESCRIP'):
            continue

        if _is_metadata_description(descripcion, None):
            metadata_value = descripcion.strip()
            if metadata_value:
                metadata_notes.append(metadata_value)
            continue

        subtotal_candidate = subtotal_cell_raw
        subtotal = _parse_decimal(subtotal_candidate)
        if subtotal is None:
            for cell in reversed(cells):
                subtotal = _parse_decimal(cell)
                if subtotal is not None:
                    break
        if subtotal is None:
            continue

        quantity_value = cells[_qty_idx].strip() if _qty_idx is not None and _qty_idx < len(cells) else ''
        unit_value = cells[_unidad_idx].strip() if _unidad_idx is not None and _unidad_idx < len(cells) else ''
        quantity_text = " ".join(filter(None, [quantity_value, unit_value])).strip() or None
        codigo_value = cells[_codigo_idx].strip() if _codigo_idx is not None and _codigo_idx < len(cells) else ''

        if not quantity_text and not codigo_value:
            continue

        key = (descripcion.lower(), (quantity_text or "").lower(), subtotal)
        if key in seen:
            continue
        seen.add(key)

        productos.append(
            {
                "descripcion": descripcion,
                "cantidad": quantity_text,
                "valor_subtotal": subtotal,
            }
        )

    def _search(pattern: str) -> Optional[str]:
        match = re.search(pattern, flat_text, re.IGNORECASE)
        if not match:
            match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            return _clean_line(match.group(1))
        return None

    if not quote_number:
        quote_number = _search(r"COTIZACION[:\s]*No\.?:?\s*([A-Za-z0-9\-]+)")
    if not quote_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontró el número de cotización en el archivo Excel.",
        )

    cliente_value = _search(r"Cliente[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    contacto_value = _search(r"ATENCION[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    proyecto_value = _search(r"PROYECTO[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \-\.]+)")
    odc_value = _search(r"ODC[:\s]*([A-Za-z0-9\-]+)")

    filtered_products = [
        item for item in productos if not _is_metadata_description(item["descripcion"], odc_value)
    ]

    if not filtered_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudieron extraer líneas de productos del Excel.",
        )

    productos = filtered_products

    valor_total = _parse_total(normalized_text)
    if valor_total is None:
        valor_total = sum((item["valor_subtotal"] or Decimal(0) for item in productos), Decimal(0))

    metadata_notes = list(dict.fromkeys(metadata_notes))

    return {
        "numero_cotizacion": quote_number,
        "cliente": cliente_value,
        "contacto": contacto_value,
        "proyecto": proyecto_value,
        "odc": odc_value,
        "valor_total": valor_total,
        "productos": productos,
        "metadata_notes": metadata_notes,
    }


def parse_stock_planning_excel(content: bytes, filename: str) -> dict:
    """
    Parser específico para el formato de Excel de Contifico (Pedido semanal de stock).
    Extrae:
    - Número de pedido (PDI xxxxxxxx)
    - Período (fechas inicio/fin)
    - Responsable
    - Local/Bodega
    - Productos con programación diaria (columnas "Actual" de cada día)
    """
    df = _read_excel(content, filename)
    values = df.applymap(_clean_line).values.tolist()

    # Extraer información del encabezado
    numero_pedido: Optional[str] = None
    responsable: Optional[str] = None
    local: Optional[str] = None
    fecha_periodo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

    # Buscar en las primeras 10 filas el encabezado
    for row in values[:10]:
        row_text = " ".join(str(cell) for cell in row if cell)
        normalized = _strip_accents(row_text).upper()

        # Buscar número de pedido (ej: "Pedido: PDI 202409000006")
        if not numero_pedido:
            match = re.search(r"PEDIDO[:\s]*PDI\s*(\d+)", normalized)
            if match:
                numero_pedido = f"PDI{match.group(1)}"

        # Buscar período (ej: "Periodo 20/10/2025 - 26/10/2025")
        if not fecha_periodo:
            match = re.search(r"PERIODO[:\s]*(.+)", normalized)
            if match:
                fecha_periodo = match.group(1).strip()
                # Intentar parsear las fechas
                date_match = re.search(r"(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})", fecha_periodo)
                if date_match:
                    try:
                        fecha_inicio = datetime.strptime(date_match.group(1), "%d/%m/%Y").date()
                        fecha_fin = datetime.strptime(date_match.group(2), "%d/%m/%Y").date()
                    except ValueError:
                        pass

        # Buscar responsable (ej: "Responsable bherrera01")
        if not responsable:
            match = re.search(r"RESPONSABLE[:\s]*([A-Za-z0-9_]+)", normalized)
            if match:
                responsable = match.group(1)

        # Buscar local/bodega (ej: "Local Materia Prima")
        if not local:
            match = re.search(r"LOCAL[:\s]*(.+?)(?:RESPONSABLE|$)", normalized)
            if match:
                local = match.group(1).strip()

    if not numero_pedido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontró el número de pedido (PDI) en el Excel de programación de stock."
        )

    # Buscar la fila de encabezado con los días de la semana
    header_idx = None
    day_columns: Dict[str, Dict[str, int]] = {}  # {dia: {"sugerencia": idx, "actual": idx}}

    for idx, row in enumerate(values[:15]):
        normalized_row = [_strip_accents(str(cell)).upper() for cell in row]
        row_text = " ".join(normalized_row)

        # Detectar fila que contiene "LUNES MARTES MIERCOLES..."
        if "LUNES" in row_text and "MARTES" in row_text:
            header_idx = idx

            # Mapear índices de columnas por día
            for col_idx, cell in enumerate(normalized_row):
                if "LUNES" in cell:
                    day_columns["LUNES"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "MARTES" in cell:
                    day_columns["MARTES"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "MIERCOLES" in cell or "MI RCOLES" in cell:
                    day_columns["MIERCOLES"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "JUEVES" in cell:
                    day_columns["JUEVES"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "VIERNES" in cell:
                    day_columns["VIERNES"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "SABADO" in cell or "S BADO" in cell:
                    day_columns["SABADO"] = {"sugerencia": col_idx, "actual": col_idx + 1}
                elif "DOMINGO" in cell:
                    day_columns["DOMINGO"] = {"sugerencia": col_idx, "actual": col_idx + 1}
            break

    if header_idx is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo identificar el encabezado con los días de la semana en el Excel."
        )

    # Buscar columnas de producto y unidad
    producto_col = None
    unidad_col = None

    for col_idx, cell in enumerate(normalized_row):
        if "PRODUCTO" in cell:
            producto_col = col_idx
        elif "UNIDAD" in cell:
            unidad_col = col_idx

    # Productos encontrados con programación diaria
    productos_programados: List[dict] = []

    # Iterar por las filas de productos (después de los encabezados)
    start_row = header_idx + 2
    current_category = None

    for row in values[start_row:]:
        if not row or not any(row):
            continue

        cells = [str(cell).strip() if cell else '' for cell in row]

        # Detectar categorías (filas que no tienen cantidades, solo nombre)
        if producto_col and cells[producto_col]:
            # Ver si es una categoría (texto sin números en las columnas de días)
            has_numbers = False
            for day_cols in day_columns.values():
                actual_idx = day_cols.get("actual")
                if actual_idx is not None and actual_idx < len(cells):
                    actual_val = cells[actual_idx]
                    if actual_val and _parse_decimal(actual_val):
                        has_numbers = True
                        break

            if not has_numbers and not any(c in cells[producto_col].upper() for c in ["TOTAL", "SUMA"]):
                current_category = cells[producto_col]
                continue

        # Extraer nombre del producto
        producto_nombre = cells[producto_col] if producto_col and len(cells) > producto_col else ""
        if not producto_nombre or producto_nombre.upper() in ["", "PRODUCTO"]:
            continue

        # Extraer unidad
        unidad = cells[unidad_col] if unidad_col and len(cells) > unidad_col else "UNIDAD"

        # Extraer programación diaria (solo columnas "Actual")
        programacion_diaria: List[dict] = []

        # Mapear días de la semana a fechas si tenemos fecha_inicio
        if fecha_inicio and fecha_fin:
            weekday_labels = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]
            weekday_to_date: Dict[str, date] = {}
            current = fecha_inicio
            while current <= fecha_fin:
                weekday_to_date[weekday_labels[current.weekday()]] = current
                current += timedelta(days=1)

            for day_name, cols in day_columns.items():
                target_date = weekday_to_date.get(day_name)
                if not target_date:
                    continue

                sugerencia_idx = cols.get("sugerencia")
                actual_idx = cols.get("actual")

                sugerida = None
                if sugerencia_idx is not None and sugerencia_idx < len(cells):
                    sugerida = _parse_decimal(cells[sugerencia_idx])

                actual = None
                if actual_idx is not None and actual_idx < len(cells):
                    actual = _parse_decimal(cells[actual_idx])

                cantidad = sugerida if sugerida and sugerida > Decimal("0") else actual
                if cantidad and cantidad > Decimal("0"):
                    programacion_diaria.append({
                        "fecha": target_date,
                        "cantidad": cantidad,
                    })

        # Solo agregar productos que tienen programación
        if programacion_diaria:
            productos_programados.append({
                "nombre": producto_nombre,
                "categoria": current_category,
                "unidad": unidad,
                "programacion_diaria": programacion_diaria,
            })

    if not productos_programados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se encontraron productos con programación diaria en el Excel de stock."
        )

    return {
        "numero_pedido": numero_pedido,
        "responsable": responsable,
        "local": local,
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "productos": productos_programados,
    }


def _safe_filename(name: str) -> str:
    name = re.sub(r"[^\w\-.]", "_", name)
    return name[:120]


def product_to_dict(product: ProductionProduct) -> dict:
    quote = product.cotizacion
    pagos = [
        {
            "id": pago.id,
            "monto": float(pago.monto),
            "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
            "descripcion": pago.descripcion,
        }
        for pago in sorted(quote.pagos, key=lambda p: (p.fecha_pago or date.today(), p.id))
    ]
    total_abonado = float(sum(p["monto"] for p in pagos)) if pagos else 0.0
    if quote.valor_total is not None:
        valor_total = float(quote.valor_total)
    else:
        subtotal_sum = sum(
            float(prod.valor_subtotal) for prod in quote.productos if prod.valor_subtotal is not None
        )
        valor_total = subtotal_sum if subtotal_sum > 0 else None
    saldo_pendiente = max((valor_total or 0.0) - total_abonado, 0.0) if valor_total is not None else None

    metadata_notes: List[str] = []
    seen_notes: Set[str] = set()
    for prod in quote.productos:
        description = (prod.descripcion or "").strip()
        if not description:
            continue
        if not _is_metadata_description(description, quote.odc):
            continue
        if description in seen_notes:
            continue
        seen_notes.add(description)
        metadata_notes.append(description)

    return {
        "id": product.id,
        "cotizacionId": quote.id,
        "numeroCotizacion": quote.numero_cotizacion,
        "tipoProduccion": quote.tipo_produccion.value if quote.tipo_produccion else ProductionTypeEnum.CLIENTE.value,
        "numeroPedidoStock": quote.numero_pedido_stock,
        "cliente": quote.cliente,
        "contacto": quote.contacto,
        "proyecto": quote.proyecto,
        "odc": quote.odc,
        "valorTotal": valor_total,
        "fechaIngreso": quote.fecha_ingreso.isoformat() if quote.fecha_ingreso else None,
        "fechaVencimiento": quote.fecha_vencimiento.isoformat() if quote.fecha_vencimiento else None,
        "archivoOriginal": quote.nombre_archivo_pdf,
        "producto": product.descripcion,
        "cantidad": product.cantidad,
        "valorSubtotal": float(product.valor_subtotal) if product.valor_subtotal is not None else None,
        "fechaEntrega": product.fecha_entrega.isoformat() if product.fecha_entrega else None,
        "estatus": product.estatus.value if product.estatus else None,
        "notasEstatus": product.notas_estatus,
        "factura": product.factura,
        "pagos": pagos,
        "totalAbonado": total_abonado,
        "saldoPendiente": saldo_pendiente,
        "metadataNotes": metadata_notes,
        "esServicio": _is_service_product(product.descripcion),
        "bodega": quote.bodega,
        "responsable": quote.responsable,
        "fechaInicioPeriodo": quote.fecha_inicio_periodo.isoformat() if quote.fecha_inicio_periodo else None,
        "fechaFinPeriodo": quote.fecha_fin_periodo.isoformat() if quote.fecha_fin_periodo else None,
    }


# ---------------------------------------------------------------------------
# Esquemas Pydantic
# ---------------------------------------------------------------------------

class PaymentPayload(BaseModel):
    monto: Decimal
    fecha_pago: Optional[date] = None
    descripcion: Optional[str] = None


class ProductionUpdatePayload(BaseModel):
    fechaIngreso: Optional[date] = None
    fechaEntrega: Optional[date] = None
    estatus: Optional[str] = Field(
        default=None, description="Estatus de producción (texto exactamente igual a las opciones definidas)."
    )
    notasEstatus: Optional[str] = None
    factura: Optional[str] = None
    fechaVencimiento: Optional[date] = None
    valorTotal: Optional[Decimal] = None
    pagos: List[PaymentPayload] = Field(default_factory=list)

    @validator("estatus")
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in STATUS_CHOICES:
            raise ValueError("Estatus no válido para producción.")
        return value


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/quotes")
async def upload_quotes(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Carga múltiples cotizaciones en Excel. Extrae los productos y registra la información en MySQL.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Debe adjuntar al menos un archivo Excel (.xls o .xlsx)."
        )

    resultados = []
    now = datetime.utcnow()

    for upload in files:
        filename = upload.filename or "cotizacion.xlsx"
        extension = Path(filename).suffix.lower()
        content = await upload.read()

        if extension not in {".xls", ".xlsx"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El archivo {upload.filename} debe ser un archivo Excel (.xls o .xlsx).",
            )

        parsed = parse_quote_excel(content, filename)

        safe_name = _safe_filename(upload.filename or f"cotizacion_{parsed['numero_cotizacion']}.xlsx")
        timestamped_name = f"{int(now.timestamp())}_{safe_name}"
        file_path = UPLOAD_DIR / timestamped_name
        file_path.write_bytes(content)

        quote = (
            db.query(ProductionQuote)
            .filter(ProductionQuote.numero_cotizacion == parsed["numero_cotizacion"])
            .one_or_none()
        )

        if quote is None:
            quote = ProductionQuote(
                numero_cotizacion=parsed["numero_cotizacion"],
                fecha_ingreso=now,
            )
            db.add(quote)
            db.flush()
        else:
            quote.productos.clear()
            quote.pagos.clear()
            quote.fecha_ingreso = now

        quote.cliente = parsed.get("cliente")
        quote.contacto = parsed.get("contacto")
        quote.proyecto = parsed.get("proyecto")
        quote.odc = parsed.get("odc")
        quote.valor_total = parsed.get("valor_total")
        quote.nombre_archivo_pdf = timestamped_name
        quote.updated_at = datetime.utcnow()

        for product_data in parsed["productos"]:
            product = ProductionProduct(
                descripcion=product_data["descripcion"],
                cantidad=product_data.get("cantidad"),
                valor_subtotal=product_data.get("valor_subtotal"),
                estatus=ProductionStatusEnum.EN_COLA,
            )
            quote.productos.append(product)

        for note in parsed.get("metadata_notes", []):
            clean_note = (note or "").strip()
            if not clean_note:
                continue
            quote.productos.append(
                ProductionProduct(
                    descripcion=clean_note,
                    cantidad=None,
                    valor_subtotal=None,
                    estatus=ProductionStatusEnum.EN_COLA,
                )
            )

        resultados.append(
            {
                "archivo": upload.filename,
                "cotizacion": quote.numero_cotizacion,
                "productos": len(parsed["productos"]),
            }
        )

    db.commit()

    return {
        "message": "Cotizaciones procesadas correctamente.",
        "resultados": resultados,
    }


@router.post("/stock-planning/parse", response_model=StockPlanningUploadResponse)
async def parse_stock_planning(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Parsea el Excel de programación de stock de Contifico y devuelve los datos extraídos
    sin guardarlos aún. El frontend mostrará estos datos al usuario para que confirme
    y agregue información faltante (bodega, etc.).
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe tener un nombre válido."
        )

    filename = file.filename
    extension = Path(filename).suffix.lower()

    if extension not in {".xls", ".xlsx"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un Excel (.xls o .xlsx). Los pedidos de stock se suben en formato Excel."
        )

    content = await file.read()

    try:
        parsed = parse_stock_planning_excel(content, filename)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el Excel: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al procesar el archivo: {str(e)}"
        )

    # Convertir el dict parseado a los modelos Pydantic
    productos_parsed = []
    for prod in parsed["productos"]:
        programacion = [
            StockProductProgramming(fecha=prog["fecha"], cantidad=prog["cantidad"])
            for prog in prod["programacion_diaria"]
        ]
        productos_parsed.append(
            StockProductParsed(
                nombre=prod["nombre"],
                categoria=prod.get("categoria"),
                unidad=prod.get("unidad"),
                programacion_diaria=programacion
            )
        )

    parsed_data = StockPlanningParsedData(
        numero_pedido=parsed["numero_pedido"],
        responsable=parsed.get("responsable"),
        local=parsed.get("local"),
        fecha_inicio=parsed["fecha_inicio"],
        fecha_fin=parsed["fecha_fin"],
        productos=productos_parsed
    )

    return StockPlanningUploadResponse(
        parsed_data=parsed_data,
        message=f"Excel parseado correctamente. {len(productos_parsed)} productos encontrados. Por favor confirme la información y agregue los datos faltantes."
    )


@router.post("/stock-planning/confirm")
async def confirm_stock_planning(
    request: StockPlanningConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirma y guarda la programación de stock en la base de datos.
    Crea una cotización de tipo 'stock' con sus productos y plan diario.
    """
    parsed = request.parsed_data

    # Verificar si ya existe un pedido con este número
    existing_quote = (
        db.query(ProductionQuote)
        .filter(ProductionQuote.numero_pedido_stock == parsed.numero_pedido)
        .one_or_none()
    )

    if existing_quote:
        # Si existe, limpiamos sus productos y plan para actualizarlo
        existing_quote.productos.clear()
        db.flush()
        quote = existing_quote
        quote.updated_at = datetime.utcnow()
    else:
        # Crear nueva cotización de tipo stock
        quote = ProductionQuote(
            numero_cotizacion=f"STOCK-{parsed.numero_pedido}",
            tipo_produccion=ProductionTypeEnum.STOCK,
            numero_pedido_stock=parsed.numero_pedido,
            fecha_ingreso=datetime.utcnow(),
        )
        db.add(quote)

    # Actualizar campos de la cotización
    quote.bodega = request.bodega
    quote.responsable = parsed.responsable
    quote.fecha_inicio_periodo = parsed.fecha_inicio
    quote.fecha_fin_periodo = parsed.fecha_fin
    quote.cliente = None  # Stock no tiene cliente
    quote.valor_total = None  # Stock no tiene valor monetario

    # Crear productos y sus planes diarios
    total_productos_creados = 0
    total_planes_creados = 0

    for prod_data in parsed.productos:
        # Crear el producto
        descripcion = prod_data.nombre
        # Formatear cantidad con unidad
        cantidad_text = None
        if prod_data.programacion_diaria:
            total_cantidad = sum(prog.cantidad for prog in prod_data.programacion_diaria)
            if prod_data.unidad:
                cantidad_text = f"{total_cantidad} {prod_data.unidad}"
            else:
                cantidad_text = str(total_cantidad)

        additional_notes = []
        if request.notas:
            cleaned = request.notas.strip()
            if cleaned:
                additional_notes.append(cleaned)
        if prod_data.categoria:
            additional_notes.append(f"Categoría stock: {prod_data.categoria}")

        # Calcular la fecha de entrega como el último día con producción
        plan_dates = [prog.fecha for prog in prod_data.programacion_diaria if prog.cantidad > 0]
        last_plan_date = max(plan_dates) if plan_dates else parsed.fecha_fin

        product = ProductionProduct(
            descripcion=descripcion,
            cantidad=cantidad_text,
            valor_subtotal=None,  # Stock no tiene valor
            estatus=ProductionStatusEnum.EN_PRODUCCION,  # Stock inicia en producción
            notas_estatus="\n".join(additional_notes) if additional_notes else None,
            fecha_entrega=last_plan_date,
        )
        quote.productos.append(product)
        db.flush()  # Para obtener el ID del producto

        total_productos_creados += 1

        # Crear entradas de plan diario para este producto
        for prog in prod_data.programacion_diaria:
            if prog.cantidad <= 0:
                continue  # Omitir días sin producción

            # Determinar si es metros o unidades según la unidad
            metros = Decimal("0")
            unidades = Decimal("0")

            if prod_data.unidad and "M2" in prod_data.unidad.upper():
                metros = Decimal(str(prog.cantidad))
            else:
                unidades = Decimal(str(prog.cantidad))

            daily_plan = ProductionDailyPlan(
                producto_id=product.id,
                fecha=prog.fecha,
                metros=metros,
                unidades=unidades,
                cantidad_sugerida=None,  # Podríamos agregar esto si el Excel lo trae
                is_manually_edited=True,  # Viene del Excel, se considera manual
                completado=False,
            )
            db.add(daily_plan)
            total_planes_creados += 1

    db.commit()

    return {
        "message": f"Programación de stock guardada correctamente.",
        "numero_pedido": parsed.numero_pedido,
        "cotizacion_id": quote.id,
        "numero_cotizacion": quote.numero_cotizacion,
        "productos_creados": total_productos_creados,
        "planes_diarios_creados": total_planes_creados,
        "bodega": request.bodega,
    }


@router.get("/items/all")
async def list_all_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve TODAS las líneas de producción, activas e históricas.
    """
    products = (
        db.query(ProductionProduct)
        .join(ProductionQuote)
        .order_by(ProductionQuote.fecha_ingreso.desc(), ProductionProduct.id.desc())
        .all()
    )

    serialized = [product_to_dict(product) for product in products]
    items_output = [item for item in serialized if not item.get("esServicio")]
    return {
        "items": items_output,
        "statusOptions": sorted(list(STATUS_CHOICES)),
    }


@router.get("/items/active")
async def list_active_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve solo las líneas de producción ACTIVAS (no entregadas).
    """
    products = (
        db.query(ProductionProduct)
        .join(ProductionQuote)
        .order_by(ProductionQuote.fecha_ingreso.desc(), ProductionProduct.id.desc())
        .all()
    )

    serialized = [
        product_to_dict(product)
        for product in products
        if product.estatus != ProductionStatusEnum.EN_BODEGA
    ]
    active_items = [item for item in serialized if not item.get("esServicio")]
    return {
        "items": active_items,
        "statusOptions": sorted(list(STATUS_CHOICES)),
    }


@router.get("/items/archive")
async def list_archive_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve solo las líneas de producción HISTÓRICAS (entregadas).
    """
    products = (
        db.query(ProductionProduct)
        .join(ProductionQuote)
        .filter(ProductionProduct.estatus == ProductionStatusEnum.ENTREGADO)
        .order_by(ProductionQuote.fecha_ingreso.desc(), ProductionProduct.id.desc())
        .all()
    )
    serialized = [product_to_dict(product) for product in products]
    items_output = [item for item in serialized if not item.get("esServicio")]
    return {
        "items": items_output,
        "statusOptions": sorted(list(STATUS_CHOICES)),
    }


@router.put("/items/{product_id}")
async def update_item(
    product_id: int,
    payload: ProductionUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza campos operativos de un ítem de producción.
    """
    product = db.query(ProductionProduct).filter(ProductionProduct.id == product_id).one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")

    quote = product.cotizacion

    # Guardar valores anteriores para detectar cambios
    old_fecha_entrega = product.fecha_entrega
    old_fecha_ingreso = quote.fecha_ingreso.date() if isinstance(quote.fecha_ingreso, datetime) else quote.fecha_ingreso

    product.fecha_entrega = payload.fechaEntrega
    product.estatus = (
        ProductionStatusEnum(payload.estatus) if payload.estatus else product.estatus
    )
    product.notas_estatus = payload.notasEstatus
    product.factura = payload.factura
    product.updated_at = datetime.utcnow()

    # Actualizar fecha_ingreso (convertir date a datetime para la base de datos)
    if payload.fechaIngreso is not None:
        if isinstance(payload.fechaIngreso, date) and not isinstance(payload.fechaIngreso, datetime):
            # Convertir date a datetime (medianoche UTC)
            quote.fecha_ingreso = datetime.combine(payload.fechaIngreso, datetime.min.time())
        else:
            quote.fecha_ingreso = payload.fechaIngreso

    if payload.fechaVencimiento is not None:
        quote.fecha_vencimiento = payload.fechaVencimiento
    if payload.valorTotal is not None:
        quote.valor_total = payload.valorTotal

    # LÓGICA CRÍTICA: Si cambió la fecha de entrega o fecha de ingreso, validar plan manual
    date_changed = (
        (old_fecha_entrega != payload.fechaEntrega and payload.fechaEntrega is not None) or
        (old_fecha_ingreso != payload.fechaIngreso and payload.fechaIngreso is not None)
    )

    if date_changed:
        # Verificar si existe plan manual para este producto
        existing_manual_plan = (
            db.query(ProductionDailyPlan)
            .filter(
                ProductionDailyPlan.producto_id == product_id,
                ProductionDailyPlan.is_manually_edited == True
            )
            .first()
        )

        if existing_manual_plan:
            # ADVERTENCIA: No regenerar automáticamente si hay plan manual
            # El encargado debe actualizar manualmente el plan desde "Plan diario"
            pass  # Preservar plan manual existente
        else:
            # Solo limpiar planes automáticos (no manuales) si no hay plan manual
            db.query(ProductionDailyPlan).filter(
                ProductionDailyPlan.producto_id == product_id,
                ProductionDailyPlan.is_manually_edited == False
            ).delete()

    # Reemplazar pagos asociados a la cotización
    quote.pagos.clear()
    for pago_payload in payload.pagos:
        quote.pagos.append(
            ProductionPayment(
                monto=pago_payload.monto,
                fecha_pago=pago_payload.fecha_pago,
                descripcion=pago_payload.descripcion,
            )
        )

    quote.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return {"item": product_to_dict(product)}


@router.get("/items/{item_id}/daily-plan", response_model=DailyProductionPlanResponse)
async def get_daily_production_plan(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyProductionPlanResponse:
    product = (
        db.query(ProductionProduct)
        .options(joinedload(ProductionProduct.plan_diario))
        .filter(ProductionProduct.id == item_id)
        .first()
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto de producción no encontrado.",
        )

    plan_entries = sorted(product.plan_diario, key=lambda entry: entry.fecha)
    response_entries = [
        DailyProductionPlanEntry(
            fecha=entry.fecha,
            metros=float(entry.metros or Decimal("0")),
            unidades=float(entry.unidades or Decimal("0")),
            notas=entry.notas,
        )
        for entry in plan_entries
    ]
    return DailyProductionPlanResponse(item_id=item_id, plan=response_entries)


@router.put("/items/{item_id}/daily-plan", response_model=DailyProductionPlanResponse)
async def upsert_daily_production_plan(
    item_id: int,
    payload: DailyProductionPlanPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyProductionPlanResponse:
    product = (
        db.query(ProductionProduct)
        .options(joinedload(ProductionProduct.plan_diario))
        .filter(ProductionProduct.id == item_id)
        .first()
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto de producción no encontrado.",
        )

    existing_by_date: Dict[date, ProductionDailyPlan] = {
        entry.fecha: entry for entry in product.plan_diario
    }

    requested_entries: List[DailyProductionPlanEntry] = []
    total_metros = Decimal("0")
    total_unidades = Decimal("0")
    for entry in payload.plan:
        if not _is_working_day(entry.fecha):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha {entry.fecha.isoformat()} no es un día hábil en Ecuador.",
            )
        keep_entry = entry.metros > 0 or entry.unidades > 0 or (entry.notas is not None)
        if not keep_entry:
            continue
        requested_entries.append(entry)
        total_metros += Decimal(str(entry.metros))
        total_unidades += Decimal(str(entry.unidades))

    quantity_value, quantity_unit = _extract_quantity_info(product.cantidad)
    tolerance = Decimal("0.0001")
    if quantity_value is not None:
        if quantity_unit == "metros":
            difference = (quantity_value - total_metros).copy_abs()
            if requested_entries and difference > tolerance:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"El plan diario debe sumar exactamente {float(quantity_value)} metros. "
                        f"Actualmente suma {float(total_metros)} metros."
                    ),
                )
            if (total_metros - quantity_value) > tolerance:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"La suma del plan diario ({float(total_metros)} m) supera la cantidad comprometida "
                        f"({float(quantity_value)} m) de la cotización."
                    ),
                )
        else:
            difference = (quantity_value - total_unidades).copy_abs()
            if requested_entries and difference > tolerance:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"El plan diario debe sumar exactamente {float(quantity_value)} unidades. "
                        f"Actualmente suma {float(total_unidades)} unidades."
                    ),
                )
            if (total_unidades - quantity_value) > tolerance:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"La suma del plan diario ({float(total_unidades)} u) supera la cantidad comprometida "
                        f"({float(quantity_value)} u) de la cotización."
                    ),
                )

    requested_dates = {entry.fecha for entry in requested_entries}
    for fecha, record in list(existing_by_date.items()):
        if fecha not in requested_dates:
            db.delete(record)

    for entry in requested_entries:
        metros_value = Decimal(str(entry.metros))
        unidades_value = Decimal(str(entry.unidades))
        record = existing_by_date.get(entry.fecha)
        if record:
            record.metros = metros_value
            record.unidades = unidades_value
            record.notas = entry.notas
            record.is_manually_edited = True  # Marcar como editado manualmente
        else:
            db.add(
                ProductionDailyPlan(
                    producto_id=item_id,
                    fecha=entry.fecha,
                    metros=metros_value,
                    unidades=unidades_value,
                    notas=entry.notas,
                    is_manually_edited=True,  # Marcar como editado manualmente
                )
            )

    db.commit()

    refreshed_entries = (
        db.query(ProductionDailyPlan)
        .filter(ProductionDailyPlan.producto_id == item_id)
        .order_by(ProductionDailyPlan.fecha)
        .all()
    )

    response_entries = [
        DailyProductionPlanEntry(
            fecha=entry.fecha,
            metros=float(entry.metros or Decimal("0")),
            unidades=float(entry.unidades or Decimal("0")),
            notas=entry.notas,
        )
        for entry in refreshed_entries
    ]
    return DailyProductionPlanResponse(item_id=item_id, plan=response_entries)


@router.get("/dashboard/schedule", response_model=DailyScheduleResponse)
async def get_dashboard_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyScheduleResponse:
    today = date.today()
    max_future = today + timedelta(days=21)
    history_window_days = 31
    month_start = date(today.year, today.month, 1)
    min_allowed_date = min(month_start, today - timedelta(days=history_window_days))
    decimal_zero = Decimal(0)

    active_items: List[ProductionProduct] = (
        db.query(ProductionProduct)
        .options(joinedload(ProductionProduct.cotizacion))
        .filter(
            ProductionProduct.estatus != ProductionStatusEnum.ENTREGADO,
            ProductionProduct.estatus != ProductionStatusEnum.EN_BODEGA
        )
        .all()
    )

    schedule_totals: Dict[date, Dict[str, Decimal | bool]] = defaultdict(
        lambda: {"metros": decimal_zero, "unidades": decimal_zero, "manual": False}
    )
    schedule_items_map: Dict[date, List[DailyScheduleItem]] = defaultdict(list)

    manual_plan_by_item: Dict[int, List[ProductionDailyPlan]] = defaultdict(list)
    if active_items:
        plan_entries = (
            db.query(ProductionDailyPlan)
            .filter(ProductionDailyPlan.producto_id.in_([item.id for item in active_items]))
            .all()
        )
        for plan_entry in plan_entries:
            manual_plan_by_item[plan_entry.producto_id].append(plan_entry)
        for entries in manual_plan_by_item.values():
            entries.sort(key=lambda entry: entry.fecha)

    for item in active_items:
        quote = item.cotizacion
        if _is_metadata_description(item.descripcion, quote.odc if quote else None):
            continue
        if _is_service_product(item.descripcion):
            continue

        quantity_value, quantity_unit = _extract_quantity_info(item.cantidad)
        if quantity_value is None or quantity_value <= decimal_zero:
            continue

        base_cliente = quote.cliente.strip() if quote and quote.cliente else None
        base_cotizacion = quote.numero_cotizacion if quote else None
        estatus_label = item.estatus.value if item.estatus else None

        manual_entries = manual_plan_by_item.get(item.id, [])
        if manual_entries:
            for plan_entry in manual_entries:
                metros_plan = Decimal(plan_entry.metros or decimal_zero)
                unidades_plan = Decimal(plan_entry.unidades or decimal_zero)
                if metros_plan <= decimal_zero and unidades_plan <= decimal_zero:
                    continue
                raw_plan_date = plan_entry.fecha
                if raw_plan_date < min_allowed_date:
                    continue
                if raw_plan_date < today:
                    if _is_working_day(raw_plan_date):
                        target_date = raw_plan_date
                    else:
                        target_date = _previous_working_day(raw_plan_date, include_today=True)
                else:
                    target_date = raw_plan_date if _is_working_day(raw_plan_date) else _next_working_day(raw_plan_date)
                if target_date > max_future:
                    continue
                bucket = schedule_totals[target_date]
                bucket["metros"] = bucket["metros"] + metros_plan
                bucket["unidades"] = bucket["unidades"] + unidades_plan
                bucket["manual"] = True
                schedule_items_map[target_date].append(
                    DailyScheduleItem(
                        item_id=item.id,
                        numero_cotizacion=base_cotizacion,
                        cliente=base_cliente,
                        descripcion=item.descripcion,
                        metros=float(metros_plan),
                        unidades=float(unidades_plan),
                        estatus=estatus_label,
                        manual=True,
                    )
                )
            continue

        if not item.fecha_entrega:
            continue

        end_date = item.fecha_entrega
        if end_date < today:
            target_date = _previous_working_day(end_date, include_today=True)
            if target_date < min_allowed_date:
                continue
            if target_date > max_future:
                continue
            bucket = schedule_totals[target_date]
            if quantity_unit == "metros":
                bucket["metros"] = bucket["metros"] + quantity_value
            else:
                bucket["unidades"] = bucket["unidades"] + quantity_value
            schedule_items_map[target_date].append(
                DailyScheduleItem(
                    item_id=item.id,
                    numero_cotizacion=base_cotizacion,
                    cliente=base_cliente,
                    descripcion=item.descripcion,
                    metros=float(quantity_value if quantity_unit == "metros" else decimal_zero),
                    unidades=float(quantity_value if quantity_unit != "metros" else decimal_zero),
                    estatus=estatus_label,
                    manual=False,
                )
            )
            continue

        if quote and quote.fecha_ingreso:
            start_date = quote.fecha_ingreso.date()
        else:
            start_date = end_date
        if start_date < today:
            start_date = today
        start_date = _next_working_day(start_date)

        # Para pedidos de stock, la fecha de entrega es el día que estará disponible
        # Para cotizaciones de cliente, la producción termina un día antes
        is_stock = quote and quote.tipo_produccion == ProductionTypeEnum.STOCK
        if is_stock:
            # Stock: producción disponible el mismo día (si es hábil)
            if _is_working_day(end_date):
                production_end = end_date
            else:
                production_end = _previous_working_day(end_date, include_today=False)
        else:
            # Cliente: producción termina el día hábil anterior a la entrega
            production_end = _previous_working_day(end_date)

        if production_end < start_date:
            if start_date == end_date and _is_working_day(start_date):
                working_days = [start_date]
            else:
                working_days = [production_end]
        else:
            working_days = _iter_working_days(start_date, production_end)
        if not working_days:
            fallback_date = _previous_working_day(end_date, include_today=True)
            working_days = [fallback_date]

        share = quantity_value / Decimal(len(working_days))
        for target_date in working_days:
            if target_date < min_allowed_date:
                continue
            bucket_date = target_date
            if bucket_date > max_future:
                continue
            bucket = schedule_totals[bucket_date]
            metros_share = share if quantity_unit == "metros" else decimal_zero
            unidades_share = share if quantity_unit != "metros" else decimal_zero
            bucket["metros"] = bucket["metros"] + metros_share
            bucket["unidades"] = bucket["unidades"] + unidades_share
            schedule_items_map[bucket_date].append(
                DailyScheduleItem(
                    item_id=item.id,
                    numero_cotizacion=base_cotizacion,
                    cliente=base_cliente,
                    descripcion=item.descripcion,
                    metros=float(metros_share),
                    unidades=float(unidades_share),
                    estatus=estatus_label,
                    manual=False,
                )
            )

    schedule_days: List[DailyScheduleDay] = []
    for target_date, totals in schedule_totals.items():
        metros_total = totals["metros"]
        unidades_total = totals["unidades"]
        if (
            target_date > max_future
            or target_date < min_allowed_date
            or (metros_total <= decimal_zero and unidades_total <= decimal_zero)
        ):
            continue
        items = schedule_items_map.get(target_date, [])
        schedule_days.append(
            DailyScheduleDay(
                fecha=target_date,
                metros=float(metros_total),
                unidades=float(unidades_total),
                capacidad=None,
                manual=bool(totals.get("manual", False)),
                items=items,
            )
        )

    schedule_days.sort(key=lambda day: day.fecha)
    return DailyScheduleResponse(days=schedule_days)


@router.delete("/quotes/{quote_id}")
async def delete_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina por completo una cotización (y sus productos/pagos asociados).
    """
    quote = db.query(ProductionQuote).filter(ProductionQuote.id == quote_id).one_or_none()

    if quote is None:
        return {
            "message": "La cotización ya no existe en el sistema.",
            "quoteId": quote_id,
        }

    numero_cotizacion = quote.numero_cotizacion
    db.delete(quote)
    db.commit()

    return {
        "message": f"Cotización {numero_cotizacion} eliminada.",
        "quoteId": quote_id,
    }
