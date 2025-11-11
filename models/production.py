"""
SQLAlchemy models for gestión de producción (Status Producción).
"""
from __future__ import annotations

import enum
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database.connection import Base


class ProductionStatusEnum(str, enum.Enum):
    EN_COLA = "En cola"
    EN_PRODUCCION = "En producción"
    PRODUCCION_PARCIAL = "Producción parcial"
    LISTO_PARA_RETIRO = "Listo para retiro"
    EN_BODEGA = "En bodega"  # Para productos de stock
    ENTREGADO = "Entregado"  # Para productos de cliente


class ProductionTypeEnum(str, enum.Enum):
    """Tipo de producción: cliente (cotización) o stock (inventario)"""
    CLIENTE = "cliente"
    STOCK = "stock"


class ProductionQuote(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_cotizacion: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    tipo_produccion: Mapped[ProductionTypeEnum] = mapped_column(
        Enum(ProductionTypeEnum),
        default=ProductionTypeEnum.CLIENTE,
        nullable=False,
        index=True
    )
    numero_pedido_stock: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    cliente: Mapped[Optional[str]] = mapped_column(String(255))
    bodega: Mapped[Optional[str]] = mapped_column(String(100))
    responsable: Mapped[Optional[str]] = mapped_column(String(100))
    contacto: Mapped[Optional[str]] = mapped_column(String(255))
    proyecto: Mapped[Optional[str]] = mapped_column(String(255))
    odc: Mapped[Optional[str]] = mapped_column(String(128))
    valor_total: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    fecha_ingreso: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_inicio_periodo: Mapped[Optional[date]] = mapped_column(Date)
    fecha_fin_periodo: Mapped[Optional[date]] = mapped_column(Date)
    fecha_vencimiento: Mapped[Optional[date]] = mapped_column(Date)
    nombre_archivo_pdf: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    productos: Mapped[List["ProductionProduct"]] = relationship(
        "ProductionProduct",
        back_populates="cotizacion",
        cascade="all, delete-orphan",
    )
    pagos: Mapped[List["ProductionPayment"]] = relationship(
        "ProductionPayment",
        back_populates="cotizacion",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ProductionQuote numero_cotizacion={self.numero_cotizacion}>"


class ProductionProduct(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cotizacion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cotizaciones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    cantidad: Mapped[Optional[str]] = mapped_column(String(128))
    valor_subtotal: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    fecha_entrega: Mapped[Optional[date]] = mapped_column(Date)
    estatus: Mapped[Optional[ProductionStatusEnum]] = mapped_column(Enum(ProductionStatusEnum))
    notas_estatus: Mapped[Optional[str]] = mapped_column(Text)
    factura: Mapped[Optional[str]] = mapped_column(String(128))
    guia_remision: Mapped[Optional[str]] = mapped_column(String(128))
    fecha_despacho: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cotizacion: Mapped[ProductionQuote] = relationship("ProductionQuote", back_populates="productos")
    plan_diario: Mapped[List["ProductionDailyPlan"]] = relationship(
        "ProductionDailyPlan",
        back_populates="producto",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ProductionProduct descripcion={self.descripcion[:20]!r}>"


class ProductionDailyPlan(Base):
    __tablename__ = "plan_diario_produccion"
    __table_args__ = (
        UniqueConstraint("producto_id", "fecha", name="uq_plan_diario_producto_fecha"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    metros: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    unidades: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cantidad_sugerida: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    notas: Mapped[Optional[str]] = mapped_column(Text)
    is_manually_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_completado: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    producto: Mapped[ProductionProduct] = relationship("ProductionProduct", back_populates="plan_diario")

    def __repr__(self) -> str:
        return f"<ProductionDailyPlan producto_id={self.producto_id} fecha={self.fecha}>"


class ProductionPayment(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cotizacion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cotizaciones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_pago: Mapped[Optional[date]] = mapped_column(Date)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cotizacion: Mapped[ProductionQuote] = relationship("ProductionQuote", back_populates="pagos")

    def __repr__(self) -> str:
        return f"<ProductionPayment monto={self.monto}>"


class ProductionMonthlyData(Base):
    """
    Representa los registros agregados de producción mensual.
    """

    __tablename__ = "production_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    month: Mapped[Optional[int]] = mapped_column(Integer)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    metros_producidos: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    metros_vendidos: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    unidades_producidas: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    unidades_vendidas: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    capacidad_instalada: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ProductionMonthlyData year={self.year or self.period_year} month={self.month or self.period_month}>"


class ProductionConfigModel(Base):
    """
    Configuración operativa para análisis de producción por año y empresa.
    """

    __tablename__ = "production_config"
    __table_args__ = (
        UniqueConstraint("company_id", "year", name="uq_production_config_company_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    capacidad_maxima_mensual: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    costo_fijo_produccion: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    meta_precio_promedio: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    meta_margen_minimo: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ProductionConfig company_id={self.company_id} year={self.year}>"


class ProductionCombinedData(Base):
    """
    Almacena el dataset combinado (financiero + producción + métricas) en formato JSON.
    """

    __tablename__ = "production_combined_data"
    __table_args__ = (
        UniqueConstraint("company_id", "year", name="uq_prod_combined_company_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ProductionCombinedData company_id={self.company_id} year={self.year}>"
