import React from 'react';
import { KpiCardProps } from '../../types';
import { motion } from 'framer-motion';

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, icon: Icon, color }) => {
  // Map the incoming color prop to Tailwind classes from your theme
  const colorClasses = {
    primary: 'text-primary shadow-glow-primary border-primary/30',
    accent: 'text-accent shadow-glow-accent border-accent/30',
    danger: 'text-danger shadow-glow-danger border-danger/30',
    blue: 'text-secondary shadow-glow-md border-secondary/30',
  };

  // Use a default if the color prop doesn't match
  const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.primary;

  return (
    <motion.div 
      className={`hologram-card p-6 rounded-xl border ${selectedColor} relative overflow-hidden group hover:scale-105 transition-all duration-300`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className={`p-3 rounded-lg bg-glass border border-border ${selectedColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-sm font-display text-text-muted uppercase tracking-wider">
                {title}
              </div>
            </div>
          </div>
        </div>
        
        <div className={`text-3xl font-mono font-bold ${selectedColor} transition-all duration-300 flex items-baseline`}>
          <span>{value}</span>
          {unit && (
            <span className="text-xl font-mono text-text-muted ml-2">{unit}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KpiCard;