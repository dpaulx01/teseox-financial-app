"""
SQLAlchemy models for gestión de producción (Status Producción).
"""
from __future__ import annotations

import enum
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database.connection import Base


class ProductionStatusEnum(str, enum.Enum):
    EN_COLA = "En cola"
    EN_PRODUCCION = "En producción"
    PRODUCCION_PARCIAL = "Producción parcial"
    LISTO_PARA_RETIRO = "Listo para retiro"
    ENTREGADO = "Entregado"


class ProductionQuote(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_cotizacion: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    cliente: Mapped[Optional[str]] = mapped_column(String(255))
    contacto: Mapped[Optional[str]] = mapped_column(String(255))
    proyecto: Mapped[Optional[str]] = mapped_column(String(255))
    odc: Mapped[Optional[str]] = mapped_column(String(128))
    valor_total: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    fecha_ingreso: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cotizacion: Mapped[ProductionQuote] = relationship("ProductionQuote", back_populates="productos")

    def __repr__(self) -> str:
        return f"<ProductionProduct descripcion={self.descripcion[:20]!r}>"


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
