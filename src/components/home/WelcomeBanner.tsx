import React, { useMemo } from 'react';
import { User, Clock } from 'lucide-react';

const WelcomeBanner: React.FC = () => {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const lastAccess = useMemo(() => {
    const lastAccessStr = localStorage.getItem('lastAccess');
    if (!lastAccessStr) return null;
    try {
      const date = new Date(lastAccessStr);
      return date.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, []);

  // Update last access
  React.useEffect(() => {
    localStorage.setItem('lastAccess', new Date().toISOString());
  }, []);

  return (
    <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-8 shadow-hologram relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 shadow-glow-sm">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display text-text-primary neon-text">
                {greeting}, {user.username || 'Usuario'}
              </h1>
              <p className="text-sm text-text-muted">
                Bienvenido al sistema financiero de ARTYCO
              </p>
            </div>
          </div>

          {lastAccess && (
            <div className="flex items-center gap-2 text-sm text-text-muted pl-1">
              <Clock className="h-4 w-4" />
              <span>Último acceso: {lastAccess}</span>
            </div>
          )}
        </div>

        {user.is_superuser && (
          <div className="glass-badge inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent shadow-glow-sm">
            <span>🔑</span>
            Administrador
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeBanner;
