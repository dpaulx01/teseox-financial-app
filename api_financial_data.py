#!/usr/bin/env python3
"""
Financial Data Routes - Basado en csv_upload.php de la app original
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import re

from database.connection import get_db
from models.user import User
import jwt
import os
from auth.tenant_context import get_current_tenant, set_current_tenant

# Same JWT config as main API
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Minimal JWT auth compatible with legacy tokens, now tenant-aware."""
    from fastapi import status

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not linked to any company"
        )

    # Ensure the tenant context is populated for downstream helpers.
    set_current_tenant(int(user.company_id))
    return user

router = APIRouter(prefix="/api/financial", tags=["Financial Data"])


def _get_company_id(current_user: User) -> int:
    tenant_id = get_current_tenant()
    company_id = tenant_id or getattr(current_user, "company_id", None)
    if not company_id:
        raise HTTPException(
            status_code=400,
            detail="Usuario sin empresa asignada"
        )
    return int(company_id)


@router.post("/csv-upload")
async def upload_csv(
    csv: UploadFile = File(...),
    year: int = Form(default=2025),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint basado en csv_upload.php de la app original
    """
    try:
        if csv.content_type not in ['text/csv', 'application/csv']:
            if not csv.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail="Error al cargar el archivo")
        company_id = _get_company_id(current_user)
        
        # Leer contenido del archivo
        content = await csv.read()
        
        # Convertir encoding si es necesario (como en PHP original)
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            content_str = content.decode('iso-8859-1')
        
        # Limpiar BOM (como en PHP original)
        content_str = re.sub(r'^\ufeff', '', content_str)
        import csv as csv_module
        from io import StringIO

        csv_reader = csv_module.reader(StringIO(content_str), delimiter=';')
        raw_rows = []
        for row in csv_reader:
            cleaned = [cell.strip() for cell in row]
            if any(cell for cell in cleaned):
                raw_rows.append(cleaned)

        if not raw_rows:
            raise HTTPException(status_code=400, detail="El archivo CSV está vacío o mal formateado")

        def clean_cell(value: str) -> str:
            return value.replace('\ufeff', '').strip()

        def is_header(row: list[str]) -> bool:
            first = clean_cell(row[0]).lower() if row else ''
            second = row[1].strip().lower() if len(row) > 1 else ''
            first_raw = clean_cell(row[0]) if row else ''
            looks_numeric = bool(re.match(r'^[0-9]+(\.[0-9]+)*$', first_raw)) if first_raw else False
            return (
                first in {'cod', 'código', 'codigo', 'cuenta', 'cuentas'} or
                second in {'cuenta', 'descripcion', 'descripción', 'detalle'} or
                not looks_numeric
            )

        month_labels: list[str] = []
        if is_header(raw_rows[0]):
            header_row = raw_rows.pop(0)
            month_labels = [clean_cell(col) for col in header_row[2:] if clean_cell(col)]

        if not raw_rows:
            raise HTTPException(status_code=400, detail="No se encontraron filas de datos en el CSV")

        def detect_months(row: list[str]) -> int:
            last_index = 0
            for idx, value in enumerate(row[2:], start=1):
                if value.strip() != '':
                    last_index = idx
            return last_index

        months_count = 0
        for row in raw_rows:
            months_count = max(months_count, detect_months(row))

        if months_count == 0:
            months_count = max(0, max((len(row) for row in raw_rows), default=0) - 2)

        default_month_names = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]

        if month_labels and len(month_labels) > months_count:
            month_labels = month_labels[:months_count]

        if not month_labels:
            month_labels = default_month_names[:months_count]
        elif len(month_labels) < months_count:
            remaining = months_count - len(month_labels)
            month_labels.extend(default_month_names[len(month_labels):len(month_labels) + remaining])

        account_rows: list[tuple[str, str, list[str]]] = []
        account_codes: list[str] = []
        for row in raw_rows:
            if len(row) < 2:
                continue
            account_code_raw = clean_cell(row[0])
            account_code = re.sub(r'[^\d\.]', '', account_code_raw)
            if not account_code:
                continue
            account_name = clean_cell(row[1])
            account_rows.append((account_code, account_name, row))
            account_codes.append(account_code)

        if not account_rows:
            raise HTTPException(status_code=400, detail="No se encontraron cuentas válidas en el CSV")

        account_code_set = set(account_codes)

        # Comenzar transacción (como PHP original)
        try:
            # Limpiar datos existentes (como PHP original)
            db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id AND period_year = :year"), 
                      {"company_id": company_id, "year": year})
            db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id AND year = :year"), 
                      {"company_id": company_id, "year": year})
            
            # Insertar nuevos datos
            total_revenue = 0
            total_accounts = 0
            account_codes = set()
            
            # Procesar líneas de datos (como PHP original)
            for account_code, account_name, row in account_rows:
                # Procesar valores por mes
                for month_index in range(months_count):
                    col_idx = month_index + 2
                    if col_idx >= len(row):
                        continue
                    
                    value = row[col_idx].strip()
                    if not value or value == '0':
                        continue
                    
                    # Convertir formato europeo (1.000,50 -> 1000.50) como PHP original
                    value = value.replace('.', '')  # Quitar separadores de miles
                    value = value.replace(',', '.')  # Coma decimal -> punto decimal
                    try:
                        amount = float(value)
                    except ValueError:
                        amount = 0.0
                    
                    if amount == 0:
                        continue
                    
                    # Insertar en raw_account_data (como PHP original)
                    db.execute(text("""
                        INSERT INTO raw_account_data 
                        (company_id, import_date, account_code, account_name, period_year, period_month, amount) 
                        VALUES (:company_id, :import_date, :account_code, :account_name, :period_year, :period_month, :amount)
                    """), {
                        "company_id": company_id,
                        "import_date": datetime.now().date(),
                        "account_code": account_code,
                        "account_name": account_name,
                        "period_year": year,
                        "period_month": month_index + 1,
                        "amount": amount
                    })
                    
                    # Sumar ingresos (cuenta 4) como PHP original
                    has_child = any(
                        other_code != account_code and other_code.startswith(f"{account_code}.")
                        for other_code in account_code_set
                    )
                    if account_code.startswith('4') and not has_child:
                        total_revenue += amount
            
            total_accounts = len(account_code_set)
            
            leaf_template = (
                "SUM(CASE WHEN r.account_code LIKE '{prefix}%' AND NOT EXISTS ("
                "SELECT 1 FROM raw_account_data r2 "
                "WHERE r2.company_id = r.company_id "
                "AND r2.period_year = r.period_year "
                "AND r2.period_month = r.period_month "
                "AND r2.account_code <> r.account_code "
                "AND r2.account_code LIKE CONCAT(r.account_code, '.%')"
                ") THEN r.amount ELSE 0 END)"
            )

            ingresos_expr = leaf_template.format(prefix='4')
            costo_ventas_expr = leaf_template.format(prefix='5.1')
            gastos_admin_expr = leaf_template.format(prefix='5.3')
            gastos_ventas_expr = leaf_template.format(prefix='5.2')
            costos_total_expr = leaf_template.format(prefix='5')

            aggregated_sql = f"""
                INSERT INTO financial_data (
                    company_id,
                    period_year,
                    period_month,
                    period_quarter,
                    data_type,
                    year,
                    month,
                    ingresos,
                    costo_ventas,
                    gastos_administrativos,
                    gastos_ventas,
                    utilidad_bruta,
                    ebitda,
                    utilidad_neta
                )
                SELECT 
                    :company_id,
                    :year,
                    r.period_month,
                    CEIL(r.period_month / 3),
                    'monthly',
                    :year,
                    r.period_month,
                    {ingresos_expr} AS ingresos,
                    {costo_ventas_expr} AS costo_ventas,
                    {gastos_admin_expr} AS gastos_administrativos,
                    {gastos_ventas_expr} AS gastos_ventas,
                    {ingresos_expr} - {costo_ventas_expr} AS utilidad_bruta,
                    {ingresos_expr} - {costos_total_expr} AS ebitda,
                    {ingresos_expr} - {costos_total_expr} AS utilidad_neta
                FROM raw_account_data r
                WHERE r.company_id = :company_id2 AND r.period_year = :year2
                GROUP BY r.period_month
            """

            db.execute(text(aggregated_sql), {
                "company_id": company_id,
                "year": year,
                "company_id2": company_id,
                "year2": year
            })
            
            db.commit()
            
            # Respuesta exacta como PHP original
            return {
                'success': True,
                'year': year,
                'months': month_labels,
                'totalAccounts': total_accounts,
                'totalRevenue': total_revenue,
                'message': 'CSV procesado exitosamente'
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/data")
async def get_financial_data(
    year: int = None,
    include_raw: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener datos financieros con datos raw incluidos
    """
    try:
        company_id = _get_company_id(current_user)
        
        # 1. Obtener datos agregados
        query = "SELECT * FROM financial_data WHERE company_id = :company_id"
        params = {"company_id": company_id}
        
        if year:
            query += " AND year = :year"
            params["year"] = year
        
        query += " ORDER BY year DESC, month ASC"
        
        result = db.execute(text(query), params)
        data = []

        for row in result:
            # SQLAlchemy Row puede exponer datos como atributos o vía ._mapping
            mapping = row._mapping if hasattr(row, "_mapping") else row.__dict__

            def pick(*candidates, default=None):
                for key in candidates:
                    if key and key in mapping and mapping[key] is not None:
                        return mapping[key]
                return default

            ingresos_val = pick("ingresos", default=0) or 0
            costo_total = pick("costo_ventas_total", "costo_ventas", default=0) or 0
            gastos_admin = pick(
                "gastos_admin_total",
                "gastos_administrativos",
                default=0,
            ) or 0
            gastos_ventas = pick(
                "gastos_ventas_total",
                "gastos_ventas",
                default=0,
            ) or 0

            data.append({
                "id": pick("id"),
                "year": pick("year", "period_year"),
                "month": pick("month", "period_month"),
                "ingresos": float(ingresos_val),
                "costo_ventas_total": float(costo_total),
                "gastos_admin_total": float(gastos_admin),
                "gastos_ventas_total": float(gastos_ventas),
                "utilidad_bruta": float(pick("utilidad_bruta", default=0) or 0),
                "ebitda": float(pick("ebitda", default=0) or 0),
                "utilidad_neta": float(pick("utilidad_neta", default=0) or 0)
            })
        
        response = {
            "success": True,
            "data": data
        }
        
        # 2. Incluir datos raw si se solicitan (CRUCIAL para P&G)
        if include_raw:
            raw_query = "SELECT * FROM raw_account_data WHERE company_id = :company_id"
            raw_params = {"company_id": company_id}
            
            if year:
                raw_query += " AND period_year = :year"
                raw_params["year"] = year
            
            raw_query += " ORDER BY account_code, period_month"
            
            raw_result = db.execute(text(raw_query), raw_params)

            # Formatear datos raw para el pnlCalculator (FORMATO EXACTO)
            raw_data = []
            account_months = {}

            # Primero agrupamos por cuenta
            for row in raw_result:
                mapping = row._mapping if hasattr(row, "_mapping") else row.__dict__
                account_code = mapping.get("account_code")
                account_name = mapping.get("account_name")
                period_month = mapping.get("period_month")
                amount = mapping.get("amount", 0)

                account_key = f"{account_code}|{account_name}"
                if account_key not in account_months:
                    account_months[account_key] = {
                        'COD.': account_code,
                        'CUENTA': account_name,
                    }

                # CRÍTICO: Agregar mes con nombre EXACTO como espera pnlCalculator
                month_names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

                if isinstance(period_month, int) and 1 <= period_month <= 12:
                    month_name = month_names[period_month]
                    # CRÍTICO: Convertir valor a NÚMERO (no string europeo)
                    numeric_value = float(amount) if amount else 0.0
                    account_months[account_key][month_name] = numeric_value

            # Convertir a lista y ordenar por código de cuenta
            raw_data = sorted(list(account_months.values()), key=lambda x: x.get('COD.', ''))
            response["raw_data"] = raw_data
            
            # DEBUG: Log first raw item to verify format
            if raw_data:
                print(f"🔍 DEBUG: First raw item format: {raw_data[0]}")
                print(f"🔍 DEBUG: Month keys available: {[k for k in raw_data[0].keys() if k not in ['COD.', 'CUENTA']]}")
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/production")
async def save_production_data(
    production_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Guardar datos de producción
    """
    try:
        company_id = _get_company_id(current_user)
        
        # Detect column names to stay compatible with legacy schemas
        columns = set()
        try:
            col_result = db.execute(text("SHOW COLUMNS FROM production_data"))
            for col in col_result:
                field_name = None
                try:
                    field_name = col[0]
                except Exception:
                    field_name = getattr(col, "Field", None)
                if field_name:
                    columns.add(field_name)
        except Exception:
            columns = set()

        year_col = "year" if "year" in columns else ("period_year" if "period_year" in columns else None)
        month_col = "month" if "month" in columns else ("period_month" if "period_month" in columns else None)
        metros_col = "metros_producidos" if "metros_producidos" in columns else ("unidades_producidas" if "unidades_producidas" in columns else None)
        vendidos_col = "metros_vendidos" if "metros_vendidos" in columns else ("unidades_vendidas" if "unidades_vendidas" in columns else None)

        if not year_col or not month_col or not metros_col or not vendidos_col:
            raise HTTPException(status_code=500, detail="Schema de production_data incompatible: faltan columnas requeridas")

        insert_sql = f"""
            INSERT INTO production_data 
            (company_id, {year_col}, {month_col}, {metros_col}, {vendidos_col})
            VALUES (:company_id, :year, :month, :metros_producidos, :metros_vendidos)
            ON DUPLICATE KEY UPDATE
            {metros_col} = VALUES({metros_col}),
            {vendidos_col} = VALUES({vendidos_col})
        """

        db.execute(text(insert_sql), {
            "company_id": company_id,
            "year": production_data.get("year"),
            "month": production_data.get("month"),
            "metros_producidos": production_data.get("metros_producidos", production_data.get("unidades_producidas", 0)),
            "metros_vendidos": production_data.get("metros_vendidos", production_data.get("unidades_vendidas", 0))
        })
        
        db.commit()
        
        return {"success": True, "message": "Production data saved"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/production")  
async def get_production_data(
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener datos de producción (basado en production_data_v1.php)
    """
    try:
        company_id = _get_company_id(current_user)
        
        # Obtener datos de producción
        prod_query = "SELECT * FROM production_data WHERE company_id = :company_id"
        prod_params = {"company_id": company_id}
        
        if year:
            prod_query += " AND year = :year"
            prod_params["year"] = year
        
        prod_query += " ORDER BY year DESC, month ASC"
        
        prod_result = db.execute(text(prod_query), prod_params)
        
        # Formatear datos mensualmente (exponiendo snake_case y camelCase para compatibilidad)
        monthly = {}
        for row in prod_result:
            if hasattr(row, "_mapping"):
                mapping = row._mapping
            else:
                mapping = {
                    "year": getattr(row, "year", None),
                    "month": getattr(row, "month", None),
                    "period_year": getattr(row, "period_year", None),
                    "period_month": getattr(row, "period_month", None),
                    "metros_producidos": getattr(row, "metros_producidos", None),
                    "metros_vendidos": getattr(row, "metros_vendidos", None),
                    "unidades_producidas": getattr(row, "unidades_producidas", None),
                    "unidades_vendidas": getattr(row, "unidades_vendidas", None),
                }

            year_val = mapping.get("year")
            if year_val is None:
                year_val = mapping.get("period_year")
            month_val = mapping.get("month")
            if month_val is None:
                month_val = mapping.get("period_month")
            if year_val is None or month_val is None:
                continue

            metros_prod = mapping.get("metros_producidos")
            if metros_prod is None:
                metros_prod = mapping.get("unidades_producidas")
            metros_vend = mapping.get("metros_vendidos")
            if metros_vend is None:
                metros_vend = mapping.get("unidades_vendidas")

            unidades_prod = mapping.get("unidades_producidas")
            if unidades_prod is None:
                unidades_prod = mapping.get("metros_producidos")
            unidades_vend = mapping.get("unidades_vendidas")
            if unidades_vend is None:
                unidades_vend = mapping.get("metros_vendidos")

            metros_prod = float(metros_prod or 0)
            metros_vend = float(metros_vend or 0)
            unidades_prod = float(unidades_prod or 0)
            unidades_vend = float(unidades_vend or 0)

            key = f"{int(year_val)}-{int(month_val):02d}"
            monthly[key] = {
                "metros_producidos": metros_prod,
                "metros_vendidos": metros_vend,
                "unidades_producidas": unidades_prod,
                "unidades_vendidas": unidades_vend,
                "metrosProducidos": metros_prod,
                "metrosVendidos": metros_vend,
                "unidadesProducidas": unidades_prod,
                "unidadesVendidas": unidades_vend,
            }
        
        return {
            "success": True,
            "monthly": monthly,
            "years": list(set([key.split('-')[0] for key in monthly.keys()]))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/financial_data_v1.php")
@router.post("/financial_data_original.php")
async def financial_data_legacy(
    data: dict = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint legacy para compatibilidad con financial_data_v1.php
    """
    try:
        # Retornar datos financieros desde MySQL
        return await get_financial_data(current_user=current_user, db=db)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/financial_data_v1.php")
async def financial_data_legacy_get(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET endpoint legacy para compatibilidad
    """
    return await get_financial_data(current_user=current_user, db=db)

@router.post("/calculate")
async def calculate_financial_metrics(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint para cálculos financieros
    """
    try:
        # Obtener datos financieros y calcular métricas
        financial_data = await get_financial_data(current_user=current_user, db=db)
        
        if not financial_data.get("data"):
            return {"success": False, "message": "No financial data available"}
        
        # Calcular métricas básicas
        total_revenue = sum(item["ingresos"] for item in financial_data["data"])
        total_ebitda = sum(item["ebitda"] for item in financial_data["data"])
        
        return {
            "success": True,
            "metrics": {
                "total_revenue": total_revenue,
                "total_ebitda": total_ebitda,
                "average_monthly_revenue": total_revenue / len(financial_data["data"]) if financial_data["data"] else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
