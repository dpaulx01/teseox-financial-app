import React from 'react';
import { BreakEvenAnalysisType, MultiLevelBreakEvenData } from '../../types';
import { useBreakEvenInsights } from '../../hooks/useBreakEvenInsights';
import InsightWrapper from '../insights/InsightWrapper';

interface BreakEvenWithInsightsProps {
  data: any;
  currentMonth: string;
  analysisType: BreakEvenAnalysisType;
  breakEvenResults: MultiLevelBreakEvenData;
  customClassifications: Record<string, string>;
  useCustomClassifications: boolean;
  children: React.ReactNode;
  onInsightAction?: (action: string, params?: any) => void;
}

const BreakEvenWithInsights: React.FC<BreakEvenWithInsightsProps> = ({
  data,
  currentMonth,
  analysisType,
  breakEvenResults,
  customClassifications,
  useCustomClassifications,
  children,
  onInsightAction
}) => {
  // Sistema de insights inteligentes
  const {
    insights,
    getInsightForElement,
    criticalInsights,
    warningInsights,
    infoInsights,
    isLoading: insightsLoading
  } = useBreakEvenInsights({
    financialData: data,
    currentMonth,
    analysisType,
    breakEvenResults,
    classifiedAccounts: Object.entries(customClassifications).reduce((acc, [key, value]) => {
      acc[key] = { type: value, confidence: useCustomClassifications ? 0.9 : 0.5 };
      return acc;
    }, {} as Record<string, { type: string; confidence: number }>),
    enableInsights: true
  });

  // Función para manejar acciones de insights
  const handleInsightAction = (action: string, params?: any) => {
    if (onInsightAction) {
      onInsightAction(action, params);
    } else {
      // Acciones por defecto
      switch (action) {
        case 'navigate':
          if (params?.panel === 'mixed-cost-panel') {
            document.getElementById('mixed-cost-panel')?.scrollIntoView({ behavior: 'smooth' });
          } else if (params?.panel === 'cost-analysis') {
            document.getElementById('account-classification-panel')?.scrollIntoView({ behavior: 'smooth' });
          }
          break;
        default:
          // console.log('Acción de insight:', action, params);
      }
    }
  };

  // Función para envolver elementos con insights
  const withInsight = (elementId: string, children: React.ReactNode, position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => {
    const insight = getInsightForElement(elementId);
    
    if (!insight) {
      return <>{children}</>;
    }

    return (
      <InsightWrapper
        insight={insight}
        position={position}
        onAction={handleInsightAction}
      >
        {children}
      </InsightWrapper>
    );
  };

  // Renderizar panel de insights críticos (si existen)
  const criticalInsightsPanel = criticalInsights.length > 0 && (
    <div className="mb-6">
      <div className="hologram-card p-4 rounded-xl border-2 border-danger/50 bg-danger/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-danger/20 border border-danger/30">
            <span className="text-danger">⚠️</span>
          </div>
          <div>
            <h3 className="font-display text-danger font-bold">
              Alertas Críticas Detectadas
            </h3>
            <p className="text-text-muted text-sm">
              {criticalInsights.length} problema(s) crítico(s) requieren atención inmediata
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {criticalInsights.map((insight) => (
            <div key={insight.id} className="p-3 bg-danger/5 rounded-lg border border-danger/20">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-display text-sm text-danger font-bold mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-text-secondary text-sm mb-2">
                    {insight.message}
                  </p>
                  {insight.suggestedAction && (
                    <button
                      onClick={() => handleInsightAction(insight.suggestedAction!.action, insight.suggestedAction!.params)}
                      className="text-xs px-3 py-1 rounded bg-danger/20 hover:bg-danger/30 text-danger transition-colors"
                    >
                      {insight.suggestedAction.label}
                    </button>
                  )}
                </div>
                <div className="text-xs font-mono text-text-dim">
                  {(insight.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Renderizar panel de insights de advertencia (si existen y no hay críticos)
  const warningInsightsPanel = warningInsights.length > 0 && criticalInsights.length === 0 && (
    <div className="mb-6">
      <div className="hologram-card p-4 rounded-xl border border-warning/50 bg-warning/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
            <span className="text-warning">💡</span>
          </div>
          <div>
            <h3 className="font-display text-warning font-bold">
              Oportunidades de Mejora
            </h3>
            <p className="text-text-muted text-sm">
              {warningInsights.length} insight(s) para optimizar tu análisis
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          {warningInsights.slice(0, 2).map((insight) => (
            <div key={insight.id} className="flex justify-between items-center p-2 bg-warning/5 rounded border border-warning/10">
              <span className="text-sm text-text-secondary">{insight.title}</span>
              {insight.suggestedAction && (
                <button
                  onClick={() => handleInsightAction(insight.suggestedAction!.action, insight.suggestedAction!.params)}
                  className="text-xs px-2 py-1 rounded bg-warning/20 hover:bg-warning/30 text-warning transition-colors"
                >
                  {insight.suggestedAction.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Insights críticos y de advertencia */}
      {criticalInsightsPanel}
      {warningInsightsPanel}
      
      {/* Contenido principal con insights contextuales */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Buscar elementos con IDs específicos para agregar insights
          const elementId = child.props?.id || child.props?.['data-insight-target'];
          
          if (elementId) {
            return withInsight(elementId, child);
          }
        }
        return child;
      })}
      
      {/* Debug info (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 p-2 bg-dark-card rounded border border-primary/30 text-xs font-mono">
          <div className="text-primary">Insights: {insights.length}</div>
          <div className="text-danger">Críticos: {criticalInsights.length}</div>
          <div className="text-warning">Advertencias: {warningInsights.length}</div>
          <div className="text-info">Info: {infoInsights.length}</div>
        </div>
      )}
    </div>
  );
};

export default BreakEvenWithInsights;