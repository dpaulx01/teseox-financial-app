"""
User model for RBAC system
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

# Association table for many-to-many relationship
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE')),
    Column('assigned_at', DateTime, server_default=func.current_timestamp()),
    Column('assigned_by', Integer, ForeignKey('users.id', ondelete='SET NULL'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    roles = relationship(
        'Role', 
        secondary=user_roles, 
        back_populates='users',
        primaryjoin='User.id == user_roles.c.user_id',
        secondaryjoin='Role.id == user_roles.c.role_id'
    )
    sessions = relationship('UserSession', back_populates='user', cascade='all, delete-orphan', lazy='dynamic')
    audit_logs = relationship('AuditLog', back_populates='user', lazy='dynamic')
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has specific permission"""
        if self.is_superuser:
            return True
            
        for role in self.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    return True
        return False
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role"""
        return any(role.name == role_name for role in self.roles)
    
    def get_permissions(self) -> set:
        """Get all user permissions as a set of tuples (resource, action)"""
        if self.is_superuser:
            # Return a special indicator for superuser
            return {('*', '*')}
            
        permissions = set()
        for role in self.roles:
            for permission in role.permissions:
                permissions.add((permission.resource, permission.action))
        return permissions
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"