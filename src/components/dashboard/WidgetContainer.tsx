// Contenedor base para todos los widgets del dashboard
import React, { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreHorizontal, 
  X,
  Expand,
  Settings,
  Copy,
  Lock,
  Unlock
} from 'lucide-react';
import { WidgetConfig } from '../../types/dashboard';
import { useDashboard } from '../../contexts/DashboardContext';

interface WidgetContainerProps {
  widget: WidgetConfig;
  children: ReactNode;
  onSettingsClick?: () => void;
  className?: string;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  children,
  onSettingsClick,
  className = ''
}) => {
  const { isEditMode, removeWidget, duplicateWidget, updateWidget } = useDashboard();
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleLock = () => {
    updateWidget(widget.id, { isLocked: !widget.isLocked });
  };

  const handleToggleVisibility = () => {
    updateWidget(widget.id, { isVisible: !widget.isVisible });
  };

  const handleDuplicate = () => {
    duplicateWidget(widget.id);
    setShowMenu(false);
  };

  const handleRemove = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este widget?')) {
      removeWidget(widget.id);
    }
    setShowMenu(false);
  };

  if (!widget.isVisible) {
    return null;
  }

  return (
    <motion.div
      className={`
        relative hologram-card rounded-lg backdrop-blur-md
        ${widget.isLocked ? 'border-yellow-500/50' : 'border-purple-500/30'}
        transition-all duration-300 overflow-hidden group
        ${isHovered ? 'shadow-glow-lg' : 'shadow-hologram'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Widget Header */}
      {(isEditMode || isHovered) && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-slate-900/90 to-purple-900/90 backdrop-blur-sm p-2 border-b border-purple-500/30"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {widget.isLocked && (
                <Lock className="h-4 w-4 text-yellow-400" />
              )}
              <h3 className="text-sm font-semibold text-white truncate">
                {widget.title}
              </h3>
            </div>
            
            {isEditMode && (
              <div className="flex items-center space-x-1 relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-300" />
                </button>

                {/* Widget Menu */}
                {showMenu && (
                  <motion.div
                    className="absolute top-8 right-0 bg-slate-900/95 backdrop-blur-md rounded-lg border border-purple-500/30 shadow-glow-lg z-30 min-w-48"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <div className="p-2">
                      {/* Settings */}
                      {onSettingsClick && (
                        <button
                          onClick={() => { onSettingsClick(); setShowMenu(false); }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-purple-500/20 rounded transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configurar</span>
                        </button>
                      )}

                      {/* Lock/Unlock */}
                      <button
                        onClick={handleToggleLock}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-purple-500/20 rounded transition-colors"
                      >
                        {widget.isLocked ? (
                          <>
                            <Unlock className="h-4 w-4" />
                            <span>Desbloquear</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>Bloquear</span>
                          </>
                        )}
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={handleDuplicate}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-purple-500/20 rounded transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Duplicar</span>
                      </button>

                      <hr className="my-1 border-purple-500/30" />

                      {/* Remove */}
                      <button
                        onClick={handleRemove}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Widget Content */}
      <div className={`h-full ${isEditMode || isHovered ? 'pt-12' : ''} p-4`}>
        {children}
      </div>

      {/* Resize Handle */}
      {isEditMode && !widget.isLocked && (
        <div className="absolute bottom-2 right-2 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity">
          <Expand className="h-4 w-4 text-purple-400" />
        </div>
      )}

      {/* Glow Effect on Hover */}
      {isHovered && (
        <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default WidgetContainer;