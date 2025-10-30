"""
API REST para módulo BI de Ventas con filtros dinámicos
Enfoque Comercial y Financiero
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
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
        func.sum(SalesTransaction.m2).label('metros_cuadrados')
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
            'metros_cuadrados': float(result.metros_cuadrados or 0),
            'unidades_vendidas': float(result.metros_cuadrados or 0),
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
        func.sum(SalesTransaction.m2).label('metros_cuadrados')
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
            'metros_cuadrados': float(row.metros_cuadrados or 0),
            'unidades': float(row.metros_cuadrados or 0),
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


@router.get('/filters/dynamic-options')
async def get_dynamic_filter_options(
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
    Obtener opciones de filtros dinámicos basadas en los filtros ya aplicados (cascada)
    Cada filtro devuelve solo las opciones disponibles según los filtros previos
    """
    company_id = current_user.company_id

    # Construir query base con filtros aplicados
    base_query = db.query(SalesTransaction).filter(
        SalesTransaction.company_id == company_id
    )

    if year:
        base_query = base_query.filter(SalesTransaction.year == year)
    if month:
        base_query = base_query.filter(SalesTransaction.month == month)
    if categoria:
        base_query = base_query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        base_query = base_query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        base_query = base_query.filter(SalesTransaction.vendedor == vendedor)
    if cliente:
        base_query = base_query.filter(SalesTransaction.razon_social == cliente)

    # Años disponibles (sin filtrar por year)
    years_query = db.query(SalesTransaction.year).filter(
        SalesTransaction.company_id == company_id
    )
    if month:
        years_query = years_query.filter(SalesTransaction.month == month)
    if categoria:
        years_query = years_query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        years_query = years_query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        years_query = years_query.filter(SalesTransaction.vendedor == vendedor)
    if cliente:
        years_query = years_query.filter(SalesTransaction.razon_social == cliente)

    years = years_query.distinct().order_by(desc(SalesTransaction.year)).all()

    # Meses disponibles (filtrados por year si está presente)
    months_query = db.query(SalesTransaction.month).filter(
        SalesTransaction.company_id == company_id
    )
    if year:
        months_query = months_query.filter(SalesTransaction.year == year)
    if categoria:
        months_query = months_query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        months_query = months_query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        months_query = months_query.filter(SalesTransaction.vendedor == vendedor)
    if cliente:
        months_query = months_query.filter(SalesTransaction.razon_social == cliente)

    months = months_query.distinct().order_by(SalesTransaction.month).all()

    # Categorías disponibles (filtradas por filtros previos)
    categorias_query = base_query.with_entities(SalesTransaction.categoria_producto)
    if categoria:
        # Si ya hay categoria seleccionada, remover ese filtro para mostrar todas las categorías disponibles
        categorias_query = db.query(SalesTransaction.categoria_producto).filter(
            SalesTransaction.company_id == company_id
        )
        if year:
            categorias_query = categorias_query.filter(SalesTransaction.year == year)
        if month:
            categorias_query = categorias_query.filter(SalesTransaction.month == month)
    categorias = categorias_query.distinct().order_by(SalesTransaction.categoria_producto).all()

    # Canales disponibles (filtrados por filtros previos)
    canales_query = base_query.with_entities(SalesTransaction.canal_comercial)
    if canal:
        # Si ya hay canal seleccionado, remover ese filtro
        canales_query = db.query(SalesTransaction.canal_comercial).filter(
            SalesTransaction.company_id == company_id
        )
        if year:
            canales_query = canales_query.filter(SalesTransaction.year == year)
        if month:
            canales_query = canales_query.filter(SalesTransaction.month == month)
        if categoria:
            canales_query = canales_query.filter(SalesTransaction.categoria_producto == categoria)
    canales = canales_query.distinct().order_by(SalesTransaction.canal_comercial).all()

    # Vendedores disponibles (filtrados por filtros previos)
    vendedores_query = base_query.with_entities(SalesTransaction.vendedor)
    if vendedor:
        vendedores_query = db.query(SalesTransaction.vendedor).filter(
            SalesTransaction.company_id == company_id
        )
        if year:
            vendedores_query = vendedores_query.filter(SalesTransaction.year == year)
        if month:
            vendedores_query = vendedores_query.filter(SalesTransaction.month == month)
        if categoria:
            vendedores_query = vendedores_query.filter(SalesTransaction.categoria_producto == categoria)
        if canal:
            vendedores_query = vendedores_query.filter(SalesTransaction.canal_comercial == canal)
    vendedores = vendedores_query.distinct().order_by(SalesTransaction.vendedor).all()

    # Clientes disponibles (filtrados por todos los filtros previos)
    clientes_query = base_query.with_entities(SalesTransaction.razon_social)
    if cliente:
        clientes_query = db.query(SalesTransaction.razon_social).filter(
            SalesTransaction.company_id == company_id
        )
        if year:
            clientes_query = clientes_query.filter(SalesTransaction.year == year)
        if month:
            clientes_query = clientes_query.filter(SalesTransaction.month == month)
        if categoria:
            clientes_query = clientes_query.filter(SalesTransaction.categoria_producto == categoria)
        if canal:
            clientes_query = clientes_query.filter(SalesTransaction.canal_comercial == canal)
        if vendedor:
            clientes_query = clientes_query.filter(SalesTransaction.vendedor == vendedor)
    clientes = clientes_query.distinct().order_by(SalesTransaction.razon_social).all()

    return {
        'success': True,
        'filters': {
            'years': [y[0] for y in years],
            'months': [m[0] for m in months],
            'categorias': [c[0] for c in categorias if c[0]],
            'canales': [c[0] for c in canales if c[0]],
            'vendedores': [v[0] for v in vendedores if v[0]],
            'clientes': [c[0] for c in clientes if c[0]]
        }
    }


# ===================================================================
# ENDPOINTS DE CARGA DE DATOS
# ===================================================================

@router.post('/upload/csv')
async def upload_sales_csv(
    file: UploadFile = File(...),
    overwrite: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('sales', 'upload'))
):
    """
    Cargar datos de ventas desde archivo CSV
    """
    print("--- Iniciando carga de CSV de ventas ---")
    print(f"Usuario: {current_user.email}, Empresa: {current_user.company_id}")
    print(f"Archivo: {file.filename}, Content-Type: {file.content_type}")

    if not file.filename.endswith('.csv'):
        print("Error: El archivo no es CSV.")
        raise HTTPException(status_code=400, detail='El archivo debe ser CSV')

    try:
        deleted_records = 0
        if overwrite:
            print("Modo sobreescritura activo: eliminando registros previos de la empresa...")
            deleted_records = db.query(SalesTransaction).filter(
                SalesTransaction.company_id == current_user.company_id
            ).delete(synchronize_session=False)
            db.commit()
            print(f"Registros eliminados: {deleted_records}")

        # Leer contenido del archivo
        contents = await file.read()
        csv_data = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(csv_data), delimiter=';')
        
        rows = list(csv_reader)
        print(f"Se encontraron {len(rows)} filas en el CSV.")

        transactions = []
        errors = []
        duplicates_skipped = 0
        warnings = []

        existing_keys = set()
        if not overwrite:
            # Buscar duplicados potenciales solo para las facturas incluidas en el CSV
            # Usando clave única más específica: factura + producto + fecha + cantidad + venta_neta
            invoice_numbers = {row.get('# Factura', '').strip() for row in rows if row.get('# Factura')}
            if invoice_numbers:
                print(f"Buscando duplicados para {len(invoice_numbers)} facturas presentes en el CSV...")
                existing_records = db.query(
                    SalesTransaction.numero_factura,
                    SalesTransaction.producto,
                    SalesTransaction.fecha_emision,
                    SalesTransaction.cantidad_facturada,
                    SalesTransaction.venta_neta
                ).filter(
                    SalesTransaction.company_id == current_user.company_id,
                    SalesTransaction.numero_factura.in_(invoice_numbers)
                ).all()
                existing_keys = {
                    (num, prod, fecha.isoformat() if fecha else '', float(cant or 0), float(venta or 0))
                    for num, prod, fecha, cant, venta in existing_records
                }
                if existing_keys:
                    warnings.append(
                        f"Se encontraron {len(existing_keys)} registros idénticos ya registrados. "
                        "Se omitirán del nuevo archivo."
                    )
                    print(f"Duplicados detectados: {len(existing_keys)} registros idénticos existentes.")
                else:
                    print("No se detectaron duplicados previos en la base de datos para estas facturas.")
            else:
                print("El archivo no contiene números de factura válidos para validar duplicados.")
        else:
            print("Sobrescritura solicitada, se omite validación de duplicados previa.")

        processed_keys = set()

        for idx, row in enumerate(rows, start=2):
            try:
                # Convertir formato de fecha (dd/mm/yyyy)
                fecha_str = row.get('Fecha de Emisión', '').strip()
                if not fecha_str:
                    errors.append(f"Línea {idx}: La columna 'Fecha de Emisión' está vacía.")
                    continue
                
                fecha_parts = fecha_str.split('/')
                if len(fecha_parts) != 3:
                    errors.append(f"Línea {idx}: Fecha '{fecha_str}' no tiene el formato dd/mm/yyyy.")
                    continue

                day, month, year = int(fecha_parts[0]), int(fecha_parts[1]), int(fecha_parts[2])
                fecha_emision = date(year, month, day)

                # Convertir valores numéricos (formato latino: coma decimal)
                def parse_decimal(value_str: Optional[str]) -> Decimal:
                    if not value_str or not value_str.strip():
                        return Decimal('0')
                    # Limpiar el valor: quitar puntos de miles y reemplazar coma decimal por punto
                    cleaned_value = value_str.strip().replace('.', '').replace(',', '.')
                    return Decimal(cleaned_value)

                invoice_number = row.get('# Factura', '').strip()
                product_name = row.get('Producto', '').strip()

                # Obtener valores numéricos para la clave única
                cantidad = parse_decimal(row.get('Cantidad Facturada'))
                venta_neta = parse_decimal(row.get('Venta Neta $'))

                # Clave única más específica: factura + producto + fecha + cantidad + venta_neta
                key = (invoice_number, product_name, fecha_emision.isoformat(), float(cantidad), float(venta_neta))

                if key in processed_keys:
                    duplicates_skipped += 1
                    continue

                if not overwrite and key in existing_keys:
                    duplicates_skipped += 1
                    continue

                processed_keys.add(key)

                transaction = SalesTransaction(
                    fecha_emision=fecha_emision,
                    categoria_producto=row.get('Categoría Producto', '').strip(),
                    vendedor=row.get('Vendedor', '').strip(),
                    numero_factura=invoice_number,
                    canal_comercial=row.get('Canal Comercial', '').strip(),
                    razon_social=row.get('Razón Social', '').strip(),
                    producto=product_name,
                    cantidad_facturada=parse_decimal(row.get('Cantidad Facturada')),
                    factor_conversion=parse_decimal(row.get('Factor Conversión', '1')),
                    m2=parse_decimal(row.get('M2')),
                    venta_bruta=parse_decimal(row.get('Venta Bruta $')),
                    descuento=parse_decimal(row.get('Descuento $')),
                    venta_neta=parse_decimal(row.get('Venta Neta $')),
                    costo_venta=parse_decimal(row.get('Costo Venta $')),
                    costo_unitario=parse_decimal(row.get('Costo Uni.$')),
                    rentabilidad=parse_decimal(row.get('Rentabilidad $')),
                    company_id=current_user.company_id
                )
                transactions.append(transaction)

            except (ValueError, TypeError, IndexError) as e:
                errors.append(f"Línea {idx}: Error de formato o dato inválido - {str(e)}. Fila: {row}")
            except Exception as e:
                errors.append(f"Línea {idx}: Error inesperado - {str(e)}. Fila: {row}")

        print(f"Procesamiento finalizado. {len(transactions)} transacciones válidas, {len(errors)} errores.")

        # Insertar en base de datos
        if transactions:
            print(f"Insertando {len(transactions)} registros en la base de datos...")
            db.bulk_save_objects(transactions)
            db.commit()
            print("Inserción completada y commit realizado.")
        else:
            print("No hay transacciones válidas para insertar.")

        response_payload = {
            'success': len(errors) == 0,
            'message': f'Se procesaron {len(transactions)} de {len(rows)} transacciones.',
            'total_uploaded': len(transactions),
            'errors_count': len(errors),
            'errors': errors[:20]
        }

        if overwrite:
            response_payload['deleted_previous'] = deleted_records

        if duplicates_skipped:
            response_payload['duplicates_skipped_count'] = duplicates_skipped
            warnings.append(f"Se omitieron {duplicates_skipped} filas por duplicado.")

        if warnings:
            response_payload['warnings'] = warnings

        return response_payload

    except Exception as e:
        db.rollback()
        print(f"--- ERROR FATAL en la carga de CSV: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f'Error fatal al procesar CSV: {str(e)}')


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


# ===================================================================
# ENDPOINTS DE ANÁLISIS GERENCIAL (estilo presentación)
# ===================================================================

@router.get('/kpis/gerencial')
async def get_kpis_gerencial(
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
    KPIs gerenciales enfocados en m² y eficiencia
    """
    query = db.query(
        func.sum(SalesTransaction.m2).label('total_m2'),
        func.sum(SalesTransaction.venta_neta).label('venta_neta_total'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad_total'),
        func.sum(SalesTransaction.costo_venta).label('costo_venta_total'),
        func.sum(SalesTransaction.descuento).label('descuento_total'),
        func.sum(SalesTransaction.venta_bruta).label('venta_bruta_total')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Aplicar filtros
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

    total_m2 = float(result.total_m2 or 0)
    venta_neta = float(result.venta_neta_total or 0)
    rentabilidad = float(result.rentabilidad_total or 0)
    costo_venta = float(result.costo_venta_total or 0)
    descuento = float(result.descuento_total or 0)
    venta_bruta = float(result.venta_bruta_total or 0)

    # Cálculos por m²
    precio_neto_m2 = (venta_neta / total_m2) if total_m2 > 0 else 0
    margen_m2 = (rentabilidad / total_m2) if total_m2 > 0 else 0
    costo_m2 = (costo_venta / total_m2) if total_m2 > 0 else 0
    porcentaje_descuento = (descuento / venta_bruta * 100) if venta_bruta > 0 else 0
    margen_porcentaje = (rentabilidad / costo_venta * 100) if costo_venta > 0 else 0

    return {
        'success': True,
        'data': {
            'total_m2': round(total_m2, 2),
            'venta_neta_total': round(venta_neta, 2),
            'precio_neto_m2': round(precio_neto_m2, 2),
            'margen_m2': round(margen_m2, 2),
            'costo_m2': round(costo_m2, 2),
            'porcentaje_descuento': round(porcentaje_descuento, 2),
            'margen_sobre_costo': round(margen_porcentaje, 2),
            'rentabilidad_total': round(rentabilidad, 2)
        }
    }


@router.get('/analysis/pareto')
async def get_pareto_analysis(
    analysis_type: str = Query('sales', regex='^(sales|volume|profit)$'),
    dimension: str = Query('producto', regex='^(producto|cliente|categoria)$'),
    year: Optional[int] = None,
    month: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    vendedor: Optional[str] = None,
    cliente: Optional[str] = None,
    limit: int = Query(20, ge=5, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Análisis Pareto 80/20 por ventas, volumen o rentabilidad
    """
    dimension_fields = {
        'producto': SalesTransaction.producto,
        'cliente': SalesTransaction.razon_social,
        'categoria': SalesTransaction.categoria_producto
    }

    metric_fields = {
        'sales': func.sum(SalesTransaction.venta_neta).label('value'),
        'volume': func.sum(SalesTransaction.m2).label('value'),
        'profit': func.sum(SalesTransaction.rentabilidad).label('value')
    }

    dimension_field = dimension_fields[dimension]
    metric_field = metric_fields[analysis_type]

    query = db.query(
        dimension_field.label('name'),
        metric_field
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Aplicar filtros
    if year:
        query = query.filter(SalesTransaction.year == year)
    if month:
        query = query.filter(SalesTransaction.month == month)
    if categoria and dimension != 'categoria':
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        query = query.filter(SalesTransaction.canal_comercial == canal)
    if vendedor:
        query = query.filter(SalesTransaction.vendedor == vendedor)
    if cliente and dimension != 'cliente':
        query = query.filter(SalesTransaction.razon_social == cliente)

    query = query.group_by(dimension_field).order_by(desc('value')).limit(limit)
    results = query.all()

    # Calcular total y porcentajes acumulativos
    total = sum(float(r.value or 0) for r in results)
    cumulative = 0
    data = []

    for row in results:
        value = float(row.value or 0)
        percentage = (value / total * 100) if total > 0 else 0
        cumulative += value
        cumulative_percentage = (cumulative / total * 100) if total > 0 else 0

        data.append({
            'name': row.name,
            'value': round(value, 2),
            'percentage': round(percentage, 2),
            'cumulative_percentage': round(cumulative_percentage, 2)
        })

    return {
        'success': True,
        'analysis_type': analysis_type,
        'dimension': dimension,
        'total': round(total, 2),
        'count': len(data),
        'data': data
    }


@router.get('/analysis/evolution')
async def get_evolution_analysis(
    metric: str = Query('price', regex='^(price|discount|margin)$'),
    group_by_period: str = Query('month', regex='^(month|quarter|year)$'),
    year: Optional[int] = None,
    categoria: Optional[str] = None,
    canal: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Evolución temporal de precio/m², descuento% o margen
    """
    # Campos base
    if group_by_period == 'year':
        period_field = SalesTransaction.year
        period_label = 'year'
    elif group_by_period == 'quarter':
        period_field = SalesTransaction.quarter
        period_label = 'quarter'
    else:
        period_field = SalesTransaction.month
        period_label = 'month'

    query = db.query(
        SalesTransaction.year,
        period_field.label(period_label),
        func.sum(SalesTransaction.venta_neta).label('venta_neta'),
        func.sum(SalesTransaction.m2).label('total_m2'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad'),
        func.sum(SalesTransaction.descuento).label('descuento'),
        func.sum(SalesTransaction.venta_bruta).label('venta_bruta'),
        func.sum(SalesTransaction.costo_venta).label('costo_venta')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Filtros
    if year:
        query = query.filter(SalesTransaction.year == year)
    if categoria:
        query = query.filter(SalesTransaction.categoria_producto == categoria)
    if canal:
        query = query.filter(SalesTransaction.canal_comercial == canal)

    query = query.group_by(SalesTransaction.year, period_field).order_by(
        SalesTransaction.year, period_field
    )

    results = query.all()
    data = []

    for row in results:
        total_m2 = float(row.total_m2 or 0)
        venta_neta = float(row.venta_neta or 0)
        rentabilidad = float(row.rentabilidad or 0)
        descuento = float(row.descuento or 0)
        venta_bruta = float(row.venta_bruta or 0)
        costo_venta = float(row.costo_venta or 0)

        precio_m2 = (venta_neta / total_m2) if total_m2 > 0 else 0
        margen_m2 = (rentabilidad / total_m2) if total_m2 > 0 else 0
        porcentaje_descuento = (descuento / venta_bruta * 100) if venta_bruta > 0 else 0
        margen_porcentaje = (rentabilidad / costo_venta * 100) if costo_venta > 0 else 0

        period_value = getattr(row, period_label)
        period_str = f"{row.year}-{str(period_value).zfill(2)}" if period_label != 'year' else str(row.year)

        data.append({
            'period': period_str,
            'year': row.year,
            period_label: period_value,
            'precio_neto_m2': round(precio_m2, 2),
            'margen_m2': round(margen_m2, 2),
            'porcentaje_descuento': round(porcentaje_descuento, 2),
            'margen_porcentaje': round(margen_porcentaje, 2),
            'total_m2': round(total_m2, 2),
            'venta_neta': round(venta_neta, 2)
        })

    return {
        'success': True,
        'metric': metric,
        'period': group_by_period,
        'count': len(data),
        'data': data
    }


@router.get('/analysis/ranking')
async def get_ranking_analysis(
    dimension: str = Query('categoria', regex='^(categoria|canal|vendedor|cliente|producto)$'),
    metric: str = Query('volume', regex='^(volume|sales|profit|margin_m2)$'),
    year: Optional[int] = None,
    month: Optional[int] = None,
    limit: int = Query(10, ge=5, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission('bi', 'view'))
):
    """
    Rankings horizontales por diferentes dimensiones y métricas
    """
    dimension_fields = {
        'categoria': SalesTransaction.categoria_producto,
        'canal': SalesTransaction.canal_comercial,
        'vendedor': SalesTransaction.vendedor,
        'cliente': SalesTransaction.razon_social,
        'producto': SalesTransaction.producto
    }

    dimension_field = dimension_fields[dimension]

    # Construir agregaciones según métrica
    query = db.query(
        dimension_field.label('name'),
        func.sum(SalesTransaction.m2).label('total_m2'),
        func.sum(SalesTransaction.venta_neta).label('venta_neta'),
        func.sum(SalesTransaction.rentabilidad).label('rentabilidad')
    ).filter(SalesTransaction.company_id == current_user.company_id)

    # Filtros
    if year:
        query = query.filter(SalesTransaction.year == year)
    if month:
        query = query.filter(SalesTransaction.month == month)

    query = query.group_by(dimension_field)

    results = query.all()

    # Calcular métrica y ordenar
    data = []
    for row in results:
        total_m2 = float(row.total_m2 or 0)
        venta_neta = float(row.venta_neta or 0)
        rentabilidad = float(row.rentabilidad or 0)

        if metric == 'volume':
            value = total_m2
        elif metric == 'sales':
            value = venta_neta
        elif metric == 'profit':
            value = rentabilidad
        else:  # margin_m2
            value = (rentabilidad / total_m2) if total_m2 > 0 else 0

        data.append({
            'name': row.name,
            'value': round(value, 2),
            'total_m2': round(total_m2, 2),
            'venta_neta': round(venta_neta, 2),
            'rentabilidad': round(rentabilidad, 2)
        })

    # Ordenar y limitar
    data.sort(key=lambda x: x['value'], reverse=True)
    data = data[:limit]

    return {
        'success': True,
        'dimension': dimension,
        'metric': metric,
        'count': len(data),
        'data': data
    }
