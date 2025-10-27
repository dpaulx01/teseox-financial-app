"""
Modelos SQLAlchemy para módulo BI de ventas
"""
from sqlalchemy import Column, Integer, String, Date, DECIMAL, DateTime, Enum, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base
from datetime import datetime

class SalesTransaction(Base):
    """Transacción de venta individual"""
    __tablename__ = 'sales_transactions'

    id = Column(Integer, primary_key=True, index=True)

    # Información temporal
    fecha_emision = Column(Date, nullable=False, index=True)
    year = Column(Integer, index=True)
    month = Column(Integer, index=True)
    quarter = Column(Integer)

    # Información comercial
    categoria_producto = Column(String(100), nullable=False, index=True)
    vendedor = Column(String(200), nullable=False, index=True)
    numero_factura = Column(String(50), nullable=False, index=True)
    canal_comercial = Column(String(100), nullable=False, index=True)
    razon_social = Column(String(255), nullable=False, index=True)
    producto = Column(String(255), nullable=False, index=True)

    # Cantidades
    cantidad_facturada = Column(DECIMAL(12, 2), nullable=False, default=0)
    factor_conversion = Column(DECIMAL(10, 4), default=1)
    m2 = Column(DECIMAL(12, 2), default=0)

    # Montos financieros
    venta_bruta = Column(DECIMAL(12, 2), nullable=False, default=0)
    descuento = Column(DECIMAL(12, 2), nullable=False, default=0)
    venta_neta = Column(DECIMAL(12, 2), nullable=False, default=0)
    costo_venta = Column(DECIMAL(12, 2), default=0)
    costo_unitario = Column(DECIMAL(12, 4), default=0)
    rentabilidad = Column(DECIMAL(12, 2), default=0)

    # Metadata
    company_id = Column(Integer, default=1, index=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    def __repr__(self):
        return f"<SalesTransaction(id={self.id}, factura='{self.numero_factura}', venta_neta={self.venta_neta})>"

    def to_dict(self):
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'fecha_emision': self.fecha_emision.isoformat() if self.fecha_emision else None,
            'year': self.year,
            'month': self.month,
            'quarter': self.quarter,
            'categoria_producto': self.categoria_producto,
            'vendedor': self.vendedor,
            'numero_factura': self.numero_factura,
            'canal_comercial': self.canal_comercial,
            'razon_social': self.razon_social,
            'producto': self.producto,
            'cantidad_facturada': float(self.cantidad_facturada) if self.cantidad_facturada else 0,
            'factor_conversion': float(self.factor_conversion) if self.factor_conversion else 1,
            'm2': float(self.m2) if self.m2 else 0,
            'venta_bruta': float(self.venta_bruta) if self.venta_bruta else 0,
            'descuento': float(self.descuento) if self.descuento else 0,
            'venta_neta': float(self.venta_neta) if self.venta_neta else 0,
            'costo_venta': float(self.costo_venta) if self.costo_venta else 0,
            'costo_unitario': float(self.costo_unitario) if self.costo_unitario else 0,
            'rentabilidad': float(self.rentabilidad) if self.rentabilidad else 0,
            'margen_porcentaje': round((float(self.rentabilidad) / float(self.venta_neta) * 100), 2) if self.venta_neta and float(self.venta_neta) > 0 else 0,
            'company_id': self.company_id
        }


class SalesKPICache(Base):
    """Cache de KPIs calculados para performance"""
    __tablename__ = 'sales_kpis_cache'

    id = Column(Integer, primary_key=True, index=True)

    # Dimensiones
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, index=True)
    dimension_type = Column(
        Enum('global', 'categoria', 'cliente', 'producto', 'canal', 'vendedor', name='dimension_type_enum'),
        nullable=False,
        index=True
    )
    dimension_value = Column(String(255), index=True)

    # KPIs Comerciales
    venta_bruta = Column(DECIMAL(12, 2), default=0)
    venta_neta = Column(DECIMAL(12, 2), default=0)
    descuento = Column(DECIMAL(12, 2), default=0)
    cantidad_transacciones = Column(Integer, default=0)
    cantidad_unidades = Column(DECIMAL(12, 2), default=0)
    ticket_promedio = Column(DECIMAL(12, 2), default=0)
    porcentaje_descuento = Column(DECIMAL(5, 2), default=0)

    # KPIs Financieros
    costo_venta = Column(DECIMAL(12, 2), default=0)
    rentabilidad = Column(DECIMAL(12, 2), default=0)
    margen_porcentaje = Column(DECIMAL(5, 2), default=0)
    ratio_costo_venta = Column(DECIMAL(5, 2), default=0)

    # Metadata
    company_id = Column(Integer, default=1, index=True)
    calculated_at = Column(DateTime, server_default=func.current_timestamp())

    def __repr__(self):
        return f"<SalesKPICache(year={self.year}, month={self.month}, type={self.dimension_type}, value='{self.dimension_value}')>"

    def to_dict(self):
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'year': self.year,
            'month': self.month,
            'dimension_type': self.dimension_type,
            'dimension_value': self.dimension_value,
            'venta_bruta': float(self.venta_bruta) if self.venta_bruta else 0,
            'venta_neta': float(self.venta_neta) if self.venta_neta else 0,
            'descuento': float(self.descuento) if self.descuento else 0,
            'cantidad_transacciones': self.cantidad_transacciones,
            'cantidad_unidades': float(self.cantidad_unidades) if self.cantidad_unidades else 0,
            'ticket_promedio': float(self.ticket_promedio) if self.ticket_promedio else 0,
            'porcentaje_descuento': float(self.porcentaje_descuento) if self.porcentaje_descuento else 0,
            'costo_venta': float(self.costo_venta) if self.costo_venta else 0,
            'rentabilidad': float(self.rentabilidad) if self.rentabilidad else 0,
            'margen_porcentaje': float(self.margen_porcentaje) if self.margen_porcentaje else 0,
            'ratio_costo_venta': float(self.ratio_costo_venta) if self.ratio_costo_venta else 0,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None
        }


class SalesAlert(Base):
    """Alertas y notificaciones del sistema BI"""
    __tablename__ = 'sales_alerts'

    id = Column(Integer, primary_key=True, index=True)

    alert_type = Column(
        Enum('descuento_alto', 'margen_bajo', 'caida_ventas', 'cliente_inactivo', 'producto_lento', name='alert_type_enum'),
        nullable=False,
        index=True
    )
    severity = Column(
        Enum('info', 'warning', 'critical', name='severity_enum'),
        nullable=False
    )

    title = Column(String(255), nullable=False)
    description = Column(Text)

    # Contexto
    dimension_type = Column(String(50))
    dimension_value = Column(String(255))
    metric_value = Column(DECIMAL(12, 2))
    threshold_value = Column(DECIMAL(12, 2))

    # Estado
    status = Column(
        Enum('active', 'acknowledged', 'resolved', name='alert_status_enum'),
        default='active',
        index=True
    )
    acknowledged_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    acknowledged_at = Column(DateTime)

    company_id = Column(Integer, default=1, index=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    acknowledged_user = relationship('User', foreign_keys=[acknowledged_by])

    def __repr__(self):
        return f"<SalesAlert(id={self.id}, type={self.alert_type}, severity={self.severity}, status={self.status})>"

    def to_dict(self):
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'dimension_type': self.dimension_type,
            'dimension_value': self.dimension_value,
            'metric_value': float(self.metric_value) if self.metric_value else None,
            'threshold_value': float(self.threshold_value) if self.threshold_value else None,
            'status': self.status,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SalesSavedFilter(Base):
    """Filtros guardados por el usuario"""
    __tablename__ = 'sales_saved_filters'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = Column(Integer, default=1, index=True)

    filter_name = Column(String(100), nullable=False)
    filter_type = Column(
        Enum('comercial', 'financiero', name='filter_type_enum'),
        nullable=False,
        index=True
    )

    # Configuración JSON
    filter_config = Column(JSON, nullable=False)

    # Metadata
    is_favorite = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    user = relationship('User', foreign_keys=[user_id])

    def __repr__(self):
        return f"<SalesSavedFilter(id={self.id}, name='{self.filter_name}', type={self.filter_type})>"

    def to_dict(self):
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filter_name': self.filter_name,
            'filter_type': self.filter_type,
            'filter_config': self.filter_config,
            'is_favorite': self.is_favorite,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
