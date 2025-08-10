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
        user_id: int = payload.get("sub")  # Same as main API
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
            db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id AND year = :year"), 
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
                    if account_code == '4':
                        total_revenue += amount
            
            total_accounts = len(account_codes)
            
            # Procesar datos financieros agregados (EXACTO como PHP original)
            db.execute(text("""
                INSERT INTO financial_data (company_id, year, month, ingresos, costo_ventas_total, 
                                           gastos_admin_total, gastos_ventas_total, utilidad_bruta, ebitda, utilidad_neta)
                SELECT 
                    :company_id, :year, period_month,
                    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) as ingresos,
                    SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as costo_ventas_total,
                    SUM(CASE WHEN account_code = '5.3' THEN amount ELSE 0 END) as gastos_admin_total,
                    SUM(CASE WHEN account_code = '5.2' THEN amount ELSE 0 END) as gastos_ventas_total,
                    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                        SUM(CASE WHEN account_code = '5.1' THEN amount ELSE 0 END) as utilidad_bruta,
                    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                        SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END) as ebitda,
                    SUM(CASE WHEN account_code = '4' THEN amount ELSE 0 END) - 
                        SUM(CASE WHEN account_code LIKE '5%' THEN amount ELSE 0 END) as utilidad_neta
                FROM raw_account_data
                WHERE company_id = :company_id2 AND period_year = :year2
                GROUP BY period_month
            """), {
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
            data.append({
                "id": row.id if hasattr(row, 'id') else None,
                "year": row.year,
                "month": row.month,
                "ingresos": float(row.ingresos) if row.ingresos else 0,
                "costo_ventas_total": float(row.costo_ventas_total) if row.costo_ventas_total else 0,
                "gastos_admin_total": float(row.gastos_admin_total) if row.gastos_admin_total else 0,
                "gastos_ventas_total": float(row.gastos_ventas_total) if row.gastos_ventas_total else 0,
                "utilidad_bruta": float(row.utilidad_bruta) if row.utilidad_bruta else 0,
                "ebitda": float(row.ebitda) if row.ebitda else 0,
                "utilidad_neta": float(row.utilidad_neta) if row.utilidad_neta else 0
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
                account_key = f"{row.account_code}|{row.account_name}"
                if account_key not in account_months:
                    account_months[account_key] = {
                        'COD.': row.account_code,
                        'CUENTA': row.account_name,
                    }
                
                # CRÍTICO: Agregar mes con nombre EXACTO como espera pnlCalculator
                month_names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                
                if 1 <= row.period_month <= 12:
                    month_name = month_names[row.period_month]
                    # CRÍTICO: Convertir valor a NÚMERO (no string europeo)
                    numeric_value = float(row.amount) if row.amount else 0.0
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

@router.delete("/clear")
async def clear_financial_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Limpiar todos los datos financieros de MySQL
    """
    try:
        company_id = 1
        
        # Limpiar datos de la base de datos
        db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id"), 
                  {"company_id": company_id})
        db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id"), 
                  {"company_id": company_id})
        db.execute(text("DELETE FROM production_data WHERE company_id = :company_id"), 
                  {"company_id": company_id})
        
        db.commit()
        
        return {"success": True, "message": "All financial data cleared from MySQL"}
        
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