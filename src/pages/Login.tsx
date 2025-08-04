import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, Zap, Shield, Activity } from 'lucide-react';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import ThemeToggle from '../components/ui/ThemeToggle';
import SimpleThemeToggle from '../components/ui/SimpleThemeToggle';

export default function Login() {
  const navigate = useNavigate();
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
      const response = await fetch('http://localhost:8001/api/auth/login', {
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
        const userResponse = await fetch('http://localhost:8001/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
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
    <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden transition-colors duration-300">
      <AnimatedBackground />
      
      {/* Debug Theme Toggle */}
      <SimpleThemeToggle />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-accent-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-secondary/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-glass backdrop-blur-xl rounded-3xl shadow-2xl border border-border-secondary p-8 transform transition-all hover:scale-105 duration-300">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-4 relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-3xl animate-pulse opacity-50" />
              <span className="text-3xl font-orbitron font-bold text-white relative z-10">AF</span>
            </div>
            <h1 className="text-4xl font-orbitron font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              ARTYCO FINANCIAL
            </h1>
            <p className="text-text-secondary font-mono text-sm">
              SISTEMA DE INTELIGENCIA FINANCIERA
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-success text-xs">
                <Activity className="w-3 h-3" />
                <span className="font-mono">SISTEMA ACTIVO</span>
              </div>
              <div className="flex items-center gap-2 text-accent-primary text-xs">
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
                  className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-border-secondary rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all font-mono hover:bg-white/10"
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
                  className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-border-secondary rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all font-mono hover:bg-white/10"
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
              className="w-full py-4 px-4 bg-gradient-primary text-white font-orbitron font-semibold rounded-xl shadow-lg hover:shadow-accent-primary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-dark-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
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