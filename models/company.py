"""
Company model for SQLAlchemy ORM
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.connection import Base


class Company(Base):
    """
    Modelo para empresas/compañías.
    Usado para multi-tenancy y organización de datos.
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    currency = Column(String(10), default='USD')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Company(id={self.id}, name={self.name})>"
