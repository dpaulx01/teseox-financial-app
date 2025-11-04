"""
SQLAlchemy models for Balance General module.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    SmallInteger,
    DateTime,
    JSON,
)

from database.connection import Base


class BalanceData(Base):
    __tablename__ = "balance_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False, default=1, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=True, index=True)
    account_code = Column(String(50), nullable=False, index=True)
    account_name = Column(String(255), nullable=False)
    level = Column(SmallInteger, nullable=False, default=1)
    parent_code = Column(String(50), nullable=True, index=True)
    balance = Column(Numeric(15, 2), nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "company_id": self.company_id,
            "period_year": self.period_year,
            "period_month": self.period_month,
            "account_code": self.account_code,
            "account_name": self.account_name,
            "level": self.level,
            "parent_code": self.parent_code,
            "balance": float(self.balance or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class RawBalanceData(Base):
    __tablename__ = "raw_balance_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False, default=1, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=True, index=True)
    row_index = Column(Integer, nullable=False)
    account_code = Column(String(50), nullable=True)
    account_name = Column(String(255), nullable=True)
    balance = Column(Numeric(15, 2), nullable=True)
    extra = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BalanceConfig(Base):
    __tablename__ = "balance_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False, default=1, index=True)
    year = Column(Integer, nullable=False, index=True)
    working_capital_target = Column(Numeric(15, 2), nullable=True)
    liquidity_target = Column(Numeric(7, 2), nullable=True)
    leverage_target = Column(Numeric(7, 2), nullable=True)
    notes = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
