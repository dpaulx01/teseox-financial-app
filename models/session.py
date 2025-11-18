"""
User session model for JWT token management
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base

class UserSession(Base):
    __tablename__ = 'user_sessions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, default=1, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    revoked_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship('User', back_populates='sessions')
    company = relationship('Company')
    
    @property
    def is_active(self) -> bool:
        """Check if session is still active"""
        from datetime import datetime
        return (
            self.revoked_at is None and 
            self.expires_at > datetime.utcnow()
        )
    
    def revoke(self):
        """Revoke the session"""
        self.revoked_at = func.current_timestamp()
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, active={self.is_active})>"