import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, Zap, Shield, Activity } from 'lucide-react';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { apiPath } from '../config/apiBaseUrl';
import TenantStorage from '../utils/tenantStorage';

export default function Login() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        // Fetch user info to store
        const userResponse = await fetch(apiPath('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Prefer company info from /me, but also keep anything returned in login response
          const mergedUser = {
            ...(data.user || {}),
            ...userData,
          };
          localStorage.setItem('user', JSON.stringify(mergedUser));
        }

        // Reset active tab to 'home' on every login (tenant-specific)
        TenantStorage.setItem('teseo-x-active-tab', 'home');

        // Run migration for existing data
        TenantStorage.migrateExistingData();

        navigate('/dashboard');
      } else {
        setError(data.detail || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-dark-bg text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <AnimatedBackground />
      
      {/* Debug Theme Toggle */}
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 w-full max-w-md px-6">
        <div className={`backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform transition-all hover:scale-105 duration-300 ${
          theme === 'dark'
            ? 'bg-gray-900/90 border border-cyan-500/30 shadow-cyan-500/20'
            : 'bg-white border border-gray-200 shadow-gray-200/50'
        }`}>
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 relative bg-dark-card/70 border border-border shadow-glow-sm overflow-hidden">
              <img
                src="/logo-teseox.png"
                alt="Teseox"
                className="w-full h-full object-contain p-2"
              />
            </div>
            <p className={`font-mono text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              SISTEMA DE INTELIGENCIA FINANCIERA
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className={`flex items-center gap-2 text-xs ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                <Activity className="w-3 h-3" />
                <span className="font-mono">SISTEMA ACTIVO</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${
                theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'
              }`}>
                <Shield className="w-3 h-3" />
                <span className="font-mono">RBAC HABILITADO</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/50 rounded-xl flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-error" />
              <p className="text-error text-sm font-mono">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2 font-mono">
                IDENTIFICADOR
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-dark-surface border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono hover:bg-dark-card"
                  placeholder="USUARIO"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2 font-mono">
                CLAVE DE ACCESO
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-dark-surface border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono hover:bg-dark-card"
                  placeholder="CONTRASEÑA"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-accent-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-muted" />
                  )}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-gradient-to-r from-primary to-secondary text-white font-display font-semibold rounded-xl shadow-lg hover:shadow-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isLoading ? (
                <span className="flex items-center justify-center relative z-10">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AUTENTICANDO...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <Zap className="w-5 h-5" />
                  INICIAR SESIÓN
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted font-mono">
              <Shield className="w-4 h-4" />
              <span>SISTEMA PROTEGIDO CON RBAC • v2.0</span>
            </div>
            <div className="mt-2 text-xs text-text-muted/50 font-mono">
              CONEXIÓN SEGURA • ENCRIPTACIÓN AES-256
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
