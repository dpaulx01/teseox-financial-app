import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiPath } from '../../config/apiBaseUrl';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    // TEMPORAL: Saltar autenticación para funcionalidad inmediata
    const skipAuth = false;
    
    if (skipAuth) {
      setIsAuthenticated(true);
      setUserRole('admin');
      return;
    }
    
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      
      try {
        const response = await fetch(apiPath('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setIsAuthenticated(true);
          setUserRole(userData.is_superuser ? 'admin' : 'user');
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);
  
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">Verificando autenticación...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta página.</p>
      </div>
    </div>;
  }
  
  return <>{children}</>;
};
