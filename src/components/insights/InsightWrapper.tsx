import React from 'react';
import { AnimatePresence } from 'framer-motion';
import InsightBubble from './InsightBubble';
import { SimpleInsight } from '../../modules/breakEvenAnalysis/intelligence/simpleInsightEngine';

interface InsightWrapperProps {
  children: React.ReactNode;
  insight?: SimpleInsight;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onAction?: (action: string, params?: any) => void;
  className?: string;
}

const InsightWrapper: React.FC<InsightWrapperProps> = ({
  children,
  insight,
  position = 'top-right',
  onAction,
  className = ''
}) => {
  if (!insight) {
    return <>{children}</>;
  }

  // Calcular posición del bubble
  const getBubblePositionClass = () => {
    switch (position) {
      case 'top-right':
        return 'absolute -top-2 -right-2';
      case 'top-left':
        return 'absolute -top-2 -left-2';
      case 'bottom-right':
        return 'absolute -bottom-2 -right-2';
      case 'bottom-left':
        return 'absolute -bottom-2 -left-2';
      default:
        return 'absolute -top-2 -right-2';
    }
  };

  // Determinar la posición del tooltip basada en la posición del bubble
  const getTooltipPosition = () => {
    switch (position) {
      case 'top-right':
        return 'bottom';
      case 'top-left':
        return 'bottom';
      case 'bottom-right':
        return 'top';
      case 'bottom-left':
        return 'top';
      default:
        return 'bottom';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {children}
      <AnimatePresence>
        <InsightBubble
          insight={insight}
          position={getTooltipPosition()}
          onAction={onAction}
          className={getBubblePositionClass()}
        />
      </AnimatePresence>
    </div>
  );
};

export default InsightWrapper;