#!/usr/bin/env python3
"""
CLONACIÓN EXACTA del CSV upload del proyecto original
Replica exactamente la funcionalidad de simple_csv_upload.php
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from api_rbac_minimal import get_db, get_current_user, User
import re
from datetime import datetime

router = APIRouter(prefix="/api/financial", tags=["csv-upload-original"])

@router.post("/csv-upload")
async def upload_csv_exact_clone(
    file: UploadFile = File(...),
    year: int = Form(default=datetime.now().year),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CLONACIÓN EXACTA del procesamiento CSV del proyecto original
    """
    try:
        # Validar archivo
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos CSV")
        
        # Leer contenido del archivo
        content = await file.read()
        
        # Convertir encoding si es necesario (como en el original)
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            content_str = content.decode('iso-8859-1')
        
        # Limpiar BOM (como en el original)
        content_str = content_str.lstrip('\ufeff')
        lines = content_str.strip().split('\n')
        
        if len(lines) < 2:
            raise HTTPException(status_code=400, detail="El archivo CSV debe tener al menos 2 líneas")
        
        # Procesar headers (primera línea) - EXACTO como en el original
        headers = [h.strip() for h in lines[0].split(';')]
        months = []
        for i in range(2, len(headers)):
            if headers[i]:
                months.append(headers[i].strip())
        
        print(f"📋 Headers encontrados: {headers}")
        print(f"📅 Meses detectados: {months}")
        
        company_id = 1  # Default como en el original
        
        # Iniciar transacción
        db.execute(text("START TRANSACTION"))
        
        # Limpiar datos existentes - EXACTO como en el original
        db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id AND period_year = :year"), 
                  {"company_id": company_id, "year": year})
        db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id AND year = :year"), 
                  {"company_id": company_id, "year": year})
        
        print(f"🗑️ Datos existentes eliminados para año {year}")
        
        # Preparar inserción - EXACTO como en el original
        insert_query = text("""
            INSERT INTO raw_account_data (company_id, import_date, account_code, account_name, period_year, period_month, amount) 
            VALUES (:company_id, :import_date, :account_code, :account_name, :period_year, :period_month, :amount)
        """)
        
        total_revenue = 0
        total_accounts = 0
        account_codes = set()
        inserted_rows = 0
        
        # Procesar líneas de datos - EXACTO como en el original
        for line_num in range(1, len(lines)):
            line = lines[line_num].strip()
            if not line:
                continue
                
            fields = [f.strip() for f in line.split(';')]
            if len(fields) < 2:
                continue
            
            # Limpiar código de cuenta - EXACTO como en el original
            account_code = fields[0].strip()
            account_code = re.sub(r'[^\d\.]', '', account_code)
            
            if not account_code:
                continue
            
            account_name = fields[1].strip()
            account_codes.add(account_code)
            
            # Procesar valores por mes - EXACTO como en el original
            for month_index in range(len(months)):
                if month_index + 2 >= len(fields):
                    continue
                    
                value = fields[month_index + 2].strip()
                if not value or value == '0':
                    continue
                
                # Convertir formato europeo - EXACTO como en el original
                value = value.replace('.', '')  # Eliminar separadores de miles
                value = value.replace(',', '.')  # Cambiar coma decimal por punto
                
                try:
                    amount = float(value)
                except ValueError:
                    continue
                
                if amount == 0:
                    continue
                
                # Insertar en raw_account_data - EXACTO como en el original
                db.execute(insert_query, {
                    "company_id": company_id,
                    "import_date": datetime.now().date(),
                    "account_code": account_code,
                    "account_name": account_name,
                    "period_year": year,
                    "period_month": month_index + 1,
                    "amount": amount
                })
                
                inserted_rows += 1
                total_accounts += 1
                
                if account_code == '4':  # Ingresos
                    total_revenue += amount
        
        print(f"📊 Filas insertadas en raw_account_data: {inserted_rows}")
        print(f"💰 Total ingresos detectados: {total_revenue}")
        print(f"📈 Códigos de cuenta únicos: {sorted(account_codes)}")
        
        # Ahora calcular y insertar en financial_data usando las vistas
        # EXACTO como en el original
        financial_insert_query = text("""
            INSERT INTO financial_data (
                company_id, year, month, ingresos, 
                costo_ventas_total, gastos_admin_total, gastos_ventas_total,
                utilidad_bruta, ebitda, utilidad_neta
            )
            SELECT 
                company_id, period_year, period_month, ingresos,
                costos_variables as costo_ventas_total,
                0 as gastos_admin_total,
                costos_fijos as gastos_ventas_total,
                utilidad_bruta,
                utilidad_neta as ebitda,
                utilidad_neta
            FROM v_financial_metrics
            WHERE company_id = :company_id AND period_year = :year
        """)
        
        db.execute(financial_insert_query, {"company_id": company_id, "year": year})
        
        # Confirmar transacción
        db.commit()
        
        # Obtener resumen final - EXACTO como en el original
        summary_query = text("""
            SELECT 
                COUNT(*) as total_months,
                SUM(ingresos) as total_ingresos,
                SUM(utilidad_neta) as total_utilidad_neta,
                AVG(CASE WHEN ingresos > 0 THEN (utilidad_neta / ingresos) * 100 ELSE 0 END) as margen_promedio
            FROM v_financial_metrics
            WHERE company_id = :company_id AND period_year = :year
        """)
        
        result = db.execute(summary_query, {"company_id": company_id, "year": year}).fetchone()
        
        return {
            "success": True,
            "message": "CSV procesado exitosamente",
            "year": year,
            "raw_records_inserted": inserted_rows,
            "account_codes_found": sorted(account_codes),
            "months_processed": len(months),
            "financial_summary": {
                "total_months": result[0] if result else 0,
                "total_ingresos": float(result[1]) if result and result[1] else 0,
                "total_utilidad_neta": float(result[2]) if result and result[2] else 0,
                "margen_promedio": float(result[3]) if result and result[3] else 0
            }
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error procesando CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

@router.get("/data-original")
def get_financial_data_original(
    year: int = datetime.now().year,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CLONACIÓN EXACTA del endpoint de datos del proyecto original
    Usa las vistas v_financial_metrics como en el original
    """
    try:
        company_id = 1
        
        # Datos mensuales usando vista - EXACTO como en el original
        monthly_query = text("""
            SELECT 
                period_month,
                ingresos,
                costos_variables as costosVariables,
                costos_fijos as costosFijos,
                utilidad_bruta as utilidadBruta,
                utilidad_neta as utilidadNeta,
                margen_neto_pct as margenNeto,
                0 as depreciacion,
                costos_variables as costoVentasTotal,
                0 as gastosAdminTotal,
                0 as gastosVentasTotal,
                0 as puntoEquilibrio,
                0 as puntoEquilibrioAcumulado,
                0 as costoMateriaPrima,
                0 as costoProduccion,
                0 as costoOperativo,
                costos_fijos + costos_variables as gastosOperativos,
                utilidad_neta as ebitda
            FROM v_financial_metrics 
            WHERE company_id = :company_id AND period_year = :year
            ORDER BY period_month
        """)
        
        rows = db.execute(monthly_query, {"company_id": company_id, "year": year}).fetchall()
        
        # Convertir a nombres de meses - EXACTO como en el original
        month_names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        
        monthly_data = {}
        for row in rows:
            month_name = month_names[row[0]]  # period_month
            monthly_data[month_name] = {
                "ingresos": float(row[1]),
                "costosVariables": float(row[2]),
                "costosFijos": float(row[3]),
                "utilidadBruta": float(row[4]),
                "utilidadNeta": float(row[5]),
                "margenNeto": float(row[6]),
                "depreciacion": float(row[7]),
                "costoVentasTotal": float(row[8]),
                "gastosAdminTotal": float(row[9]),
                "gastosVentasTotal": float(row[10]),
                "puntoEquilibrio": float(row[11]),
                "puntoEquilibrioAcumulado": float(row[12]),
                "costoMateriaPrima": float(row[13]),
                "costoProduccion": float(row[14]),
                "costoOperativo": float(row[15]),
                "gastosOperativos": float(row[16]),
                "ebitda": float(row[17])
            }
        
        # Calcular datos anuales sumando los mensuales - SIMPLE Y FUNCIONAL
        total_ingresos = sum(data["ingresos"] for data in monthly_data.values())
        total_costos_variables = sum(data["costosVariables"] for data in monthly_data.values())
        total_costos_fijos = sum(data["costosFijos"] for data in monthly_data.values())
        total_utilidad_bruta = sum(data["utilidadBruta"] for data in monthly_data.values())
        total_utilidad_neta = sum(data["utilidadNeta"] for data in monthly_data.values())
        
        yearly_data = {
            "ingresos": total_ingresos,
            "costosVariables": total_costos_variables,
            "costosFijos": total_costos_fijos,
            "utilidadBruta": total_utilidad_bruta,
            "utilidadNeta": total_utilidad_neta,
            "margenNeto": (total_utilidad_neta / total_ingresos * 100) if total_ingresos > 0 else 0,
            "ebitda": total_utilidad_neta,  # Agregar EBITDA para evitar NaN
            "puntoEquilibrio": 0
        }
        
        # Calcular datos promedio dividiendo los totales - SIMPLE Y FUNCIONAL
        num_months = len(monthly_data)
        
        average_data = {
            "ingresos": total_ingresos / num_months if num_months > 0 else 0,
            "costosVariables": total_costos_variables / num_months if num_months > 0 else 0,
            "costosFijos": total_costos_fijos / num_months if num_months > 0 else 0,
            "utilidadBruta": total_utilidad_bruta / num_months if num_months > 0 else 0,
            "utilidadNeta": total_utilidad_neta / num_months if num_months > 0 else 0,
            "margenNeto": (total_utilidad_neta / total_ingresos * 100) if total_ingresos > 0 else 0,
            "ebitda": total_utilidad_neta / num_months if num_months > 0 else 0,  # Agregar EBITDA para evitar NaN
            "puntoEquilibrio": 0
        }
        
        # Obtener raw data para el frontend (como en el original)
        raw_query = text("""
            SELECT account_code as 'COD.', account_name as 'CUENTA', 
                   period_month, amount
            FROM raw_account_data 
            WHERE company_id = :company_id AND period_year = :year
            ORDER BY account_code, period_month
        """)
        
        raw_rows = db.execute(raw_query, {"company_id": company_id, "year": year}).fetchall()
        raw_data = []
        for row in raw_rows:
            raw_data.append({
                "COD.": row[0],
                "CUENTA": row[1],
                f"month_{row[2]}": row[3]  # month_1, month_2, etc.
            })
        
        # Calcular KPIs como en el original
        kpis = [
            {
                "name": "Margen EBITDA", 
                "value": (total_utilidad_neta / total_ingresos * 100) if total_ingresos > 0 else 0,
                "unit": "%"
            },
            {
                "name": "Eficiencia Operativa",
                "value": (total_ingresos / (total_costos_variables + total_costos_fijos)) if (total_costos_variables + total_costos_fijos) > 0 else 0,
                "unit": "x"
            }
        ]

        return {
            "monthly": monthly_data,
            "yearly": yearly_data,
            "average": average_data,
            "raw": raw_data,
            "kpis": kpis,
            "breakEven": {
                "yearly": 0,
                "average": 0
            },
            "lastUpdated": datetime.now().isoformat(),
            "source": "mysql_views_original_clone"
        }
        
    except Exception as e:
        print(f"❌ Error obteniendo datos financieros: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo datos: {str(e)}")

@router.delete("/data-clear/{year}")
def clear_financial_data(
    year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CLONACIÓN EXACTA del borrado de datos del proyecto original
    Borra datos de ambas tablas como en simple_csv_upload.php
    """
    try:
        company_id = 1
        
        # Iniciar transacción
        db.execute(text("START TRANSACTION"))
        
        # Limpiar datos - EXACTO como en el original
        result1 = db.execute(text("DELETE FROM raw_account_data WHERE company_id = :company_id AND period_year = :year"), 
                            {"company_id": company_id, "year": year})
        result2 = db.execute(text("DELETE FROM financial_data WHERE company_id = :company_id AND year = :year"), 
                            {"company_id": company_id, "year": year})
        
        # Confirmar transacción
        db.commit()
        
        print(f"🗑️ Datos eliminados - raw_account_data: {result1.rowcount}, financial_data: {result2.rowcount}")
        
        return {
            "success": True,
            "message": "Datos financieros eliminados completamente",
            "year": year,
            "raw_records_deleted": result1.rowcount,
            "financial_records_deleted": result2.rowcount
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error borrando datos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error borrando datos: {str(e)}")