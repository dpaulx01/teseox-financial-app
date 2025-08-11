import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Settings, 
  Factory, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Save,
  Trash2,
  Download,
  Database,
  Calculator,
  Target,
  Wand2,
  BarChart3,
  Eye,
  EyeOff,
  Info,
  RefreshCw,
  PieChart,
  TrendingUp,
  DollarSign,
  Plus,
  Edit3,
  X
 } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { useFinancialData } from '../contexts/DataContext';
import { 
  ProductionData, 
  ProductionConfig, 
  CombinedData, 
  OperationalMetrics 
} from '../types';
import {
  saveProductionData,
  loadProductionData,
  saveProductionConfig,
  loadProductionConfig,
  saveCombinedData,
  calculateOperationalMetrics,
  validateProductionData,
  validateProductionConfig,
  exportProductionData,
  clearAllProductionData,
  getStorageSummary,
  getAvailableYears
} from '../utils/productionStorage';
import YearSelector from '../components/production/YearSelector';
import { 
  saveFinancialData, 
  loadFinancialData, 
  clearFinancialData,
  getFinancialDataInfo 
} from '../utils/financialStorageNew';
import { 
  suggestConfigValues, 
  validateSuggestions 
} from '../utils/configSuggestions';
import DataUploader from '../components/upload/DataUploader';
import CSVUploader from '../components/upload/CSVUploader';
import CSVUploaderYearAware from '../components/upload/CSVUploaderYearAware';
import { useYear } from '../contexts/YearContext';
import { formatCurrency } from '../utils/formatters';
import { useAnalysisConfig, useExclusionPatterns } from '../services/analysisConfigService';
import { intelligentPatternMatcher } from '../utils/intelligentPatternMatcher';

const DataConfiguration: React.FC = () => {
  const { data: financialData } = useFinancialData();
  const { config: analysisConfig, loading: configLoading, error: configError, refreshConfig } = useAnalysisConfig();
  const { 
    patterns: exclusionPatterns, 
    loading: patternsLoading, 
    error: patternsError, 
    addPattern: addExclusionPattern, 
    updatePattern: updateExclusionPattern, 
    deletePattern: deleteExclusionPattern,
    refreshPatterns
  } = useExclusionPatterns();
  
  // Usar contexto global de año
  const { selectedYear, setSelectedYear, availableYears, refreshYears } = useYear();
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [productionConfig, setProductionConfig] = useState<ProductionConfig>({
    capacidadMaximaMensual: 1000,
    costoFijoProduccion: 50000,
    metaPrecioPromedio: 180,
    metaMargenMinimo: 25
  });
  
  // Estados para UI
  const [activeTab, setActiveTab] = useState<'financial' | 'production' | 'config' | 'analysis'>('financial');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string>('');
  
  // Estados para configuración de análisis
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('operativo');
  const [showPatterns, setShowPatterns] = useState<Record<string, boolean>>({});
  const [editingPattern, setEditingPattern] = useState<{group: string; index?: number; pattern?: any} | null>(null);
  const [newPattern, setNewPattern] = useState({
    name: '',
    value: '',
    type: 'contains' as 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex'
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para sistema inteligente
  const [intelligentStats, setIntelligentStats] = useState<any>(null);
  const [showIntelligentPanel, setShowIntelligentPanel] = useState(false);
  const [testAccount, setTestAccount] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  
  // Estados para formulario de producción
  const [newProduction, setNewProduction] = useState<Partial<ProductionData>>({
    month: '',
    metrosProducidos: 0,
    metrosVendidos: 0
  });

  // Cargar datos al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos de producción para el año seleccionado
        const savedProduction = await loadProductionData(selectedYear);
        const savedConfig = await loadProductionConfig();
        
        if (savedProduction && savedProduction.length > 0) {
          setProductionData(savedProduction);
        }
        
        if (savedConfig) {
          setProductionConfig(savedConfig);
        }

        // Cargar patrones de exclusión para CRUD
        if (analysisConfig?.accountPatterns) {
          setPatterns(analysisConfig.accountPatterns);
        }
        
        // Los datos financieros se manejan en App.tsx
        // No necesitamos cargarlos aquí
      } catch (error) {
        // console.error('Error cargando datos:', error);
        setErrors(['Error cargando datos guardados']);
      }
    };

    loadData();
  }, [financialData, analysisConfig]);

  // Recargar datos cuando cambie el año seleccionado
  useEffect(() => {
    const loadProductionForYear = async () => {
      try {
        const savedProduction = await loadProductionData(selectedYear);
        setProductionData(savedProduction || []);
      } catch (error) {
        console.error('Error loading production data for year:', selectedYear, error);
        setProductionData([]);
      }
    };

    loadProductionForYear();
  }, [selectedYear]);

  // Lista de meses disponibles
  const availableMonths = financialData ? Object.keys(financialData.monthly) : [];
  
  const handleFinancialDataLoaded = useCallback((data: any) => {
    // Los datos se manejan en App.tsx a través del DataUploader
    // Solo guardamos y mostramos mensaje de éxito
    saveFinancialData(data);
    setSuccess('✅ Datos financieros cargados y guardados correctamente');
    setTimeout(() => setSuccess(''), 3000);
    // Recargar la página para que App.tsx cargue los nuevos datos
    window.location.reload();
  }, []);
  
  // Nueva función para sugerir valores
  const handleSuggestConfig = () => {
    if (financialData && productionData.length > 0) {
      const suggestions = suggestConfigValues(financialData, productionData);
      const warnings = validateSuggestions(suggestions);
      
      setProductionConfig(prev => ({ ...prev, ...suggestions }));
      
      let message = '✅ Valores sugeridos aplicados basados en datos reales';
      if (warnings.length > 0) {
        message += '. ' + warnings.join(', ');
      }
      
      setSuccess(message);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setErrors(['Se necesitan datos financieros y de producción para generar sugerencias.']);
      setTimeout(() => setErrors([]), 3000);
    }
  };

  const handleAddProduction = async () => {
    if (!newProduction.month || !newProduction.metrosProducidos || !newProduction.metrosVendidos) {
      setErrors(['Todos los campos son requeridos']);
      return;
    }

    // Verificar si el mes ya existe
    const existingIndex = productionData.findIndex(p => p.month === newProduction.month);
    
    const productionEntry: ProductionData = {
      month: newProduction.month!,
      metrosProducidos: Number(newProduction.metrosProducidos),
      metrosVendidos: Number(newProduction.metrosVendidos),
      fechaRegistro: new Date().toISOString()
    };

    // Validar datos
    const validationErrors = validateProductionData([productionEntry]);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    let updatedData: ProductionData[];
    if (existingIndex >= 0) {
      // Actualizar existente
      updatedData = [...productionData];
      updatedData[existingIndex] = productionEntry;
      setSuccess(`✅ Datos de ${newProduction.month} actualizados`);
    } else {
      // Agregar nuevo
      updatedData = [...productionData, productionEntry];
      setSuccess(`✅ Datos de ${newProduction.month} agregados`);
    }

    // Ordenar por mes cronológicamente
    updatedData.sort((a, b) => {
      const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    setProductionData(updatedData);
    await saveProductionData(updatedData, selectedYear);
    
    // Limpiar formulario
    setNewProduction({ month: '', metrosProducidos: 0, metrosVendidos: 0 });
    setErrors([]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteProduction = async (month: string) => {
    const updatedData = productionData.filter(p => p.month !== month);
    setProductionData(updatedData);
    await saveProductionData(updatedData, selectedYear);
    setSuccess(`✅ Datos de ${month} eliminados`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveConfig = async () => {
    const validationErrors = validateProductionConfig(productionConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    await saveProductionConfig(productionConfig);
    setSuccess('✅ Configuración guardada correctamente');
    setErrors([]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleGenerateCombinedData = () => {
    if (!financialData || productionData.length === 0) {
      setErrors(['Se requieren datos financieros y de producción']);
      return;
    }

    setIsLoading(true);
    
    try {
      const operationalMetrics = calculateOperationalMetrics(
        productionData,
        financialData,
        productionConfig
      );

      const combinedData: CombinedData = {
        financial: financialData,
        production: productionData,
        operational: operationalMetrics,
        config: productionConfig,
        lastUpdated: new Date().toISOString()
      };

      saveCombinedData(combinedData);
      setSuccess('✅ Datos combinados y métricas calculadas correctamente');
      setErrors([]);
    } catch (error) {
      setErrors(['Error al generar datos combinados: ' + (error as Error).message]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleExportData = () => {
    if (!financialData || productionData.length === 0) {
      setErrors(['No hay datos para exportar']);
      return;
    }

    try {
      const operationalMetrics = calculateOperationalMetrics(
        productionData,
        financialData,
        productionConfig
      );

      const combinedData: CombinedData = {
        financial: financialData,
        production: productionData,
        operational: operationalMetrics,
        config: productionConfig,
        lastUpdated: new Date().toISOString()
      };

      const exportedData = exportProductionData(combinedData);
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artyco-datos-completos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('✅ Datos exportados correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setErrors(['Error al exportar datos: ' + (error as Error).message]);
    }
  };

  const handleClearConfig = () => {
    if (window.confirm('¿Estás seguro de que quieres restablecer la configuración operativa a valores por defecto?')) {
      setProductionConfig({
        capacidadMaximaMensual: 1000,
        costoFijoProduccion: 50000,
        metaPrecioPromedio: 180,
        metaMargenMinimo: 25
      });
      // Limpiar solo la configuración guardada, mantener datos de producción
      localStorage.removeItem('artyco-production-config');
      setSuccess('✅ Configuración operativa restablecida a valores por defecto');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const storageSummary = getStorageSummary();

  // Limpiar cache al montar el componente para asegurar datos frescos
  useEffect(() => {
    if (activeTab === 'analysis') {
      // Limpiar cache de patrones para forzar carga fresca
      import('../services/analysisConfigService').then(module => {
        module.analysisConfigService.clearSpecificCache('exclusion_patterns');
      });
      
      // Cargar estadísticas del sistema inteligente
      loadIntelligentStats();
    }
  }, [activeTab]);

  // Función para cargar estadísticas del sistema inteligente
  const loadIntelligentStats = async () => {
    try {
      const stats = await intelligentPatternMatcher.getSystemStats();
      setIntelligentStats(stats);
    } catch (error) {
      console.error('Error cargando estadísticas inteligentes:', error);
    }
  };

  // Función para probar una cuenta con el algoritmo inteligente
  const testIntelligentMatching = async (accountName: string) => {
    if (!accountName.trim()) return;
    
    try {
      setIsLoading(true);
      const results = {
        depreciacion: await intelligentPatternMatcher.findMatches(accountName, 'depreciacion'),
        intereses: await intelligentPatternMatcher.findMatches(accountName, 'intereses')
      };
      setTestResults(results);
    } catch (error) {
      console.error('Error en test inteligente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Funciones CRUD para patrones de exclusión
  const handleAddPattern = async (group: string) => {
    if (!newPattern.name.trim() || !newPattern.value.trim()) {
      setErrors(['Nombre y valor del patrón son requeridos']);
      return;
    }

    try {
      setIsLoading(true);
      setErrors([]);
      
      const success = await addExclusionPattern(group, newPattern.name, newPattern.value, newPattern.type);
      
      if (success) {
        // Reset form
        setNewPattern({ name: '', value: '', type: 'contains' });
        setEditingPattern(null);
        setSuccess('✅ Patrón agregado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors(['Error al agregar patrón en la base de datos']);
      }
      
    } catch (error) {
      setErrors(['Error al agregar patrón']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPattern = (group: string, index: number, pattern: any) => {
    setEditingPattern({ group, index, pattern });
    setNewPattern({
      name: pattern.name || `Patrón ${index + 1}`,
      value: pattern.value || pattern,
      type: pattern.type || 'contains'
    });
  };

  const handleUpdatePattern = async () => {
    if (!editingPattern || !newPattern.name.trim() || !newPattern.value.trim()) {
      setErrors(['Datos del patrón incompletos']);
      return;
    }

    try {
      setIsLoading(true);
      setErrors([]);
      
      const pattern = editingPattern.pattern;
      const patternId = pattern.id || pattern.pattern_id;
      
      if (!patternId) {
        setErrors(['ID del patrón no encontrado']);
        return;
      }
      
      const success = await updateExclusionPattern(
        patternId, 
        editingPattern.group, 
        newPattern.name, 
        newPattern.value, 
        newPattern.type
      );
      
      if (success) {
        setNewPattern({ name: '', value: '', type: 'contains' });
        setEditingPattern(null);
        setSuccess('✅ Patrón actualizado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors(['Error al actualizar patrón en la base de datos']);
      }
      
    } catch (error) {
      setErrors(['Error al actualizar patrón']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePattern = async (group: string, index: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este patrón?')) {
      return;
    }

    try {
      setIsLoading(true);
      setErrors([]);
      
      const patterns = exclusionPatterns[group];
      if (!patterns || !patterns[index]) {
        setErrors(['Patrón no encontrado']);
        return;
      }
      
      const pattern = patterns[index];
      const patternId = pattern.id || pattern.pattern_id;
      
      if (!patternId) {
        setErrors(['ID del patrón no encontrado']);
        return;
      }
      
      const success = await deleteExclusionPattern(patternId);
      
      if (success) {
        setSuccess('✅ Patrón eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors(['Error al eliminar patrón de la base de datos']);
      }
      
    } catch (error) {
      setErrors(['Error al eliminar patrón']);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingPattern(null);
    setNewPattern({ name: '', value: '', type: 'contains' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display text-primary neon-text mb-4 animate-digital-in">
          Configuración de Datos
        </h2>
        <p className="text-text-muted font-mono text-lg">
          Centro de control para datos financieros y operativos
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card p-2 rounded-xl flex justify-center border border-border shadow-inner-glow">
        {[
          { id: 'financial', label: 'Datos Financieros', icon: FileText },
          { id: 'production', label: 'Datos Producción', icon: Factory },
          { id: 'config', label: 'Configuración', icon: Settings },
          { id: 'analysis', label: 'Análisis Financieros', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-display font-semibold transition-all duration-300 flex items-center justify-center space-x-2
                ${activeTab === tab.id 
                  ? 'bg-primary text-dark-bg shadow-glow-md' 
                  : 'text-text-secondary hover:bg-glass hover:text-primary hover:shadow-glow-sm'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center space-x-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CheckCircle className="w-5 h-5 text-accent" />
            <span className="text-accent font-mono">{success}</span>
          </motion.div>
        )}
        
        {errors.length > 0 && (
          <motion.div
            className="p-4 bg-danger/10 border border-danger/30 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="w-5 h-5 text-danger" />
              <span className="text-danger font-display font-semibold">Errores encontrados:</span>
            </div>
            <ul className="text-danger font-mono text-sm space-y-1 ml-8">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'financial' && (
          <motion.div
            key="financial"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="hologram-card p-6 rounded-2xl shadow-hologram"
          >
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-display text-primary text-glow">
                Datos Financieros (CSV Multi-Año)
              </h3>
            </div>
            
            {/* CSV Uploader Year-Aware - Siempre visible */}
            <CSVUploaderYearAware />
            
            {/* Panel de años disponibles */}
            {availableYears && availableYears.length > 0 && (
              <div className="glass-card p-4 border border-border rounded-lg mt-6">
                <h4 className="font-display text-primary mb-3">Años disponibles</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableYears.map(y => (
                    <div key={y.year} className={`p-3 rounded-lg border ${selectedYear===y.year ? 'border-primary bg-primary/10' : 'border-border'}`}>
                      <div className="flex items-center justify-between">
                        <button
                          className="text-lg font-semibold hover:text-primary"
                          onClick={() => setSelectedYear(y.year)}
                        >
                          {y.year}
                        </button>
                        <button
                          className="text-danger text-sm hover:underline"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar datos del año ${y.year}? Esta acción no se puede deshacer.`)) return;
                            const token = localStorage.getItem('access_token');
                            await fetch(`http://localhost:8001/api/financial/clear?year=${y.year}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token ?? ''}` }
                            });
                            await refreshYears();
                            if (selectedYear === y.year) setSelectedYear(null);
                            setSuccess(`✅ Datos del año ${y.year} eliminados correctamente`);
                            setTimeout(() => setSuccess(''), 3000);
                          }}
                        >
                          Borrar
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Registros: {y.records?.toLocaleString('es-EC')} · Cuentas: {y.accounts?.toLocaleString('es-EC')} · Ingresos: ${y.total_revenue?.toLocaleString('es-EC')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mostrar datos del año seleccionado si están disponibles */}
            {selectedYear && financialData && financialData.yearly?.ingresos > 0 && (
              <div className="space-y-4 mt-6">
                <h4 className="text-lg font-medium text-white">Datos de {selectedYear}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card p-4 border border-accent/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-mono text-accent mb-1">
                        {formatCurrency(financialData.yearly.ingresos)}
                      </p>
                      <p className="text-sm text-text-muted">Ingresos Anuales</p>
                    </div>
                  </div>
                  <div className="glass-card p-4 border border-primary/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-mono text-primary mb-1">
                        {formatCurrency(financialData.yearly.ebitda)}
                      </p>
                      <p className="text-sm text-text-muted">EBITDA Anual</p>
                    </div>
                  </div>
                  <div className="glass-card p-4 border border-warning/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-mono text-warning mb-1">
                        {Object.keys(financialData.monthly).length}
                      </p>
                      <p className="text-sm text-text-muted">Meses Cargados</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-accent" />
                    <span className="text-accent font-display">Datos de {selectedYear} cargados correctamente</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'production' && (
          <motion.div
            key="production"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Year Selector */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center space-x-3 mb-6">
                <Calendar className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-display text-primary text-glow">
                  Selección de Año
                </h3>
              </div>
              
              <YearSelector
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                className="max-w-md"
              />
              
              <div className="mt-4 p-4 bg-dark-bg/50 rounded-lg border border-accent/20">
                <p className="text-sm text-text-muted">
                  <Info className="w-4 h-4 inline mr-2" />
                  Los datos de producción se organizan por año. Selecciona el año para ver o editar los datos correspondientes.
                </p>
              </div>
            </div>

            {/* Production Data Form */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Factory className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-display text-primary text-glow">
                    Datos de Producción - {selectedYear}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-text-muted">
                    {productionData.length} meses configurados
                  </div>
                  {productionData.length > 0 && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`¿Estás seguro de que quieres eliminar todos los datos de producción del año ${selectedYear}?`)) {
                          await clearAllProductionData(selectedYear);
                          setProductionData([]);
                          setSuccess(`✅ Datos de producción del año ${selectedYear} eliminados`);
                          setTimeout(() => setSuccess(''), 3000);
                        }
                      }}
                      className="px-3 py-2 bg-danger/20 text-danger border border-danger/30 rounded-lg hover:bg-danger/30 transition-all duration-200 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Limpiar {selectedYear}</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Mes
                  </label>
                  <select
                    value={newProduction.month || ''}
                    onChange={(e) => setNewProduction(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                  >
                    <option value="">Seleccionar mes...</option>
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Metros² Producidos
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduction.metrosProducidos || 0}
                    onChange={(e) => setNewProduction(prev => ({ 
                      ...prev, 
                      metrosProducidos: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Metros² Vendidos
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduction.metrosVendidos || 0}
                    onChange={(e) => setNewProduction(prev => ({ 
                      ...prev, 
                      metrosVendidos: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleAddProduction}
                    className="w-full cyber-button flex items-center justify-center space-x-2 relative z-50 pointer-events-auto"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
              
              {/* Production Data Table */}
              {productionData.length > 0 && (
                <div className="glass-card border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-primary/10 border-b border-primary/30">
                        <tr>
                          <th className="text-left p-4 font-display text-primary">Mes</th>
                          <th className="text-right p-4 font-display text-primary">Producidos (m²)</th>
                          <th className="text-right p-4 font-display text-primary">Vendidos (m²)</th>
                          <th className="text-right p-4 font-display text-primary">Eficiencia</th>
                          <th className="text-center p-4 font-display text-primary">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionData.map((prod, index) => {
                          const eficiencia = prod.metrosProducidos > 0 ? 
                            (prod.metrosVendidos / prod.metrosProducidos) * 100 : 0;
                          
                          return (
                            <tr key={prod.month} className="border-b border-border/50 hover:bg-glass/50 transition-colors">
                              <td className="p-4 font-mono text-text-secondary">{prod.month}</td>
                              <td className="p-4 font-mono text-text-secondary text-right">
                                {prod.metrosProducidos.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 font-mono text-text-secondary text-right">
                                {prod.metrosVendidos.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`p-4 font-mono text-right font-semibold ${
                                eficiencia >= 90 ? 'text-accent' : eficiencia >= 70 ? 'text-warning' : 'text-danger'
                              }`}>
                                {eficiencia.toFixed(1)}%
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteProduction(prod.month)}
                                  className="p-2 text-danger hover:bg-danger/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Configuration Form */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center space-x-3 mb-6">
                <Settings className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-display text-primary text-glow">
                  Configuración Operativa
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Capacidad Máxima Mensual (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productionConfig.capacidadMaximaMensual}
                    onChange={(e) => setProductionConfig(prev => ({ 
                      ...prev, 
                      capacidadMaximaMensual: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Costo Fijo Producción ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productionConfig.costoFijoProduccion}
                    onChange={(e) => setProductionConfig(prev => ({ 
                      ...prev, 
                      costoFijoProduccion: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Meta Precio Promedio ($/m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productionConfig.metaPrecioPromedio}
                    onChange={(e) => setProductionConfig(prev => ({ 
                      ...prev, 
                      metaPrecioPromedio: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-display text-text-secondary mb-2">
                    Meta Margen Mínimo (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={productionConfig.metaMargenMinimo}
                    onChange={(e) => setProductionConfig(prev => ({ 
                      ...prev, 
                      metaMargenMinimo: Number(e.target.value) 
                    }))}
                    className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between">
                <button
                  onClick={handleSuggestConfig}
                  disabled={!financialData || productionData.length === 0}
                  className="cyber-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Sugerir Valores Basados en Datos</span>
                </button>
                
                <button
                  onClick={handleSaveConfig}
                  className="cyber-button flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleGenerateCombinedData}
                disabled={!financialData || productionData.length === 0 || isLoading}
                className="cyber-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed relative z-50 pointer-events-auto"
              >
                <Calculator className="w-5 h-5" />
                <span>{isLoading ? 'Calculando...' : 'Calcular Métricas'}</span>
              </button>
              
              <button
                onClick={handleExportData}
                disabled={!financialData || productionData.length === 0}
                className="cyber-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed relative z-50 pointer-events-auto"
              >
                <Download className="w-5 h-5" />
                <span>Exportar Datos</span>
              </button>
              
              <button
                onClick={handleClearConfig}
                className="px-6 py-3 bg-warning/20 text-warning border border-warning/50 rounded-lg hover:bg-warning hover:text-white transition-colors flex items-center justify-center space-x-2 relative z-50 pointer-events-auto"
              >
                <Trash2 className="w-5 h-5" />
                <span>Restablecer Configuración</span>
              </button>
            </div>

            {/* Storage Summary */}
            <div className="glass-card p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Database className="w-5 h-5 text-primary" />
                <h4 className="font-display text-primary">Estado del Almacenamiento</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                <div className="text-center">
                  <p className={storageSummary.hasProductionData ? 'text-accent' : 'text-text-muted'}>
                    {storageSummary.hasProductionData ? '✅' : '❌'} Datos Producción
                  </p>
                </div>
                <div className="text-center">
                  <p className={storageSummary.hasConfig ? 'text-accent' : 'text-text-muted'}>
                    {storageSummary.hasConfig ? '✅' : '❌'} Configuración
                  </p>
                </div>
                <div className="text-center">
                  <p className={storageSummary.hasCombinedData ? 'text-accent' : 'text-text-muted'}>
                    {storageSummary.hasCombinedData ? '✅' : '❌'} Datos Combinados
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-text-secondary">
                    📊 {storageSummary.totalRecords} registros
                  </p>
                </div>
              </div>
              {storageSummary.lastUpdated && (
                <p className="text-xs text-text-dim mt-2 text-center">
                  Última actualización: {new Date(storageSummary.lastUpdated).toLocaleDateString('es-EC')}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-display text-primary text-glow">
                    Configuración de Análisis Financieros
                  </h3>
                </div>
                <button
                  onClick={refreshConfig}
                  className="p-2 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-glass"
                  disabled={configLoading}
                >
                  <RefreshCw className={`w-5 h-5 ${configLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-text-muted">
                Gestiona las exclusiones de cuentas para los módulos de PyG y Punto de Equilibrio
              </p>
            </div>

            {configLoading && (
              <div className="glass-card p-8 rounded-xl border border-border text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-text-muted">Cargando configuración de análisis...</p>
              </div>
            )}

            {configError && (
              <div className="glass-card p-6 rounded-xl border border-danger/30 bg-danger/10">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-danger" />
                  <div>
                    <h4 className="font-semibold text-danger">Error al cargar configuración</h4>
                    <p className="text-sm text-danger/80 mt-1">
                      Usando configuración por defecto. Verifica la conexión con la base de datos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {analysisConfig && (
              <>
                {/* Analysis Type Selector */}
                <div className="glass-card p-6 rounded-xl border border-border">
                  <h4 className="text-lg font-semibold text-light mb-4">Tipos de Análisis Disponibles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(analysisConfig.breakEvenConfigs).map(([code, config]) => (
                      <motion.div
                        key={code}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                          selectedAnalysis === code
                            ? 'border-primary bg-primary/10 shadow-glow-sm'
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                        onClick={() => setSelectedAnalysis(code)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center mb-2">
                          <div className="mr-3">
                            {code === 'contable' && <PieChart className="w-8 h-8 text-primary" />}
                            {code === 'operativo' && <TrendingUp className="w-8 h-8 text-accent" />}
                            {code === 'caja' && <DollarSign className="w-8 h-8 text-warning" />}
                          </div>
                          <div>
                            <h5 className="font-semibold text-light">
                              {config.description.split(' ').slice(0, 3).join(' ')}
                            </h5>
                            <p className="text-xs text-text-muted uppercase tracking-wide">
                              {code === 'contable' ? 'ESTÁNDAR' : code === 'operativo' ? 'EBIT' : 'EBITDA'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Configuration Details */}
                <div className="glass-card p-6 rounded-xl border border-border">
                  <h4 className="text-lg font-semibold text-light mb-4">
                    Configuración: {analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.description.split(' ').slice(0, 3).join(' ')}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Depreciación */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-light flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2 bg-orange-500"></span>
                          Depreciación y Amortización
                        </h5>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeDepreciacion
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeDepreciacion ? 'INCLUYE' : 'EXCLUYE'}
                        </span>
                      </div>
                      {!analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeDepreciacion && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-red-300 mb-2">Cuentas excluidas por contener:</p>
                          <div className="flex flex-wrap gap-1">
                            {analysisConfig.accountPatterns.depreciacion?.slice(0, 3).map((pattern, index) => (
                              <span key={index} className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded">
                                "{pattern}"
                              </span>
                            ))}
                            {analysisConfig.accountPatterns.depreciacion && analysisConfig.accountPatterns.depreciacion.length > 3 && (
                              <button
                                onClick={() => setShowPatterns(prev => ({ ...prev, depreciacion: !prev.depreciacion }))}
                                className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded hover:bg-red-500/30 transition-colors"
                              >
                                {showPatterns.depreciacion ? 'Ocultar' : `+${analysisConfig.accountPatterns.depreciacion.length - 3} más`}
                              </button>
                            )}
                          </div>
                          {showPatterns.depreciacion && analysisConfig.accountPatterns.depreciacion && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {analysisConfig.accountPatterns.depreciacion.slice(3).map((pattern, index) => (
                                <span key={index} className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded">
                                  "{pattern}"
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Intereses */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-light flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2 bg-blue-500"></span>
                          Gastos Financieros e Intereses
                        </h5>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeIntereses
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeIntereses ? 'INCLUYE' : 'EXCLUYE'}
                        </span>
                      </div>
                      {!analysisConfig.breakEvenConfigs[selectedAnalysis as keyof typeof analysisConfig.breakEvenConfigs]?.includeIntereses && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-red-300 mb-2">Cuentas excluidas por contener:</p>
                          <div className="flex flex-wrap gap-1">
                            {analysisConfig.accountPatterns.intereses?.slice(0, 4).map((pattern, index) => (
                              <span key={index} className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded">
                                "{pattern}"
                              </span>
                            ))}
                            {analysisConfig.accountPatterns.intereses && analysisConfig.accountPatterns.intereses.length > 4 && (
                              <button
                                onClick={() => setShowPatterns(prev => ({ ...prev, intereses: !prev.intereses }))}
                                className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded hover:bg-red-500/30 transition-colors"
                              >
                                {showPatterns.intereses ? 'Ocultar' : `+${analysisConfig.accountPatterns.intereses.length - 4} más`}
                              </button>
                            )}
                          </div>
                          {showPatterns.intereses && analysisConfig.accountPatterns.intereses && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {analysisConfig.accountPatterns.intereses.slice(4).map((pattern, index) => (
                                <span key={index} className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded">
                                  "{pattern}"
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Highlight específico para "gastos de gestión y credito" */}
                          {analysisConfig.accountPatterns.intereses?.includes('gastos de gestión y credito') && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                                <div>
                                  <p className="text-sm font-semibold text-green-300">✅ Patrón Específico Detectado</p>
                                  <p className="text-xs text-green-400 mt-1">
                                    "gastos de gestión y credito" está incluido en las exclusiones
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pattern Loading Error */}
                {patternsError && (
                  <div className="glass-card p-6 rounded-xl border border-danger/30 bg-danger/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-6 h-6 text-danger" />
                        <div>
                          <h4 className="font-semibold text-danger">Error al cargar patrones</h4>
                          <p className="text-sm text-danger/80 mt-1">
                            No se pudieron cargar los patrones desde la base de datos
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={refreshPatterns}
                        className="p-2 text-danger hover:bg-danger/20 rounded-lg transition-colors"
                        disabled={patternsLoading}
                      >
                        <RefreshCw className={`w-5 h-5 ${patternsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* CRUD Patterns Management */}
                <div className="glass-card p-6 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-light">Gestión de Patrones de Exclusión</h4>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-text-muted">
                        Administra las palabras clave utilizadas para identificar cuentas
                      </div>
                      <button
                        onClick={refreshPatterns}
                        className="p-2 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-glass"
                        disabled={patternsLoading}
                        title="Actualizar patrones"
                      >
                        <RefreshCw className={`w-5 h-5 ${patternsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {['depreciacion', 'intereses'].map((group) => (
                      <div key={group} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-glass">
                          <div className="flex items-center">
                            <span className={`w-4 h-4 rounded-full mr-3 ${
                              group === 'depreciacion' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}></span>
                            <h5 className="font-semibold text-light capitalize">{group}</h5>
                            <span className="ml-3 px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                              {exclusionPatterns[group]?.length || 0} patrones
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingPattern({ group })}
                            className="flex items-center space-x-2 px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Agregar</span>
                          </button>
                        </div>

                        {/* Pattern List */}
                        <div className="p-4 bg-dark-surface/30">
                          {patternsLoading && (
                            <div className="text-center py-4">
                              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                              <p className="text-text-muted text-sm">Cargando patrones...</p>
                            </div>
                          )}
                          
                          {patternsError && (
                            <div className="text-center py-4">
                              <AlertCircle className="w-6 h-6 text-danger mx-auto mb-2" />
                              <p className="text-danger text-sm">Error al cargar patrones</p>
                            </div>
                          )}
                          
                          {!patternsLoading && !patternsError && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(exclusionPatterns[group] || []).map((pattern, index) => (
                              <div 
                                key={pattern.id || index} 
                                className="p-3 bg-glass border border-border rounded-lg group hover:border-primary/50 transition-all cursor-pointer"
                                onClick={() => handleEditPattern(group, index, pattern)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-text-muted font-mono uppercase">
                                    {pattern.type || 'contains'}
                                  </span>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPattern(group, index, pattern);
                                      }}
                                      className="p-1 text-accent hover:bg-accent/20 rounded transition-colors"
                                      disabled={isLoading}
                                      title="Editar patrón"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePattern(group, index);
                                      }}
                                      className="p-1 text-danger hover:bg-danger/20 rounded transition-colors"
                                      disabled={isLoading}
                                      title="Eliminar patrón"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-mono text-sm text-light font-semibold">
                                    "{pattern.value || pattern.pattern_value || 'Sin valor'}"
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {pattern.name || pattern.pattern_name || `Patrón ${index + 1}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                            </div>
                          )}
                          
                          {!patternsLoading && !patternsError && (!exclusionPatterns[group] || exclusionPatterns[group].length === 0) && (
                            <div className="text-center py-8 text-text-muted">
                              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No hay patrones configurados para {group}</p>
                              <p className="text-xs mt-1">Haz clic en "Agregar" para crear el primer patrón</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add/Edit Pattern Modal */}
                <AnimatePresence>
                  {editingPattern && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                      onClick={() => cancelEdit()}
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="glass-card p-6 rounded-xl max-w-md w-full border border-border shadow-glow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-light">
                            {editingPattern.index !== undefined ? 'Editar' : 'Agregar'} Patrón
                          </h4>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-text-muted hover:text-light transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              Nombre del Patrón
                            </label>
                            <input
                              type="text"
                              value={newPattern.name}
                              onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full p-3 bg-glass border border-border rounded-lg text-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              placeholder="ej. Gastos de gestión y credito"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              Valor del Patrón
                            </label>
                            <input
                              type="text"
                              value={newPattern.value}
                              onChange={(e) => setNewPattern(prev => ({ ...prev, value: e.target.value }))}
                              className="w-full p-3 bg-glass border border-border rounded-lg text-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              placeholder="ej. gastos de gestión y credito"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              Tipo de Coincidencia
                            </label>
                            <select
                              value={newPattern.type}
                              onChange={(e) => setNewPattern(prev => ({ ...prev, type: e.target.value as any }))}
                              className="w-full p-3 bg-glass border border-border rounded-lg text-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                              <option value="contains">Contiene</option>
                              <option value="starts_with">Empieza con</option>
                              <option value="ends_with">Termina con</option>
                              <option value="exact">Exacto</option>
                              <option value="regex">Expresión Regular</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-4 py-2 bg-glass border border-border text-text-secondary hover:text-light rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={editingPattern.index !== undefined ? handleUpdatePattern : () => handleAddPattern(editingPattern.group)}
                            disabled={isLoading || !newPattern.name.trim() || !newPattern.value.trim()}
                            className="flex-1 px-4 py-2 bg-primary text-dark-bg font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isLoading ? 'Guardando...' : (editingPattern.index !== undefined ? 'Actualizar' : 'Agregar')}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Intelligent Algorithm Panel */}
                <div className="glass-card p-6 rounded-xl border border-accent/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <Settings className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-light">Sistema Inteligente de Patrones</h4>
                        <p className="text-sm text-text-muted">
                          Algoritmo híbrido que combina tu lógica original + configuración personalizada
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowIntelligentPanel(!showIntelligentPanel)}
                      className="p-2 text-accent hover:bg-accent/20 rounded-lg transition-colors"
                    >
                      {showIntelligentPanel ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* System Stats */}
                  {intelligentStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-glass border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-accent mb-1">
                          {intelligentStats.intelligentPatterns}
                        </div>
                        <div className="text-xs text-text-muted">Patrones Inteligentes</div>
                      </div>
                      <div className="bg-glass border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {intelligentStats.userPatterns}
                        </div>
                        <div className="text-xs text-text-muted">Configurados por Usuario</div>
                      </div>
                      <div className="bg-glass border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-warning mb-1">
                          {intelligentStats.totalPatterns}
                        </div>
                        <div className="text-xs text-text-muted">Total Combinado</div>
                      </div>
                      <div className="bg-glass border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-light mb-1">
                          {Object.keys(intelligentStats.coverage).length}
                        </div>
                        <div className="text-xs text-text-muted">Categorías Cubiertas</div>
                      </div>
                    </div>
                  )}

                  {showIntelligentPanel && (
                    <div className="space-y-4">
                      {/* Test Account Input */}
                      <div className="bg-dark-surface/30 rounded-lg p-4">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          🧪 Probar Detección Inteligente
                        </label>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={testAccount}
                            onChange={(e) => setTestAccount(e.target.value)}
                            className="flex-1 p-3 bg-glass border border-border rounded-lg text-light focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                            placeholder="ej. Gastos de gestión y administración"
                          />
                          <button
                            onClick={() => testIntelligentMatching(testAccount)}
                            disabled={isLoading || !testAccount.trim()}
                            className="px-4 py-2 bg-accent text-dark-bg font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                            <span>Analizar</span>
                          </button>
                        </div>
                      </div>

                      {/* Test Results */}
                      {testResults && (
                        <div className="space-y-4">
                          {Object.entries(testResults).map(([group, result]: [string, any]) => (
                            <div key={group} className="bg-dark-surface/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-light capitalize flex items-center">
                                  <span className={`w-3 h-3 rounded-full mr-2 ${
                                    group === 'depreciacion' ? 'bg-orange-500' : 'bg-blue-500'
                                  }`}></span>
                                  {group}
                                </h5>
                                {result.bestMatch && (
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      result.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' :
                                      result.confidence >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {Math.round(result.confidence * 100)}% confianza
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      result.bestMatch.source === 'intelligent' ? 'bg-accent/20 text-accent' :
                                      'bg-primary/20 text-primary'
                                    }`}>
                                      {result.bestMatch.source === 'intelligent' ? '🧠 Inteligente' : '👤 Usuario'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {result.matches.length > 0 ? (
                                <div className="space-y-2">
                                  {result.matches.slice(0, 3).map((match: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-glass rounded border border-border">
                                      <span className="font-mono text-sm text-light">"{match.value}"</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-text-muted">{match.type}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          match.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' :
                                          match.confidence >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-red-500/20 text-red-400'
                                        }`}>
                                          {Math.round(match.confidence * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {result.matches.length > 3 && (
                                    <div className="text-xs text-text-muted text-center">
                                      +{result.matches.length - 3} coincidencias más
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-text-muted">
                                  <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Sin coincidencias detectadas</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="glass-card p-4 rounded-lg border border-info/30 bg-info/10">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 text-info mr-3" />
                    <div>
                      <p className="text-sm text-info font-semibold">Sistema Híbrido Inteligente</p>
                      <p className="text-xs text-text-muted">
                        Combina tu algoritmo original con configuración personalizable. 
                        Los cambios se reflejan automáticamente en PyG y Punto de Equilibrio.
                        {analysisConfig.lastUpdated && ` Actualizado: ${new Date(analysisConfig.lastUpdated).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataConfiguration;