/**
 * KPICardGerencial - Card de KPI estilo presentación gerencial
 * Diseño: Valor grande, label descriptivo, borde izquierdo de color
 */
import React from 'react';
import { motion } from 'framer-motion';

interface KPICardGerencialProps {
  value: string | number;
  label: string;
  subtitle?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const colorClasses = {
  primary: {
    border: 'border-l-cyan-500',
    bg: 'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.5)]',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600'
  },
  accent: {
    border: 'border-l-purple-500',
    bg: 'bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600'
  },
  success: {
    border: 'border-l-emerald-500',
    bg: 'bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.5)]',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600'
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600'
  },
  danger: {
    border: 'border-l-red-500',
    bg: 'bg-gradient-to-br from-red-500/20 via-rose-500/10 to-transparent',
    text: 'text-red-400',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-600'
  }
};

export default function KPICardGerencial({
  value,
  label,
  subtitle,
  color = 'primary',
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
      whileHover={{ scale: 1.03, y: -5 }}
      className={`
        relative overflow-hidden rounded-2xl border-l-[8px] ${colors.border}
        bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90
        backdrop-blur-xl shadow-2xl ${colors.glow}
        transition-all duration-300 group
      `}
    >
      {/* Gradiente de fondo animado */}
      <div className={`absolute inset-0 ${colors.bg} opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />

      {/* Efecto de brillo superior */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Contenido */}
      <div className="relative p-6 text-center">
        {/* Icono con fondo de gradiente */}
        {icon && (
          <div className="mb-4 flex justify-center">
            <div className={`p-3 rounded-xl ${colors.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <div className="text-white">
                {icon}
              </div>
            </div>
          </div>
        )}

        {/* Valor principal */}
        {loading ? (
          <div className="animate-pulse">
            <div className="mx-auto h-14 w-40 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg mb-4" />
            <div className="mx-auto h-5 w-28 bg-slate-700/40 rounded" />
          </div>
        ) : (
          <>
            <motion.div
              className={`
                text-6xl font-black tracking-tight ${colors.text}
                mb-3 transition-all duration-300
                drop-shadow-[0_0_15px_currentColor]
              `}
              whileHover={{ scale: 1.05 }}
            >
              {value}
            </motion.div>

            {/* Trend indicator */}
            {trend && (
              <div className={`
                inline-flex items-center gap-1.5 text-base font-bold mb-3 px-3 py-1 rounded-full
                ${trend.isPositive
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                }
              `}>
                <span className="text-lg">{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}

            {/* Label */}
            <div className="text-lg font-bold text-slate-200 uppercase tracking-wider mb-1">
              {label}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <div className="mt-2 text-sm text-slate-400 font-medium">
                {subtitle}
              </div>
            )}
          </>
        )}
      </div>

      {/* Efecto de brillo inferior con gradiente */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${colors.iconBg} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Partículas decorativas */}
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors duration-300" />
      <div className="absolute bottom-6 left-6 w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors duration-300" />
    </motion.div>
  );
}
