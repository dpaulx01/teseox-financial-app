import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, Settings, Database, Info, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { MixedCost, FinancialData } from '../../types';
import { MixedCostAnalyzer } from '../../utils/mixedCostAnalyzer';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { log } from '../../utils/logger';

interface MixedCostPanelProps {
  mixedAccounts: Array<{ code: string; name: string; value: number }>; // Cuentas ya clasificadas como mixtas
  onMixedCostsAnalysis?: (analysis: { totalFixed: number; totalVariable: number; adjustedCosts: MixedCost[] }) => void;
  totalRevenue: number;
  totalUnits: number;
  financialData?: FinancialData; // Datos financieros para análisis inteligente
  currentMonth?: string; // Período actual para análisis contextual
  allMixAccounts?: Array<{ code: string; name: string; value: number }>; // TODAS las cuentas MIX detectadas por IA
  className?: string;
}

// Componente memoizado para items individuales
const MixedCostAccountItem = React.memo<{
  account: { code: string; name: string; value: number };
  settings: any;
  updateMixedCostSetting: (code: string, field: string, value: any) => void;
  totalRevenue: number;
  totalUnits: number;
}>(({ account, settings, updateMixedCostSetting, totalRevenue, totalUnits }) => {
  // Función de validación y ajuste inteligente con cálculo automático
  const handleValueChange = useCallback((field: 'fixedComponent' | 'variableAmount', newValue: number) => {
    if (settings.inputMode === 'manual') {
      const maxAllowed = account.value;
      
      if (field === 'fixedComponent') {
        // Validar que no exceda el máximo
        const validatedFixed = Math.min(Math.max(0, newValue), maxAllowed);
        updateMixedCostSetting(account.code, 'fixedComponent', validatedFixed);
        
        // CALCULAR AUTOMÁTICAMENTE la diferencia para el componente variable
        const remainingForVariable = Math.max(0, maxAllowed - validatedFixed);
        updateMixedCostSetting(account.code, 'variableAmount', remainingForVariable);
        
      } else if (field === 'variableAmount') {
        // Validar que no exceda el máximo
        const validatedVariable = Math.min(Math.max(0, newValue), maxAllowed);
        updateMixedCostSetting(account.code, 'variableAmount', validatedVariable);
        
        // CALCULAR AUTOMÁTICAMENTE la diferencia para el componente fijo
        const remainingForFixed = Math.max(0, maxAllowed - validatedVariable);
        updateMixedCostSetting(account.code, 'fixedComponent', remainingForFixed);
      }
    } else {
      // Modo automático - sin validación especial
      updateMixedCostSetting(account.code, field, newValue);
    }
  }, [account.code, account.value, settings, updateMixedCostSetting]);

  // Cálculo del componente variable
  let variableComponent = 0;
  if (settings.inputMode === 'manual') {
    variableComponent = settings.variableAmount || 0;
  } else {
    if (settings.baseMeasure === 'revenue') {
      variableComponent = totalRevenue * (settings.variableRate / 100);
    } else {
      variableComponent = totalUnits * settings.variableRate;
    }
  }

  // Ajuste automático solo en modo automático
  const calculatedTotal = settings.fixedComponent + variableComponent;
  const difference = account.value - calculatedTotal;
  
  let adjustedFixedComponent = settings.fixedComponent;
  let adjustedVariableComponent = variableComponent;
  
  if ((settings.inputMode || 'auto') === 'auto' && Math.abs(difference) < 10 && Math.abs(difference) > 0.01) {
    if (calculatedTotal > 0) {
      const fixedRatio = settings.fixedComponent / calculatedTotal;
      const variableRatio = variableComponent / calculatedTotal;
      adjustedFixedComponent = settings.fixedComponent + (difference * fixedRatio);
      adjustedVariableComponent = variableComponent + (difference * variableRatio);
    } else {
      adjustedFixedComponent = account.value;
      adjustedVariableComponent = 0;
    }
  }

  // Validación visual para modo manual
  const isOverLimit = (settings.inputMode === 'manual') && 
                     (settings.fixedComponent + (settings.variableAmount || 0)) > account.value;
  const totalCalculated = adjustedFixedComponent + adjustedVariableComponent;

  return (
    <motion.div
      layout
      className="glass-card p-4 rounded-lg border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-display text-text-secondary">
            {account.name}
          </div>
          <span className="text-xs text-text-dim bg-glass px-2 py-1 rounded">
            {account.code}
          </span>
        </div>
        <div className="text-sm text-text-muted">
          Total: {formatCurrency(account.value)}
        </div>
      </div>
    
      {/* Selector de Modo */}
      <div className="mb-4">
        <label className="text-xs text-text-dim uppercase tracking-wider mb-2 block">Modo de Configuración</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateMixedCostSetting(account.code, 'inputMode', 'auto')}
            className={`px-3 py-1 text-xs rounded border transition-all ${
              (settings.inputMode || 'auto') === 'auto'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-glass border-border text-text-muted hover:border-primary/30'
            }`}
          >
            🤖 Automático (IA)
          </button>
          <button
            onClick={() => updateMixedCostSetting(account.code, 'inputMode', 'manual')}
            className={`px-3 py-1 text-xs rounded border transition-all ${
              (settings.inputMode || 'auto') === 'manual'
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-glass border-border text-text-muted hover:border-accent/30'
            }`}
          >
            ✏️ Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-text-dim uppercase tracking-wider">
            Componente Fijo
            {(settings.inputMode === 'manual') && (
              <span className="text-xs text-text-dim ml-1">
                (máx: {formatCurrency(Math.max(0, account.value - (settings.variableAmount || 0)))})
              </span>
            )}
          </label>
          <input
            type="number"
            value={settings.fixedComponent}
            onChange={(e) => handleValueChange('fixedComponent', Number(e.target.value))}
            disabled={(settings.inputMode || 'auto') === 'auto'}
            className={`w-full p-2 rounded border focus:outline-none transition-colors ${
              (settings.inputMode || 'auto') === 'auto' 
                ? 'bg-glass/50 border-border/50 text-text-dim cursor-not-allowed'
                : `bg-glass text-text-secondary ${
                    isOverLimit ? 'border-danger focus:border-danger' : 'border-border focus:border-warning'
                  }`
            }`}
            min="0"
            max={settings.inputMode === 'manual' ? account.value : undefined}
            step="0.01"
          />
        </div>
        
        {(settings.inputMode || 'auto') === 'manual' ? (
          <div>
            <label className="text-xs text-text-dim uppercase tracking-wider">
              Componente Variable ($)
              <span className="text-xs text-text-dim ml-1">
                (máx: {formatCurrency(Math.max(0, account.value - settings.fixedComponent))})
              </span>
            </label>
            <input
              type="number"
              value={settings.variableAmount || 0}
              onChange={(e) => handleValueChange('variableAmount', Number(e.target.value))}
              className={`w-full p-2 bg-glass rounded border focus:outline-none text-text-secondary transition-colors ${
                isOverLimit ? 'border-danger focus:border-danger' : 'border-accent focus:border-accent'
              }`}
              min="0"
              max={Math.max(0, account.value - settings.fixedComponent)}
              step="0.01"
              placeholder="Valor directo en $"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-text-dim uppercase tracking-wider">Tasa Variable</label>
              <input
                type="number"
                value={settings.variableRate}
                onChange={(e) => updateMixedCostSetting(account.code, 'variableRate', Number(e.target.value))}
                disabled
                className="w-full p-2 bg-glass/50 rounded border border-border/50 focus:border-warning outline-none text-text-dim cursor-not-allowed"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="text-xs text-text-dim uppercase tracking-wider">Base Variable</label>
              <select
                value={settings.baseMeasure}
                onChange={(e) => updateMixedCostSetting(account.code, 'baseMeasure', e.target.value as 'units' | 'revenue')}
                disabled
                className="w-full p-2 bg-glass/50 rounded border border-border/50 focus:border-warning outline-none text-text-dim cursor-not-allowed"
              >
                <option value="revenue">% Ingresos</option>
                <option value="units">Por Unidad</option>
              </select>
            </div>
          </>
        )}
        
        <div>
          <label className="text-xs text-text-dim uppercase tracking-wider">
            Costo Calculado
            {(settings.inputMode === 'manual') && (
              <span className={`text-xs ml-1 ${
                Math.abs(totalCalculated - account.value) < 0.01 ? 'text-success' : 
                totalCalculated > account.value ? 'text-danger' : 'text-warning'
              }`}>
                {Math.abs(totalCalculated - account.value) < 0.01 ? '✓ Exacto' : 
                 totalCalculated > account.value ? '⚠ Excede' : '⚠ Faltante'}
              </span>
            )}
          </label>
          <div className={`p-2 bg-glass/50 rounded border text-center font-mono transition-colors ${
            (settings.inputMode === 'manual') ? 
              (Math.abs(totalCalculated - account.value) < 0.01 ? 'text-success border-success/30' : 
               totalCalculated > account.value ? 'text-danger border-danger/30' : 'text-warning border-warning/30')
              : 'text-warning border-border'
          }`}>
            {formatCurrency(totalCalculated)}
          </div>
        </div>
      </div>
    
      {/* Mensaje de validación en modo manual */}
      {(settings.inputMode === 'manual') && isOverLimit && (
        <div className="mt-3 p-2 bg-danger/10 rounded border border-danger/30">
          <div className="text-xs text-danger flex items-center gap-1">
            <span>⚠️</span>
            <strong>Suma excede el total:</strong> Los componentes fijo + variable no pueden sumar más de {formatCurrency(account.value)}
          </div>
        </div>
      )}

      {/* Desglose del cálculo */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="text-xs text-text-muted">
          <span className="font-mono">
            {formatCurrency(adjustedFixedComponent)} (fijo) + {' '}
            {(settings.inputMode || 'auto') === 'manual' ? 
              `${formatCurrency(settings.variableAmount || 0)} (variable directo)` :
              settings.baseMeasure === 'revenue' ? 
                `${formatCurrency(totalRevenue)} × ${settings.variableRate}%` :
                `${totalUnits.toLocaleString()} unidades × ${formatCurrency(settings.variableRate)}`
            } = {formatCurrency(totalCalculated)}
          </span>
        </div>
        <div className="text-xs text-text-dim mt-1">
          Diferencia vs total actual: {formatCurrency(totalCalculated - account.value)}
          {Math.abs(totalCalculated - account.value) < 0.01 && 
            <span className="ml-2 text-success">✓ Exacto</span>
          }
        </div>
      </div>
    </motion.div>
  );
});

const MixedCostPanel: React.FC<MixedCostPanelProps> = ({
  mixedAccounts,
  onMixedCostsAnalysis,
  totalRevenue,
  totalUnits,
  financialData,
  currentMonth = 'Anual',
  allMixAccounts = [],
  className = ''
}) => {
  const { updateMixedCosts } = useMixedCosts();
  const [isOpen, setIsOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [lastReanalysisTime, setLastReanalysisTime] = useState<Date | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [mixedCostSettings, setMixedCostSettings] = useState<Record<string, {
    fixedComponent: number;
    variableRate: number;
    baseMeasure: 'units' | 'revenue';
    inputMode: 'auto' | 'manual';
    variableAmount: number;
  }>>({});
  const [filteredAccounts, setFilteredAccounts] = useState<Array<{
    code: string;
    name: string;
    value: number;
    reason: string;
    confidence: string;
  }>>([]);

  // Ejecutar análisis automático cuando lleguen cuentas mixtas
  useEffect(() => {
    log.debug('MixedCostPanel', 'Mixed accounts received:', mixedAccounts);
    log.debug('MixedCostPanel', 'Financial data available:', financialData ? 'YES' : 'NO');
    log.debug('MixedCostPanel', 'Total revenue:', totalRevenue);
    log.debug('MixedCostPanel', 'Current month:', currentMonth);
    
    try {
      const saved = localStorage.getItem('artyco-mixed-cost-settings');
      if (saved) {
        const savedSettings = JSON.parse(saved);
        log.debug('MixedCostPanel', 'Found saved settings:', savedSettings);
        
        // VERIFICAR que los settings guardados sean relevantes para las cuentas actuales
        const relevantSettings: typeof mixedCostSettings = {};
        let hasRelevantSettings = false;
        
        mixedAccounts.forEach(account => {
          if (savedSettings[account.code]) {
            relevantSettings[account.code] = savedSettings[account.code];
            hasRelevantSettings = true;
          }
        });
        
        if (hasRelevantSettings) {
          log.info('MixedCostPanel', 'Using saved relevant settings:', relevantSettings);
          setMixedCostSettings(relevantSettings);
          return; // Si hay settings relevantes, usarlos
        } else {
          console.log(`🗑️ [Mixed Cost Panel Debug] No relevant settings found, clearing localStorage`);
          localStorage.removeItem('artyco-mixed-cost-settings');
        }
      }
    } catch (error) {
      console.log(`❌ [Mixed Cost Panel Debug] Error loading settings:`, error);
      localStorage.removeItem('artyco-mixed-cost-settings');
    }
    
    // Solo si NO hay settings guardados relevantes, hacer análisis automático
    const newSettings: typeof mixedCostSettings = {};
    const analyzer = financialData ? new MixedCostAnalyzer(financialData, currentMonth) : null;
    log.debug('MixedCostPanel', 'Analyzer created:', analyzer ? 'YES' : 'NO');
    
    // SOLO configurar cuentas que realmente necesitan análisis de costos mixtos
    // Las cuentas MIX que deberían ser CFT no se auto-configuran
    mixedAccounts.forEach(account => {
      log.debug('MixedCostPanel', `Processing account: ${account.code} - ${account.name}`);
      
      if (!mixedCostSettings[account.code]) {
        // Solo auto-configurar si el análisis inteligente da confianza alta/media
        if (analyzer) {
          console.log(`⚗️ [Mixed Cost Panel Debug] Running analysis for ${account.name}...`);
          const analysis = analyzer.analyzeMixedCost(account.code, account.name, account.value);
          console.log(`⚗️ [Mixed Cost Panel Debug] Analysis result for ${account.name}:`, analysis);
          
          if (analysis && analysis.confidence === 'high') {
            console.log(`✅ [Mixed Cost Panel Debug] High confidence analysis for ${account.name}, auto-configuring`);
            // Usar resultados del análisis inteligente SOLO si tiene alta confianza
            newSettings[account.code] = {
              fixedComponent: analysis.fixedComponent,
              variableRate: analysis.variableRate * 100, // Convertir a porcentaje para UI
              baseMeasure: 'revenue',
              inputMode: 'auto',
              variableAmount: 0
            };
          } else {
            console.log(`❌ [Mixed Cost Panel Debug] Low/medium confidence for ${account.name}, treating as CFT`);
            // NO auto-configurar cuentas con baja/media confianza
            // Estas se tratarán como CFT automáticamente en el motor de cálculo
          }
        } else {
          console.log(`❌ [Mixed Cost Panel Debug] No analyzer available for ${account.name}`);
        }
        // Sin datos financieros - NO auto-configurar, dejar que sea CFT
      } else {
        console.log(`💾 [Mixed Cost Panel Debug] Using existing settings for ${account.name}`);
        // Mantener configuración existente
        newSettings[account.code] = mixedCostSettings[account.code];
      }
    });
    
    // Solo actualizar si realmente hay cambios en las configuraciones
    const hasChanges = mixedAccounts.some(account => !mixedCostSettings[account.code] && newSettings[account.code]) ||
                      Object.keys(mixedCostSettings).some(code => !mixedAccounts.some(acc => acc.code === code));
    
    if (hasChanges) {
      setMixedCostSettings(newSettings);
    }
  }, [mixedAccounts.length, financialData]); // Ejecutar cuando cambien las cuentas mixtas o lleguen datos

  // Calcular el análisis de costos mixtos
  const mixedCostAnalysis = useMemo(() => {

    const adjustedCosts: MixedCost[] = [];
    let totalFixed = 0;
    let totalVariable = 0;

    mixedAccounts.forEach(account => {
      let settings = mixedCostSettings[account.code];
      
      if (settings) {
        let variableComponent = 0;
        
        if (settings.inputMode === 'manual') {
          // Modo manual: usar valor monetario directo
          variableComponent = settings.variableAmount || 0;
        } else {
          // Modo automático: calcular basado en tasa
          if (settings.baseMeasure === 'revenue') {
            variableComponent = totalRevenue * (settings.variableRate / 100);
          } else {
            variableComponent = totalUnits * settings.variableRate;
          }
        }

        // AJUSTE AUTOMÁTICO: Eliminar diferencias pequeñas
        const calculatedTotal = settings.fixedComponent + variableComponent;
        const difference = account.value - calculatedTotal;
        
        
        // Si la diferencia es menor a $10, ajustar para exactitud
        let adjustedFixedComponent = settings.fixedComponent;
        let adjustedVariableComponent = variableComponent;
        
        if (Math.abs(difference) < 10 && Math.abs(difference) > 0.01) {
          // Distribuir la diferencia proporcionalmente
          if (calculatedTotal > 0) {
            const fixedRatio = settings.fixedComponent / calculatedTotal;
            const variableRatio = variableComponent / calculatedTotal;
            
            adjustedFixedComponent = settings.fixedComponent + (difference * fixedRatio);
            adjustedVariableComponent = variableComponent + (difference * variableRatio);
          } else {
            // Si no hay total calculado, asignar toda la diferencia al componente fijo
            adjustedFixedComponent = account.value;
            adjustedVariableComponent = 0;
          }
        }

        const mixedCost: MixedCost = {
          accountCode: account.code,
          accountName: account.name,
          fixedComponent: adjustedFixedComponent,
          variableRate: settings.variableRate,
          baseMeasure: settings.baseMeasure,
          totalValue: adjustedFixedComponent + adjustedVariableComponent,
          isActive: true,
          inputMode: settings.inputMode || 'auto',
          variableAmount: settings.variableAmount || 0
        };

        adjustedCosts.push(mixedCost);
        totalFixed += adjustedFixedComponent;
        totalVariable += adjustedVariableComponent;
      }
    });


    return { totalFixed, totalVariable, adjustedCosts };
  }, [mixedAccounts, mixedCostSettings, totalRevenue, totalUnits]);

  // Notificar cambios al componente padre y actualizar contexto global
  useEffect(() => {
    const expectedMixAccounts = mixedAccounts.length;
    const processedMixAccounts = mixedCostAnalysis.adjustedCosts.length;
    const processedAccountsWithSettings = mixedAccounts.filter(account => mixedCostSettings[account.code]).length;
    
    console.log(`🔗 [Mixed Cost Panel Debug] Notification check:`, {
      expectedMixAccounts,
      processedMixAccounts,
      processedAccountsWithSettings,
      willNotify: true // Siempre notificar para debug
    });
    
    // SIEMPRE notificar - incluso si no hay cuentas o algunas fueron filtradas
    // El cálculo del break-even necesita saber el estado actual, incluso si es "cero costos mixtos"
    
    // Actualizar contexto global con debounce para evitar loops
    const timeoutId = setTimeout(() => {
      updateMixedCosts(mixedCostAnalysis.adjustedCosts);
    }, 100);
    
    // Notificar al componente padre si existe el callback
    if (onMixedCostsAnalysis) {
      log.debug('MixedCostPanel', 'Notifying parent with analysis:', mixedCostAnalysis);
      onMixedCostsAnalysis(mixedCostAnalysis);
    }
    
    return () => clearTimeout(timeoutId);
  }, [mixedCostAnalysis, onMixedCostsAnalysis, updateMixedCosts]); // Depender del análisis completo

  const updateMixedCostSetting = useCallback((accountCode: string, field: keyof typeof mixedCostSettings[string], value: any) => {
    setMixedCostSettings(prev => {
      const newSettings = {
        ...prev,
        [accountCode]: {
          ...prev[accountCode],
          [field]: value
        }
      };
      
      // NO guardar en localStorage - se persiste automáticamente en MySQL
      setLastSaveTime(new Date());
      
      return newSettings;
    });
  }, []);

  const resetToAutoEstimation = async () => {
    setIsReanalyzing(true);
    
    // Simular análisis (para dar tiempo a mostrar el estado)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newSettings: typeof mixedCostSettings = {};
    const newFilteredAccounts: typeof filteredAccounts = [];
    
    // Crear analizador si tenemos datos financieros
    const analyzer = financialData ? new MixedCostAnalyzer(financialData, currentMonth) : null;
    
    // Analizar las cuentas MIX que deben procesarse
    mixedAccounts.forEach(account => {
      if (analyzer) {
        // Usar análisis inteligente
        const analysis = analyzer.analyzeMixedCost(account.code, account.name, account.value);
        
        if (analysis && analysis.confidence === 'high') {
          // SOLO configurar cuentas con alta confianza
          newSettings[account.code] = {
            fixedComponent: analysis.fixedComponent,
            variableRate: analysis.variableRate * 100, // Convertir a porcentaje
            baseMeasure: 'revenue',
            inputMode: 'auto',
            variableAmount: 0
          };
        } else {
          // Para cuentas con confianza media/baja, proporcionar valores por defecto razonables
          // en lugar de filtrarlas completamente
          let defaultFixed = account.value * 0.7; // 70% fijo por defecto
          let defaultVariableRate = totalRevenue > 0 ? 
            (account.value * 0.3) / totalRevenue * 100 : // 30% variable por defecto
            0; // Si no hay ingresos, 0% variable
          
          if (analysis && analysis.confidence === 'medium') {
            // Si hay análisis parcial, usar esos valores aunque sea con confianza media
            defaultFixed = analysis.fixedComponent;
            defaultVariableRate = analysis.variableRate * 100;
          }
          
          newSettings[account.code] = {
            fixedComponent: defaultFixed,
            variableRate: defaultVariableRate,
            baseMeasure: 'revenue',
            inputMode: 'manual', // Modo manual para permitir ajustes
            variableAmount: account.value - defaultFixed
          };
          
          // Registrar la razón pero incluir la cuenta
          let reason = analysis?.confidence === 'medium' ? 
            'Confianza media - recomendado verificar manualmente' :
            'Valores por defecto (70% fijo, 30% variable) - ajustar según necesidad';
          
          newFilteredAccounts.push({
            code: account.code,
            name: account.name,
            value: account.value,
            reason,
            confidence: analysis?.confidence || 'default'
          });
        }
      } else {
        // Sin datos financieros
        newFilteredAccounts.push({
          code: account.code,
          name: account.name,
          value: account.value,
          reason: 'Sin datos financieros para análisis',
          confidence: 'none'
        });
      }
    });
    
    setMixedCostSettings(newSettings);
    setFilteredAccounts(newFilteredAccounts);
    setLastReanalysisTime(new Date());
    setIsReanalyzing(false);
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
          isOpen
            ? 'border-warning/50 bg-warning/10 text-warning shadow-glow-warning'
            : 'border-border hover:border-warning/30 text-text-secondary hover:bg-glass/50'
        }`}
        disabled={mixedAccounts.length === 0}
      >
        <Settings className="w-4 h-4" />
        {isOpen ? 'Cerrar Análisis Mixtos' : 'Análisis Costos Mixtos'}
        {mixedAccounts.length > 0 ? (
          <span className="ml-1 px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">
            {mixedAccounts.length}
          </span>
        ) : (
          <span className="ml-1 px-2 py-1 rounded-full text-xs bg-glass/20 text-text-dim">
            0
          </span>
        )}
      </button>

      {mixedAccounts.length === 0 && (
        <div className="mt-2 p-3 glass-card rounded-lg border border-info/30 bg-info/10">
          <div className="flex items-center gap-2 text-info text-sm">
            <Info className="w-4 h-4" />
            No hay cuentas clasificadas como mixtas. Ve a "Configurar Cuentas" para agregar clasificaciones.
          </div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 hologram-card rounded-xl border border-warning/30 bg-warning/5 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
                    <Calculator className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-warning">
                      Costos Mixtos/Semivariables
                    </h3>
                    <p className="text-sm text-text-muted">
                      Costos con componente fijo + variable
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetToAutoEstimation}
                    disabled={isReanalyzing}
                    className={`px-3 py-1 text-xs rounded-lg border transition-all duration-200 ${
                      isReanalyzing 
                        ? 'bg-accent/20 border-accent/50 text-accent cursor-wait'
                        : 'bg-glass border-border hover:border-primary/30 text-text-secondary'
                    }`}
                    title={financialData ? "Re-aplicar análisis IA completo" : "Limpiar configuraciones"}
                  >
                    {isReanalyzing ? (
                      <>
                        <div className="w-3 h-3 mr-1 inline-block animate-spin rounded-full border border-accent border-t-transparent" />
                        Analizando...
                      </>
                    ) : financialData ? (
                      <>
                        <Settings className="w-3 h-3 mr-1 inline" />
                        {lastReanalysisTime ? '✅ Re-analizar' : 'Re-analizar IA'}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 mr-1 inline" />
                        Reset
                      </>
                    )}
                  </button>
                  <div className="flex flex-col gap-1">
                    {lastReanalysisTime && (
                      <div className="text-xs text-accent">
                        Último análisis: {lastReanalysisTime.toLocaleTimeString()}
                      </div>
                    )}
                    {lastSaveTime && (
                      <div className="text-xs text-success flex items-center gap-1">
                        <span>💾</span>
                        Guardado: {lastSaveTime.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 glass-card rounded-lg">
                  <div className="text-lg font-mono text-warning">
                    {formatCurrency(mixedCostAnalysis.totalFixed)}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Componente Fijo</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg">
                  <div className="text-lg font-mono text-accent">
                    {formatCurrency(mixedCostAnalysis.totalVariable)}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Componente Variable</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-warning/30">
                  <div className="text-lg font-mono text-warning">
                    {formatCurrency(mixedCostAnalysis.totalFixed + mixedCostAnalysis.totalVariable)}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Total Mixto</div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg">
                  <div className="text-lg font-mono text-primary">
                    {mixedAccounts.length}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Cuentas Mixtas</div>
                </div>
              </div>


              {/* Información sobre datos */}
              <div className="mb-4 p-3 glass-card rounded-lg border border-info/30 bg-info/10">
                <div className="flex items-center gap-2 text-info text-sm">
                  <Database className="w-4 h-4" />
                  Basado en ingresos: {formatCurrency(totalRevenue)} | Unidades: {totalUnits > 0 ? totalUnits.toLocaleString() : 'Estimadas*'}
                </div>
                {totalUnits === 0 && (
                  <div className="text-xs text-warning mt-1">
                    * Usando datos de producción estimados. Para mayor precisión, configure los datos reales en Configuración de Datos.
                  </div>
                )}
              </div>

              {/* Cuentas Filtradas */}
              {filteredAccounts.length > 0 && (
                <div className="mb-6 p-4 glass-card rounded-lg border border-warning/30 bg-warning/5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <h4 className="text-lg font-display text-warning">
                      🔍 Cuentas MIX Filtradas ({filteredAccounts.length})
                    </h4>
                  </div>
                  <div className="text-sm text-text-muted mb-3">
                    Estas cuentas fueron clasificadas como MIX por la IA pero no pasaron el análisis estadístico. Se tratan automáticamente como <strong>Costos Fijos (CFT)</strong>:
                  </div>
                  <div className="space-y-2">
                    {filteredAccounts.map((account, index) => (
                      <div key={index} className="p-3 bg-glass/30 rounded border border-warning/20">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-mono text-sm text-warning">
                            {account.code} - {account.name}
                          </div>
                          <div className="font-mono text-sm text-text-muted">
                            {formatCurrency(account.value)}
                          </div>
                        </div>
                        <div className="text-xs text-text-dim">
                          <span className={`px-2 py-1 rounded text-xs ${
                            account.confidence === 'medium' ? 'bg-warning/20 text-warning' :
                            account.confidence === 'low' ? 'bg-danger/20 text-danger' :
                            'bg-gray/20 text-gray'
                          }`}>
                            Confianza: {account.confidence === 'medium' ? 'Media' : account.confidence === 'low' ? 'Baja' : 'N/A'}
                          </span>
                          <span className="ml-2">{account.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-info/10 rounded border border-info/20 text-xs text-info">
                    💡 <strong>Comportamiento del Sistema:</strong> Estas cuentas se incluyen automáticamente en CFT para mantener cálculos conservadores. Puedes configurarlas manualmente si consideras que son verdaderamente mixtas.
                  </div>
                </div>
              )}

              {/* Lista de Costos Mixtos Procesados */}
              <div className="space-y-4">
                <h4 className="text-sm font-display text-accent flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  ✅ Cuentas MIX Procesadas ({mixedAccounts.filter(account => mixedCostSettings[account.code]).length})
                </h4>
                {mixedAccounts.filter(account => mixedCostSettings[account.code]).length === 0 ? (
                  <div className="p-4 glass-card rounded-lg border border-info/30 bg-info/10 text-center">
                    <div className="text-info text-sm">
                      No hay cuentas MIX con alta confianza estadística para procesar.
                    </div>
                    {allMixAccounts.length > 0 && (
                      <div className="text-xs text-text-muted mt-2">
                        {allMixAccounts.length} cuentas MIX detectadas por IA están siendo tratadas como CFT.
                      </div>
                    )}
                  </div>
                ) : (
                  mixedAccounts.filter(account => mixedCostSettings[account.code]).map((account) => (
                    <MixedCostAccountItem
                      key={account.code}
                      account={account}
                      settings={mixedCostSettings[account.code] || { fixedComponent: 0, variableRate: 0, baseMeasure: 'revenue' as const, inputMode: 'auto', variableAmount: 0 }}
                      updateMixedCostSetting={updateMixedCostSetting}
                      totalRevenue={totalRevenue}
                      totalUnits={totalUnits}
                    />
                  ))
                )}
              </div>

              {/* Información y Tips */}
              <div className="mt-6 p-4 glass-card rounded-lg border border-info/30 bg-info/10">
                <h4 className="text-sm font-display text-info mb-2">💡 Sobre Costos Mixtos</h4>
                <div className="space-y-1 text-xs text-text-muted">
                  <div>• <strong>Componente Fijo:</strong> Cantidad que no varía con el volumen (ej: cuota básica de servicios)</div>
                  <div>• <strong>Componente Variable:</strong> Parte que cambia según ingresos o unidades vendidas</div>
                  <div>• <strong>Ejemplos típicos:</strong> Servicios públicos, comisiones, mantenimiento, telecomunicaciones</div>
                  <div>• <strong>Método Alto-Bajo:</strong> Para separar componentes, usa datos de períodos con alto y bajo volumen</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MixedCostPanel;