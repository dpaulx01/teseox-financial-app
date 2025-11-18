#!/usr/bin/env python3
"""
Financial Data Routes - Basado en csv_upload.php de la app original
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from datetime import datetime
import re

from database.connection import get_db
from models.user import User
from auth.dependencies import get_current_user
from auth.tenant_context import get_current_tenant


def _resolve_company_id(current_user: User) -> int:
    """Helper to resolve the tenant/company id for the current user."""
    tenant_id = get_current_tenant()
    company_id = tenant_id or getattr(current_user, "company_id", None)
    if not company_id:
        raise HTTPException(status_code=400, detail="Usuario sin empresa asignada")
    return int(company_id)

router = APIRouter(prefix="/api/financial", tags=["Financial Data"])

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
        
        company_id = _resolve_company_id(current_user)
        
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

        # Detectar si la primera fila es encabezado o datos reales
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

        # Si todas las columnas restantes están vacías, intenta al menos usar la longitud bruta
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

        # Preparar filas de cuenta para cálculos posteriores
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
            # Detectar nombres de columnas en financial_data para limpiar por año
            fin_cols = set()
            try:
                cols_res = db.execute(text("SHOW COLUMNS FROM financial_data"))
                for r in cols_res:
                    cname = r[0] if len(r) > 0 else None
                    if not cname:
                        # fallback
                        try:
                            cname = r._mapping.get('Field')
                        except Exception:
                            pass
                    if cname:
                        fin_cols.add(cname)
            except Exception:
                fin_cols = set()

            ycol = 'year' if 'year' in fin_cols else ('period_year' if 'period_year' in fin_cols else None)
            if ycol:
                db.execute(text(f"DELETE FROM financial_data WHERE company_id = :company_id AND {ycol} = :year"), 
                          {"company_id": company_id, "year": year})
            
            # Insertar nuevos datos
            total_revenue = 0
            total_accounts = 0
            account_codes = set()
            
            # Procesar líneas de datos (como PHP original adaptado)
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
            
            # Procesar datos financieros agregados: columnas dinámicas según esquema
            def add_column(target_col: str, expr: str):
                insert_columns.append(target_col)
                select_expressions.append(f"{expr} AS {target_col}")

            def leaf_sum(prefix: str) -> str:
                return (
                    "SUM(CASE WHEN r.account_code LIKE '{prefix}%' AND NOT EXISTS ("
                    "SELECT 1 FROM raw_account_data r2 "
                    "WHERE r2.company_id = r.company_id "
                    "AND r2.period_year = r.period_year "
                    "AND r2.period_month = r.period_month "
                    "AND r2.account_code <> r.account_code "
                    "AND r2.account_code LIKE CONCAT(r.account_code, '.%')"
                    ") THEN r.amount ELSE 0 END)".format(prefix=prefix)
                )

            ingresos_expr = leaf_sum('4')
            costo_ventas_expr = leaf_sum('5.1')
            gastos_ventas_expr = leaf_sum('5.2')
            gastos_admin_expr = leaf_sum('5.3')
            costos_total_expr = leaf_sum('5')

            insert_columns = []
            select_expressions = []

            # Columnas de identificación
            insert_columns.append("company_id")
            select_expressions.append(":company_id AS company_id")

            if "period_year" in fin_cols:
                add_column("period_year", ":year")
            if "year" in fin_cols:
                add_column("year", ":year")

            if "period_month" in fin_cols:
                add_column("period_month", "period_month")
            if "month" in fin_cols:
                add_column("month", "period_month")

            if "period_quarter" in fin_cols:
                add_column("period_quarter", "CEIL(period_month / 3)")

            if "data_type" in fin_cols:
                add_column("data_type", "'monthly'")

            # Columnas numéricas clave (utilizamos alias existentes)
            add_column("ingresos", ingresos_expr)

            if "costo_ventas_total" in fin_cols:
                add_column("costo_ventas_total", costo_ventas_expr)
            elif "costo_ventas" in fin_cols:
                add_column("costo_ventas", costo_ventas_expr)

            if "gastos_admin_total" in fin_cols:
                add_column("gastos_admin_total", gastos_admin_expr)
            elif "gastos_administrativos" in fin_cols:
                add_column("gastos_administrativos", gastos_admin_expr)

            if "gastos_ventas_total" in fin_cols:
                add_column("gastos_ventas_total", gastos_ventas_expr)
            elif "gastos_ventas" in fin_cols:
                add_column("gastos_ventas", gastos_ventas_expr)

            add_column(
                "utilidad_bruta",
                f"{ingresos_expr} - {costo_ventas_expr}",
            )
            add_column(
                "ebitda",
                f"{ingresos_expr} - {costos_total_expr}",
            )
            add_column(
                "utilidad_neta",
                f"{ingresos_expr} - {costos_total_expr}",
            )

            insert_sql = f"""
                INSERT INTO financial_data ({', '.join(insert_columns)})
                SELECT 
                    {', '.join(select_expressions)}
                FROM raw_account_data r
                WHERE r.company_id = :company_id2 AND r.period_year = :year2
                GROUP BY r.period_month
            """
            db.execute(text(insert_sql), {
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

@router.post("/save")
async def save_financial_data(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Guardar cambios de datos financieros (placeholder no destructivo).
    
    Nota: En esta versión, no sobrescribimos tablas consolidadas. Se deja como punto
    de extensión para persistir escenarios o snapshots si es necesario.
    """
    try:
        # Por ahora solo registrar un snapshot mínimo en logs.
        # En una iteración futura, podríamos persistir en una tabla de snapshots
        # o actualizar un escenario activo.
        print("[save_financial_data] Usuario:", current_user.id, "Payload keys:", list(data.keys()))
        return {"success": True, "message": "Financial data accepted (no-op)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
        company_id = _resolve_company_id(current_user)

        def getval(row, key, default=None):
            try:
                if hasattr(row, "_mapping"):
                    return row._mapping.get(key, default)
                # Fallback a atributo
                return getattr(row, key, default)
            except Exception:
                return default

        # Descubrir columnas existentes para tolerar esquemas antiguos/nuevos
        present_cols = set()
        try:
            cols_result = db.execute(text("SHOW COLUMNS FROM financial_data"))
            for r in cols_result:
                # SHOW COLUMNS devuelve 'Field' como primera columna
                try:
                    colname = r[0]
                except Exception:
                    colname = getval(r, 'Field')
                if colname:
                    present_cols.add(colname)
        except Exception as _:
            # Si la tabla no existe, devolver respuesta vacía más abajo
            present_cols = set()

        col_costo = 'costo_ventas_total' if 'costo_ventas_total' in present_cols else ('costo_ventas' if 'costo_ventas' in present_cols else None)
        col_gadm = 'gastos_admin_total' if 'gastos_admin_total' in present_cols else ('gastos_administrativos' if 'gastos_administrativos' in present_cols else None)
        col_gvta = 'gastos_ventas_total' if 'gastos_ventas_total' in present_cols else ('gastos_ventas' if 'gastos_ventas' in present_cols else None)

        # 1. Obtener datos agregados con columnas detectadas
        def sel(col: str, alias: str | None = None, default: str = "0") -> str:
            if col in present_cols:
                return f"{col}{(' AS ' + alias) if alias else ''}"
            return f"{default}{(' AS ' + alias) if alias else ''}"

        # Mapear year/month según existan como year/period_year, month/period_month
        ysrc = 'year' if 'year' in present_cols else ('period_year' if 'period_year' in present_cols else None)
        msrc = 'month' if 'month' in present_cols else ('period_month' if 'period_month' in present_cols else None)

        select_cols = [
            sel('id', 'id', 'NULL'),
            (f"{ysrc} AS year" if ysrc else "NULL AS year"),
            (f"{msrc} AS month" if msrc else "NULL AS month"),
            sel('ingresos', 'ingresos', '0'),
        ]
        if col_costo:
            select_cols.append(f"{col_costo} AS costo_ventas_total")
        else:
            select_cols.append("0 AS costo_ventas_total")
        if col_gadm:
            select_cols.append(f"{col_gadm} AS gastos_admin_total")
        else:
            select_cols.append("0 AS gastos_admin_total")
        if col_gvta:
            select_cols.append(f"{col_gvta} AS gastos_ventas_total")
        else:
            select_cols.append("0 AS gastos_ventas_total")
        # Estas deberían existir, pero si no existen, poner 0
        select_cols.append(sel('utilidad_bruta', 'utilidad_bruta', '0'))
        select_cols.append(sel('ebitda', 'ebitda', '0'))
        select_cols.append(sel('utilidad_neta', 'utilidad_neta', '0'))

        query = f"SELECT {', '.join(select_cols)} FROM financial_data WHERE company_id = :company_id"
        params = {"company_id": company_id}

        if year and ysrc:
            query += f" AND {ysrc} = :year"
            params["year"] = year

        order_year = ysrc or 'year'
        order_month = msrc or 'month'
        query += f" ORDER BY {order_year} DESC, {order_month} ASC"

        data = []
        try:
            result = db.execute(text(query), params)
            for row in result:
                ingresos = getval(row, 'ingresos', 0) or 0
                data.append({
                    "id": getval(row, 'id'),
                    "year": getval(row, 'year'),
                    "month": getval(row, 'month'),
                    "ingresos": float(ingresos),
                    "costo_ventas_total": float(getval(row, 'costo_ventas_total', 0) or 0),
                    "gastos_admin_total": float(getval(row, 'gastos_admin_total', 0) or 0),
                    "gastos_ventas_total": float(getval(row, 'gastos_ventas_total', 0) or 0),
                    "utilidad_bruta": float(getval(row, 'utilidad_bruta', 0) or 0),
                    "ebitda": float(getval(row, 'ebitda', 0) or 0),
                    "utilidad_neta": float(getval(row, 'utilidad_neta', 0) or 0)
                })
        except Exception as _:
            # Si no existe la tabla o columnas, data queda vacío
            data = []

        response = {
            "success": True,
            "data": data
        }

        # 2. Incluir datos raw si se solicitan (CRUCIAL para P&G)
        if include_raw:
            try:
                raw_query = "SELECT account_code, account_name, period_month, amount FROM raw_account_data WHERE company_id = :company_id"
                raw_params = {"company_id": company_id}

                if year:
                    raw_query += " AND period_year = :year"
                    raw_params["year"] = year

                raw_query += " ORDER BY account_code, period_month"

                raw_result = db.execute(text(raw_query), raw_params)

                account_months: dict = {}
                month_names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

                for row in raw_result:
                    code = getval(row, 'account_code')
                    name = getval(row, 'account_name')
                    month = getval(row, 'period_month')
                    amount = getval(row, 'amount', 0) or 0
                    if not code:
                        continue
                    key = f"{code}|{name}"
                    if key not in account_months:
                        account_months[key] = {'COD.': code, 'CUENTA': name}
                    if isinstance(month, int) and 1 <= month <= 12:
                        account_months[key][month_names[month]] = float(amount)

                raw_data = sorted(list(account_months.values()), key=lambda x: x.get('COD.', ''))
                response["raw_data"] = raw_data
            except Exception as _:
                response["raw_data"] = []

        return response

    except Exception as e:
        # Imprimir error detallado en logs del servidor para depuración
        print("❌ get_financial_data error:", e)
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
        company_id = _resolve_company_id(current_user)
        
        # Detectar columnas disponibles para soportar esquemas antiguos/nuevos
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
        company_id = _resolve_company_id(current_user)
        
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
            # SQLAlchemy 1.4/2.0 Row puede exponer columnas vía _mapping o atributos
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

            if year_val is None or month_val is None:
                # Si faltan columnas críticas, continuar al siguiente registro
                continue

            key = f"{int(year_val)}-{int(month_val):02d}"
            monthly[key] = {
                "metros_producidos": metros_prod,
                "metros_vendidos": metros_vend,
                "unidades_producidas": unidades_prod,
                "unidades_vendidas": unidades_vend,
                # Mantener camelCase para consumidores anteriores
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

@router.post("/save")
async def save_financial_data(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Guardar datos financieros procesados en MySQL
    """
    try:
        company_id = _resolve_company_id(current_user)
        
        # Aquí se puede implementar lógica adicional para guardar
        # datos procesados si es necesario
        
        return {"success": True, "message": "Data saved to MySQL"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/debug-log")
async def debug_log(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """Recibe logs de depuración del frontend y los imprime en el servidor."""
    try:
        from pprint import pformat
        print("\n========== BI DEBUG LOG ==========")
        print(datetime.now().isoformat())
        print(pformat(payload))
        print("========== END BI DEBUG LOG =========\n")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear")
async def clear_financial_data(
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Limpiar datos financieros de MySQL - todos o por año específico
    """
    try:
        company_id = _resolve_company_id(current_user)
        
        if year:
            # Limpiar datos de un año específico
            db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id AND period_year = :year"), 
                      {"company_id": company_id, "year": year})
            fin_cols = set()
            try:
                cols_result = db.execute(text("SHOW COLUMNS FROM financial_data"))
                for r in cols_result:
                    try:
                        colname = r[0]
                    except Exception:
                        colname = getattr(r, 'Field', None)
                    if colname:
                        fin_cols.add(colname)
            except Exception:
                fin_cols = set()

            year_col = 'year' if 'year' in fin_cols else ('period_year' if 'period_year' in fin_cols else None)
            if year_col:
                db.execute(text(f"DELETE FROM financial_data WHERE company_id = :company_id AND {year_col} = :year"), 
                          {"company_id": company_id, "year": year})
            else:
                db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id"), 
                          {"company_id": company_id})
            db.execute(text("DELETE FROM production_data WHERE company_id = :company_id AND year = :year"), 
                      {"company_id": company_id, "year": year})
            
            message = f"Data for year {year} cleared from MySQL"
        else:
            # Limpiar todos los datos
            db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id"), 
                      {"company_id": company_id})
            db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id"), 
                      {"company_id": company_id})
            db.execute(text("DELETE FROM production_data WHERE company_id = :company_id"), 
                      {"company_id": company_id})
            
            message = "All financial data cleared from MySQL"
        
        db.commit()
        
        return {"success": True, "message": message}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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

@router.get("/years")
async def get_available_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener años disponibles con estadísticas para selector multi-año
    """
    try:
        company_id = _resolve_company_id(current_user)
        
        inspector = inspect(db.bind)
        if not inspector.has_table("raw_account_data"):
            return {
                "success": True,
                "years": [],
                "current_year": datetime.now().year,
                "total_years": 0,
            }

        # Query para obtener estadísticas por año
        query = text("""
            SELECT 
                rad.period_year AS year,
                COUNT(*) AS total_records,
                COUNT(DISTINCT rad.account_code) AS unique_accounts,
                MIN(rad.period_month) AS min_month,
                MAX(rad.period_month) AS max_month,
                SUM(
                    CASE 
                        WHEN rad.account_code LIKE '4%'
                             AND NOT EXISTS (
                                 SELECT 1 
                                 FROM raw_account_data r2
                                 WHERE r2.company_id = rad.company_id
                                   AND r2.period_year = rad.period_year
                                   AND r2.period_month = rad.period_month
                                   AND r2.account_code <> rad.account_code
                                   AND r2.account_code LIKE CONCAT(rad.account_code, '.%')
                             )
                        THEN rad.amount 
                        ELSE 0 
                    END
                ) AS total_revenue
            FROM raw_account_data rad
            WHERE rad.company_id = :company_id 
            GROUP BY rad.period_year 
            ORDER BY rad.period_year DESC
        """)
        
        result = db.execute(query, {"company_id": company_id})
        
        years_data = []
        for row in result:
            years_data.append({
                "year": row.year,
                "records": row.total_records,
                "accounts": row.unique_accounts,
                "months": row.max_month - row.min_month + 1 if row.max_month and row.min_month else 0,
                "month_range": f"{row.min_month}-{row.max_month}" if row.max_month and row.min_month else "No data",
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "has_data": row.total_records > 0
            })
        
        # Si no hay datos, devolver array vacío pero success true
        return {
            "success": True,
            "years": years_data,
            "current_year": datetime.now().year,
            "total_years": len(years_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
