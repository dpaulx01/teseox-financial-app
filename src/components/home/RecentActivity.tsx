import React, { useMemo } from 'react';
import { FileText, Upload, TrendingUp, Settings, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'upload' | 'analysis' | 'config' | 'view';
  description: string;
  timestamp: Date;
  icon: React.ElementType;
}

const RecentActivity: React.FC = () => {
  const activities = useMemo<ActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem('recentActivities');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })).slice(0, 5);
      }
    } catch {
      // Fallback to default
    }

    // Default activities
    return [
      {
        id: '1',
        type: 'view',
        description: 'Accedió a la página de inicio',
        timestamp: new Date(),
        icon: FileText,
      },
    ];
  }, []);

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
  };

  const getIconForType = (type: string): React.ElementType => {
    switch (type) {
      case 'upload': return Upload;
      case 'analysis': return TrendingUp;
      case 'config': return Settings;
      default: return FileText;
    }
  };

  const getColorForType = (type: string): string => {
    switch (type) {
      case 'upload': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'analysis': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'config': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-border/60 bg-dark-card/80 p-6 shadow-hologram">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 shadow-glow-sm">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Actividad Reciente</h3>
          <p className="text-xs text-text-muted">Últimas acciones en el sistema</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay actividad reciente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getIconForType(activity.type);
            const colorClass = getColorForType(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-dark-card/60 border border-border/40 hover:bg-dark-card/80 hover:border-border/60 transition-all duration-200"
              >
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium">
                    {activity.description}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {getRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper function to add activity (can be called from other components)
export const addRecentActivity = (type: 'upload' | 'analysis' | 'config' | 'view', description: string) => {
  try {
    const stored = localStorage.getItem('recentActivities');
    const activities = stored ? JSON.parse(stored) : [];

    const newActivity = {
      id: Date.now().toString(),
      type,
      description,
      timestamp: new Date().toISOString(),
    };

    // Keep only last 10 activities
    const updated = [newActivity, ...activities].slice(0, 10);
    localStorage.setItem('recentActivities', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save activity:', error);
  }
};

export default RecentActivity;
