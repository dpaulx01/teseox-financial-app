"""
API REST para módulo BI de Ventas con filtros dinámicos
Enfoque Comercial y Financiero
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract, desc, asc, case
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import csv
import io
from decimal import Decimal

from database.connection import get_db
from models.user import User
from models.sales import SalesTransaction, SalesKPICache, SalesAlert, SalesSavedFilter
from auth.dependencies import get_current_user, require_permission

router = APIRouter(prefix='/api/sales-bi', tags=['Sales BI'])

# ===================================================================
# ENDPOINTS DE CONSULTA CON FILTROS DINÁMICOS
# ===================================================================

@router.get('/dashboard/summary')
async def get_dashboard_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    vendedor: Optional[str] = None,
    cliente: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Resumen ejecutivo del dashboard con KPIs principales
    """
    # Construir query con filtros dinámicos
    query = db.query(
        func.sum(SalesTransaction.venta_neta).label('venta_neta_total'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad_total'),
        func.sum(SalesTransaction.costo_venta).label('costo_venta_total'),
        func.sum(SalesTransaction.descuento).label('descuento_total'),
        func.count(func.distinct(SalesTransaction.numero_factura)).label('num_facturas'),
        func.count(func.distinct(SalesTransaction.razon_social)).label('num_clientes'),
        func.sum(SalesTransaction.cantidad_facturada).label('unidades_vendidas')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Aplicar filtros dinámicos
    if year:
        query = query.filter(SalesTransaction.year == year)
    if month:
        query = query.filter(SalesTransaction.month == month)
    if categoria:
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        query = query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        query = query.filter(SalesTransaction.vendedor == vendedor)
    if cliente:
        query = query.filter(SalesTransaction.razon_social == cliente)

    result = query.first()

    # Calcular métricas derivadas
    venta_neta = float(result.venta_neta_total or 0)
    rentabilidad = float(result.rentabilidad_total or 0)
    costo_venta = float(result.costo_venta_total or 0)
    descuento = float(result.descuento_total or 0)

    margen_bruto = (rentabilidad / venta_neta * 100) if venta_neta > 0 else 0
    ticket_promedio = (venta_neta / result.num_facturas) if result.num_facturas > 0 else 0

    return {
        'success': True,
        'data': {
            'venta_neta_total': round(venta_neta, 2),
            'rentabilidad_total': round(rentabilidad, 2),
            'costo_venta_total': round(costo_venta, 2),
            'descuento_total': round(descuento, 2),
            'margen_bruto_porcentaje': round(margen_bruto, 2),
            'num_facturas': result.num_facturas,
            'num_clientes': result.num_clientes,
            'unidades_vendidas': float(result.unidades_vendidas or 0),
            'ticket_promedio': round(ticket_promedio, 2)
        }
    }


@router.get('/analysis/commercial')
async def get_commercial_analysis(
    year: Optional[int] = None,
    month: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    vendedor: Optional[str] = None,
    cliente: Optional[str] = None,
    group_by: str = Query('categoria', regex='^(categoria|canal|vendedor|cliente|producto)$'),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi_comercial', 'view'))
):
    """
    Análisis comercial con agrupación dinámica
    """
    # Mapeo de campos para group_by
    group_fields = {
        'categoria': SalesTransaction.categoria_producto,
        'canal': SalesTransaction.canal_comercial,
        'vendedor': SalesTransaction.vendedor,
        'cliente': SalesTransaction.razon_social,
        'producto': SalesTransaction.producto
    }

    group_field = group_fields[group_by]

    query = db.query(
        group_field.label('dimension'),
        func.sum(SalesTransaction.venta_neta).label('venta_neta'),
        func.sum(SalesTransaction.descuento).label('descuento'),
        func.count(func.distinct(SalesTransaction.numero_factura)).label('num_facturas'),
        func.sum(SalesTransaction.cantidad_facturada).label('unidades')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Aplicar filtros dinámicos (solo si no se está agrupando por esa dimensión)
    if year:
        query = query.filter(SalesTransaction.year == year)
    if month:
        query = query.filter(SalesTransaction.month == month)
    if categoria and group_by != 'categoria':
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal and group_by != 'canal':
        query = query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor and group_by != 'vendedor':
        query = query.filter(SalesTransaction.vendedor == vendedor)
    if cliente and group_by != 'cliente':
        query = query.filter(SalesTransaction.razon_social == cliente)

    query = query.group_by(group_field).order_by(desc('venta_neta')).limit(limit)

    results = query.all()

    data = []
    for row in results:
        venta_neta = float(row.venta_neta or 0)
        descuento = float(row.descuento or 0)

        data.append({
            'dimension': row.dimension,
            'venta_neta': round(venta_neta, 2),
            'descuento': round(descuento, 2),
            'num_facturas': row.num_facturas,
            'unidades': float(row.unidades or 0),
            'ticket_promedio': round(venta_neta / row.num_facturas, 2) if row.num_facturas > 0 else 0,
            'porcentaje_descuento': round(descuento / (venta_neta + descuento) * 100, 2) if (venta_neta + descuento) > 0 else 0
        })

    return {
        'success': True,
        'group_by': group_by,
        'count': len(data),
        'data': data
    }


@router.get('/analysis/financial')
async def get_financial_analysis(
    year: Optional[int] = None,
    month: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    vendedor: Optional[str] = None,
    cliente: Optional[str] = None,
    group_by: str = Query('categoria', regex='^(categoria|canal|vendedor|cliente|producto)$'),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi_financiero', 'view'))
):
    """
    Análisis financiero con agrupación dinámica
    """
    group_fields = {
        'categoria': SalesTransaction.categoria_producto,
        'canal': SalesTransaction.canal_comercial,
        'vendedor': SalesTransaction.vendedor,
        'cliente': SalesTransaction.razon_social,
        'producto': SalesTransaction.producto
    }

    group_field = group_fields[group_by]

    query = db.query(
        group_field.label('dimension'),
        func.sum(SalesTransaction.venta_neta).label('venta_neta'),
        func.sum(SalesTransaction.costo_venta).label('costo_venta'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad'),
        func.count(SalesTransaction.id).label('num_transacciones')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Aplicar filtros dinámicos (solo si no se está agrupando por esa dimensión)
    if year:
        query = query.filter(SalesTransaction.year == year)
    if month:
        query = query.filter(SalesTransaction.month == month)
    if categoria and group_by != 'categoria':
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal and group_by != 'canal':
        query = query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor and group_by != 'vendedor':
        query = query.filter(SalesTransaction.vendedor == vendedor)
    if cliente and group_by != 'cliente':
        query = query.filter(SalesTransaction.razon_social == cliente)

    query = query.group_by(group_field).order_by(desc('rentabilidad')).limit(limit)

    results = query.all()

    data = []
    for row in results:
        venta_neta = float(row.venta_neta or 0)
        costo_venta = float(row.costo_venta or 0)
        rentabilidad = float(row.rentabilidad or 0)

        data.append({
            'dimension': row.dimension,
            'venta_neta': round(venta_neta, 2),
            'costo_venta': round(costo_venta, 2),
            'rentabilidad': round(rentabilidad, 2),
            'margen_porcentaje': round(rentabilidad / venta_neta * 100, 2) if venta_neta > 0 else 0,
            'ratio_costo_venta': round(costo_venta / venta_neta * 100, 2) if venta_neta > 0 else 0,
            'num_transacciones': row.num_transacciones
        })

    return {
        'success': True,
        'group_by': group_by,
        'count': len(data),
        'data': data
    }


@router.get('/trends/monthly')
async def get_monthly_trends(
    year: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    vendedor: Optional[str] = None,
    cliente: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Tendencias mensuales de ventas y rentabilidad
    """
    query = db.query(
        SalesTransaction.year,
        SalesTransaction.month,
        func.sum(SalesTransaction.venta_neta).label('venta_neta'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad'),
        func.sum(SalesTransaction.costo_venta).label('costo_venta'),
        func.count(func.distinct(SalesTransaction.numero_factura)).label('num_facturas')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    if year:
        query = query.filter(SalesTransaction.year == year)
    if categoria:
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        query = query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        query = query.filter(SalesTransaction.vendedor == vendedor)
    if cliente:
        query = query.filter(SalesTransaction.razon_social == cliente)

    query = query.group_by(SalesTransaction.year, SalesTransaction.month).order_by(
        SalesTransaction.year, SalesTransaction.month
    )

    results = query.all()

    data = []
    for row in results:
        venta_neta = float(row.venta_neta or 0)
        rentabilidad = float(row.rentabilidad or 0)
        costo_venta = float(row.costo_venta or 0)

        data.append({
            'year': row.year,
            'month': row.month,
            'period': f"{row.year}-{str(row.month).zfill(2)}",
            'venta_neta': round(venta_neta, 2),
            'rentabilidad': round(rentabilidad, 2),
            'costo_venta': round(costo_venta, 2),
            'margen_porcentaje': round(rentabilidad / venta_neta * 100, 2) if venta_neta > 0 else 0,
            'num_facturas': row.num_facturas
        })

    return {
        'success': True,
        'count': len(data),
        'data': data
    }


@router.get('/filters/options')
async def get_filter_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Obtener todas las opciones disponibles para filtros dinámicos
    """
    company_id = current_user.company_id

    # Años disponibles
    years = db.query(SalesTransaction.year).filter(
        SalesTransaction.company_id == company_id
    ).distinct().order_by(desc(SalesTransaction.year)).all()

    # Categorías
    categorias = db.query(SalesTransaction.categoria_producto).filter(
        SalesTransaction.company_id == company_id
    ).distinct().order_by(SalesTransaction.categoria_producto).all()

    # Canales
    canales = db.query(SalesTransaction.canal_comercial).filter(
        SalesTransaction.company_id == company_id
    ).distinct().order_by(SalesTransaction.canal_comercial).all()

    # Vendedores
    vendedores = db.query(SalesTransaction.vendedor).filter(
        SalesTransaction.company_id == company_id
    ).distinct().order_by(SalesTransaction.vendedor).all()

    # Clientes (razón social)
    clientes = db.query(SalesTransaction.razon_social).filter(
        SalesTransaction.company_id == company_id
    ).distinct().order_by(SalesTransaction.razon_social).all()

    return {
        'success': True,
        'filters': {
            'years': [y[0] for y in years],
            'months': list(range(1, 13)),
            'categorias': [c[0] for c in categorias],
            'canales': [c[0] for c in canales],
            'vendedores': [v[0] for v in vendedores],
            'clientes': [c[0] for c in clientes]
        }
    }


# ===================================================================
# ENDPOINTS DE CARGA DE DATOS
# ===================================================================

@router.post('/upload/csv')
async def upload_sales_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('sales', 'upload'))
):
    """
    Cargar datos de ventas desde archivo CSV
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='El archivo debe ser CSV')

    try:
        # Leer contenido del archivo
        contents = await file.read()
        csv_data = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(csv_data), delimiter=';')

        transactions = []
        errors = []

        for idx, row in enumerate(csv_reader, start=2):
            try:
                # Convertir formato de fecha (dd/mm/yyyy)
                fecha_parts = row.get('Fecha de Emisión', '').split('/')
                if len(fecha_parts) != 3:
                    errors.append(f"Línea {idx}: Fecha inválida")
                    continue

                fecha_emision = date(int(fecha_parts[2]), int(fecha_parts[1]), int(fecha_parts[0]))

                # Convertir valores numéricos (formato latino: coma decimal)
                def parse_decimal(value):
                    if not value or value.strip() == '':
                        return Decimal('0')
                    return Decimal(value.replace('.', '').replace(',', '.'))

                transaction = SalesTransaction(
                    fecha_emision=fecha_emision,
                    categoria_producto=row.get('Categoría Producto', '').strip(),
                    vendedor=row.get('Vendedor', '').strip(),
                    numero_factura=row.get('# Factura', '').strip(),
                    canal_comercial=row.get('Canal Comercial', '').strip(),
                    razon_social=row.get('Razón Social', '').strip(),
                    producto=row.get('Producto', '').strip(),
                    cantidad_facturada=parse_decimal(row.get('Cantidad Facturada', '0')),
                    factor_conversion=parse_decimal(row.get('Factor Conversión', '1')),
                    m2=parse_decimal(row.get('M2', '0')),
                    venta_bruta=parse_decimal(row.get('Venta Bruta $', '0')),
                    descuento=parse_decimal(row.get('Descuento $', '0')),
                    venta_neta=parse_decimal(row.get('Venta Neta $', '0')),
                    costo_venta=parse_decimal(row.get('Costo Venta $', '0')),
                    costo_unitario=parse_decimal(row.get('Costo Uni.$', '0')),
                    rentabilidad=parse_decimal(row.get('Rentabilidad $', '0')),
                    company_id=current_user.company_id
                )

                transactions.append(transaction)

            except Exception as e:
                errors.append(f"Línea {idx}: {str(e)}")

        # Insertar en base de datos
        if transactions:
            db.bulk_save_objects(transactions)
            db.commit()

        return {
            'success': True,
            'message': f'Se cargaron {len(transactions)} transacciones exitosamente',
            'total_uploaded': len(transactions),
            'errors_count': len(errors),
            'errors': errors[:10]  # Máximo 10 errores
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Error al procesar CSV: {str(e)}')


@router.delete('/data/clear')
async def clear_sales_data(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('sales', 'manage'))
):
    """
    Limpiar datos de ventas (con opción de filtrar por año)
    """
    query = db.query(SalesTransaction).filter(
        SalesTransaction.company_id == current_user.company_id
    )

    if year:
        query = query.filter(SalesTransaction.year == year)

    count = query.count()
    query.delete()
    db.commit()

    return {
        'success': True,
        'message': f'Se eliminaron {count} transacciones',
        'deleted_count': count
    }


# ===================================================================
# ENDPOINTS DE ALERTAS
# ===================================================================

@router.get('/alerts/active')
async def get_active_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Obtener alertas activas
    """
    alerts = db.query(SalesAlert).filter(
        SalesAlert.company_id == current_user.company_id,
        SalesAlert.status == 'active'
    ).order_by(
        case(
            (SalesAlert.severity == 'critical', 1),
            (SalesAlert.severity == 'warning', 2),
            (SalesAlert.severity == 'info', 3)
        ),
        desc(SalesAlert.created_at)
    ).all()

    return {
        'success': True,
        'count': len(alerts),
        'data': [alert.to_dict() for alert in alerts]
    }


# ===================================================================
# ENDPOINTS DE FILTROS GUARDADOS
# ===================================================================

@router.get('/saved-filters')
async def get_saved_filters(
    filter_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Obtener filtros guardados del usuario
    """
    query = db.query(SalesSavedFilter).filter(
        SalesSavedFilter.user_id == current_user.id,
        SalesSavedFilter.company_id == current_user.company_id
    )

    if filter_type:
        query = query.filter(SalesSavedFilter.filter_type == filter_type)

    filters = query.order_by(desc(SalesSavedFilter.is_favorite), desc(SalesSavedFilter.created_at)).all()

    return {
        'success': True,
        'count': len(filters),
        'data': [f.to_dict() for f in filters]
    }


@router.post('/saved-filters')
async def save_filter(
    filter_name: str,
    filter_type: str,
    filter_config: Dict[str, Any],
    is_favorite: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Guardar configuración de filtro
    """
    saved_filter = SalesSavedFilter(
        user_id=current_user.id,
        company_id=current_user.company_id,
        filter_name=filter_name,
        filter_type=filter_type,
        filter_config=filter_config,
        is_favorite=is_favorite
    )

    db.add(saved_filter)
    db.commit()
    db.refresh(saved_filter)

    return {
        'success': True,
        'message': 'Filtro guardado exitosamente',
        'data': saved_filter.to_dict()
    }
