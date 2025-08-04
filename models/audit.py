"""
Audit log model for tracking user actions
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), index=True)
    resource_id = Column(String(100))
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, server_default=func.current_timestamp(), index=True)
    
    # Relationships
    user = relationship('User', back_populates='audit_logs')
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"
    
    @classmethod
    def log_action(cls, db, user_id: int, action: str, resource: str = None, 
                   resource_id: str = None, details: dict = None, 
                   ip_address: str = None, user_agent: str = None):
        """Create an audit log entry"""
        log_entry = cls(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log_entry)
        return log_entry