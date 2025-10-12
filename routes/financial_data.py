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
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

# Same JWT config as main API
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Same authentication logic as main API"""
    from fastapi import HTTPException, status
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("user_id")  # Cambio de "sub" a "user_id"
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

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
        
        company_id = 1  # Como en el original
        
        # Leer contenido del archivo
        content = await csv.read()
        
        # Convertir encoding si es necesario (como en PHP original)
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            content_str = content.decode('iso-8859-1')
        
        # Limpiar BOM (como en PHP original)
        content_str = re.sub(r'^\ufeff', '', content_str)
        lines = content_str.split('\n')
        
        if len(lines) < 2:
            raise HTTPException(status_code=400, detail="El archivo CSV está vacío o mal formateado")
        
        # Procesar headers (primera línea) - exacto como PHP original
        import csv as csv_module
        from io import StringIO
        
        csv_reader = csv_module.reader(StringIO(lines[0]), delimiter=';')
        headers = next(csv_reader)
        
        months = []
        for i in range(2, len(headers)):
            if headers[i].strip():
                months.append(headers[i].strip())
        
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
            
            # Procesar líneas de datos (como PHP original)
            for line_num in range(1, len(lines)):
                line = lines[line_num].strip()
                if not line:
                    continue
                
                csv_reader = csv_module.reader(StringIO(line), delimiter=';')
                try:
                    fields = next(csv_reader)
                except:
                    continue
                
                if len(fields) < 2:
                    continue
                
                account_code = fields[0].strip()
                # Limpiar código de cuenta (como PHP original)
                account_code = re.sub(r'[^\d\.]', '', account_code)
                
                if not account_code:
                    continue
                
                account_name = fields[1].strip()
                account_codes.add(account_code)
                
                # Procesar valores por mes
                for month_index in range(len(months)):
                    if month_index + 2 >= len(fields):
                        continue
                    
                    value = fields[month_index + 2].strip()
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
                    if account_code.startswith('4'):
                        total_revenue += amount
            
            total_accounts = len(account_codes)
            
            # Procesar datos financieros agregados: columnas dinámicas según esquema
            def add_column(target_col: str, expr: str):
                insert_columns.append(target_col)
                select_expressions.append(f"{expr} AS {target_col}")

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
            add_column("ingresos", "SUM(CASE WHEN account_code LIKE '4%' THEN amount ELSE 0 END)")

            if "costo_ventas_total" in fin_cols:
                add_column("costo_ventas_total", "SUM(CASE WHEN account_code LIKE '5.1%' THEN amount ELSE 0 END)")
            elif "costo_ventas" in fin_cols:
                add_column("costo_ventas", "SUM(CASE WHEN account_code LIKE '5.1%' THEN amount ELSE 0 END)")

            if "gastos_admin_total" in fin_cols:
                add_column("gastos_admin_total", "SUM(CASE WHEN account_code LIKE '5.3%' THEN amount ELSE 0 END)")
            elif "gastos_administrativos" in fin_cols:
                add_column("gastos_administrativos", "SUM(CASE WHEN account_code LIKE '5.3%' THEN amount ELSE 0 END)")

            if "gastos_ventas_total" in fin_cols:
                add_column("gastos_ventas_total", "SUM(CASE WHEN account_code LIKE '5.2%' THEN amount ELSE 0 END)")
            elif "gastos_ventas" in fin_cols:
                add_column("gastos_ventas", "SUM(CASE WHEN account_code LIKE '5.2%' THEN amount ELSE 0 END)")

            add_column(
                "utilidad_bruta",
                "SUM(CASE WHEN account_code LIKE '4%' THEN amount ELSE 0 END) - "
                "SUM(CASE WHEN account_code LIKE '5.1%' THEN amount ELSE 0 END)",
            )
            add_column(
                "ebitda",
                "SUM(CASE WHEN account_code LIKE '4%' THEN amount ELSE 0 END) - "
                "SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END)",
            )
            add_column(
                "utilidad_neta",
                "SUM(CASE WHEN account_code LIKE '4%' THEN amount ELSE 0 END) - "
                "SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END)",
            )

            insert_sql = f"""
                INSERT INTO financial_data ({', '.join(insert_columns)})
                SELECT 
                    {', '.join(select_expressions)}
                FROM raw_account_data
                WHERE company_id = :company_id2 AND period_year = :year2
                GROUP BY period_month
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
                'months': months,
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
        company_id = 1

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
        company_id = 1
        
        # Insertar o actualizar datos de producción
        db.execute(text("""
            INSERT INTO production_data 
            (company_id, year, month, metros_producidos, metros_vendidos)
            VALUES (:company_id, :year, :month, :metros_producidos, :metros_vendidos)
            ON DUPLICATE KEY UPDATE
            metros_producidos = VALUES(metros_producidos),
            metros_vendidos = VALUES(metros_vendidos)
        """), {
            "company_id": company_id,
            "year": production_data.get("year"),
            "month": production_data.get("month"),
            "metros_producidos": production_data.get("metros_producidos", 0),
            "metros_vendidos": production_data.get("metros_vendidos", 0)
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
        company_id = 1
        
        # Obtener datos de producción
        prod_query = "SELECT * FROM production_data WHERE company_id = :company_id"
        prod_params = {"company_id": company_id}
        
        if year:
            prod_query += " AND year = :year"
            prod_params["year"] = year
        
        prod_query += " ORDER BY year DESC, month ASC"
        
        prod_result = db.execute(text(prod_query), prod_params)
        
        # Formatear datos mensualmente
        monthly = {}
        for row in prod_result:
            key = f"{row.year}-{row.month:02d}"
            monthly[key] = {
                "metrosProducidos": float(row.metros_producidos) if row.metros_producidos else 0,
                "metrosVendidos": float(row.metros_vendidos) if row.metros_vendidos else 0,
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
        company_id = 1
        
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
        company_id = 1
        
        if year:
            # Limpiar datos de un año específico
            db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id AND period_year = :year"), 
                      {"company_id": company_id, "year": year})
            db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id AND year = :year"), 
                      {"company_id": company_id, "year": year})
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
        company_id = 1
        
        # Query para obtener estadísticas por año
        query = text("""
            SELECT 
                period_year as year,
                COUNT(*) as total_records,
                COUNT(DISTINCT account_code) as unique_accounts,
                MIN(period_month) as min_month,
                MAX(period_month) as max_month,
                SUM(CASE WHEN account_code LIKE '4%' THEN amount ELSE 0 END) as total_revenue
            FROM raw_account_data 
            WHERE company_id = :company_id 
            GROUP BY period_year 
            ORDER BY period_year DESC
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
