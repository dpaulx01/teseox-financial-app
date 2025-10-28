/**
 * KPICardGerencial - Card de KPI estilo presentación gerencial
 * Diseño profesional con soporte dual-theme (light/dark)
 */
import React from 'react';
import { motion } from 'framer-motion';

interface KPICardGerencialProps {
  value: string | number;
  label: string;
  subtitle?: string;
  color?: 'emerald' | 'sky' | 'amber' | 'rose' | 'purple';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const colorClasses = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30'
  },
  sky: {
    text: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/30'
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30'
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30'
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30'
  }
};

export default function KPICardGerencial({
  value,
  label,
  subtitle,
  color = 'sky',
  icon,
  trend,
  loading = false
}: KPICardGerencialProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/60 bg-dark-card/60 p-4 shadow-inner hover:shadow-lg transition-all duration-300"
    >
      {/* Icon */}
      {icon && (
        <div className={`mb-2 flex items-center justify-center w-10 h-10 rounded-lg ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
      )}

      {/* Valor principal */}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 w-24 bg-text-muted/20 rounded mb-2" />
          <div className="h-4 w-32 bg-text-muted/20 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-1">
            <p className={`text-3xl font-bold ${colors.text}`}>
              {value}
            </p>
            {/* Trend indicator */}
            {trend && (
              <div className={`text-xs font-semibold ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          {/* Label */}
          <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">
            {label}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p className="mt-1 text-xs text-text-muted">
              {subtitle}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
