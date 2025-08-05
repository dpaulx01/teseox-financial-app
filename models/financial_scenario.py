"""
Financial Scenario model for Balance Interno module
"""
from sqlalchemy import Column, Integer, String, Text, JSON, TIMESTAMP, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship
from database.connection import Base

class FinancialScenario(Base):
    __tablename__ = "financial_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    base_year = Column(Integer, nullable=False)
    
    # Datos financieros como JSON (compatible con FinancialData del frontend)
    financial_data = Column(JSON, nullable=False)
    
    # Metadatos del escenario
    is_template = Column(Boolean, default=False)  # Plantillas reutilizables
    category = Column(String(100), default="simulación")  # "proyección", "simulación", "análisis"
    status = Column(String(50), default="draft")  # draft, active, archived
    
    # RBAC Integration
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_shared = Column(Boolean, default=False)  # Compartir con otros usuarios
    shared_with = Column(JSON)  # Lista de user_ids con acceso
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    last_accessed = Column(TIMESTAMP)
    
    # Relationships
    owner = relationship("User", back_populates="financial_scenarios")
    
    def has_access(self, user_id: int) -> bool:
        """Verificar si un usuario tiene acceso al escenario"""
        if self.owner_id == user_id:
            return True
        if self.is_shared and self.shared_with:
            return user_id in self.shared_with
        return False
    
    def get_metadata(self) -> dict:
        """Obtener metadatos del escenario sin datos financieros"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "base_year": self.base_year,
            "category": self.category,
            "status": self.status,
            "is_template": self.is_template,
            "is_shared": self.is_shared,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None,
            "owner": self.owner.username if self.owner else None
        }
    
    def __repr__(self):
        return f"<FinancialScenario(id={self.id}, name='{self.name}', owner_id={self.owner_id})>"