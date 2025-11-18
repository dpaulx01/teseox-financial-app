"""
Company model for SQLAlchemy ORM
"""
from __future__ import annotations

from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func
from database.connection import Base

if TYPE_CHECKING:
    from models.user import User
    from models.production import ProductionQuote
    from models.sales import SalesTransaction
    from models.financial_scenario import FinancialScenario
    from models.session import UserSession
    from models.audit import AuditLog
    from models.rbac_overrides import RolePermissionOverride, UserRoleOverride


class Company(Base):
    """
    Modelo para empresas/compañías.
    Usado para multi-tenancy y organización de datos.
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    currency = Column(String(10), default='USD')
    is_active = Column(Boolean, default=True, nullable=False)
    subscription_tier = Column(String(50), default='trial', nullable=False)
    subscription_expires_at = Column(DateTime, nullable=True)
    max_users = Column(Integer, default=5, nullable=False)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relaciones principales
    users: Mapped[List["User"]] = relationship("User", foreign_keys="[User.company_id]", back_populates="company")
    production_quotes: Mapped[List["ProductionQuote"]] = relationship("ProductionQuote", back_populates="company")
    sales_transactions: Mapped[List["SalesTransaction"]] = relationship("SalesTransaction", back_populates="company")
    financial_scenarios: Mapped[List["FinancialScenario"]] = relationship("FinancialScenario", back_populates="company")

    # Relaciones RBAC multitenant (Fase 5)
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", cascade="all, delete-orphan", overlaps="company")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", cascade="all, delete-orphan", overlaps="company")
    role_permission_overrides: Mapped[List["RolePermissionOverride"]] = relationship("RolePermissionOverride", cascade="all, delete-orphan", overlaps="company")
    user_role_overrides: Mapped[List["UserRoleOverride"]] = relationship("UserRoleOverride", cascade="all, delete-orphan", overlaps="company")

    def __repr__(self):
        return f"<Company(id={self.id}, name={self.name}, active={self.is_active})>"

    def is_subscription_active(self) -> bool:
        """Return True if the company subscription is active."""
        if not self.is_active:
            return False
        if self.subscription_expires_at:
            return datetime.utcnow() <= self.subscription_expires_at
        return True

    def can_add_user(self) -> bool:
        """Check if the company can add another user given max_users."""
        try:
            return len(self.users or []) < (self.max_users or 0)
        except TypeError:
            return True
