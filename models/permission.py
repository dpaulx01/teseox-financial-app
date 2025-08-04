"""
Permission model for RBAC system
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True, index=True)
    resource = Column(String(100), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    description = Column(String(500))
    created_at = Column(DateTime, server_default=func.current_timestamp())
    
    # Relationships
    roles = relationship('Role', secondary='role_permissions', back_populates='permissions')
    
    def __repr__(self):
        return f"<Permission(id={self.id}, resource='{self.resource}', action='{self.action}')>"
    
    @classmethod
    def format_permission(cls, resource: str, action: str) -> str:
        """Format permission as string"""
        return f"{resource}:{action}"
    
    @property
    def permission_string(self) -> str:
        """Get permission as formatted string"""
        return self.format_permission(self.resource, self.action)