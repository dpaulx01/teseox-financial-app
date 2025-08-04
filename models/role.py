"""
Role model for RBAC system
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

# Association table for many-to-many relationship between roles and permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE')),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE')),
    Column('granted_at', DateTime, server_default=func.current_timestamp()),
    Column('granted_by', Integer, ForeignKey('users.id', ondelete='SET NULL'))
)

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(500))
    is_system_role = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    users = relationship('User', secondary='user_roles', back_populates='roles')
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if role has specific permission"""
        return any(
            p.resource == resource and p.action == action 
            for p in self.permissions
        )
    
    def get_permissions(self) -> set:
        """Get all role permissions as a set of tuples (resource, action)"""
        return {(p.resource, p.action) for p in self.permissions}
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}')>"