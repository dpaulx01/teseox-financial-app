"""
Financial data models for SQLAlchemy ORM
"""
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, Index, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from database.connection import Base


class RawAccountData(Base):
    """
    Modelo para almacenar datos crudos del plan de cuentas importado desde CSV.
    Esta tabla se usa en el módulo de P&G (Pérdidas y Ganancias).
    """
    __tablename__ = "raw_account_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False, index=True)
    import_date = Column(Date, nullable=False)
    account_code = Column(String(20), nullable=False)
    account_name = Column(String(255), nullable=False)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Índices compuestos para mejorar performance
    __table_args__ = (
        Index('idx_account_period', 'company_id', 'account_code', 'period_year', 'period_month'),
        Index('idx_company_year', 'company_id', 'period_year'),
    )

    def __repr__(self):
        return f"<RawAccountData(id={self.id}, account_code={self.account_code}, year={self.period_year})>"


class FinancialData(Base):
    """
    Modelo para almacenar datos financieros procesados (P&G).
    Datos agregados calculados a partir de raw_account_data.
    """
    __tablename__ = "financial_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=True, index=True)
    data_type = Column(Enum('monthly', 'yearly', 'quarterly', name='data_type_enum'), default='monthly')
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=True)
    period_quarter = Column(Integer, nullable=True)

    # Ingresos
    ingresos = Column(Numeric(15, 2), default=0.00)
    ingresos_operacionales = Column(Numeric(15, 2), default=0.00)
    ingresos_no_operacionales = Column(Numeric(15, 2), default=0.00)

    # Costos
    costo_ventas = Column(Numeric(15, 2), default=0.00)
    costos_directos = Column(Numeric(15, 2), default=0.00)
    costos_indirectos = Column(Numeric(15, 2), default=0.00)

    # Gastos
    gastos_administrativos = Column(Numeric(15, 2), default=0.00)
    gastos_ventas = Column(Numeric(15, 2), default=0.00)
    gastos_financieros = Column(Numeric(15, 2), default=0.00)

    # Utilidades
    utilidad_bruta = Column(Numeric(15, 2), default=0.00)
    utilidad_operacional = Column(Numeric(15, 2), default=0.00)
    utilidad_neta = Column(Numeric(15, 2), default=0.00)
    ebitda = Column(Numeric(15, 2), default=0.00)

    # Metadata
    upload_source = Column(String(100), default='manual')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Índices y constraints
    __table_args__ = (
        UniqueConstraint('company_id', 'data_type', 'period_year', 'period_month', 'period_quarter', name='unique_period'),
        Index('idx_company_period', 'company_id', 'period_year', 'period_month'),
    )

    def __repr__(self):
        return f"<FinancialData(id={self.id}, year={self.period_year}, month={self.period_month}, type={self.data_type})>"
