"""
Financial data models for SQLAlchemy ORM
"""
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, Index
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
