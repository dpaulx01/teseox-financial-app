import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Search, Info, AlertCircle, TrendingUp, TrendingDown, Trash2, RefreshCw } from 'lucide-react';
import { useFinancialData } from '../../contexts/DataContext';
import { SPECIAL_ACCOUNTS, ACCOUNT_PATTERNS } from '../../constants/breakEvenConfig';
import { formatCurrency } from '../../utils/formatters';

interface DetectedAccount {
  code: string;
  name: string;
  value: number;
  detectionMethod: 'code' | 'name_pattern';
  detectionRule?: string;
  matchedPattern?: string;
}

interface AccountDetectionPanelProps {
  currentMonth: string;
  className?: string;
}

const AccountDetectionPanel: React.FC<AccountDetectionPanelProps> = ({
  currentMonth,
  className = ''
}) => {
  const { data } = useFinancialData();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'depreciacion' | 'intereses'>('depreciacion');
  const [searchTerm, setSearchTerm] = useState('');

  // Función para limpiar todos los datos en caché
  const clearAllCache = () => {
    if (confirm('¿Estás seguro de que quieres limpiar TODOS los datos en caché? Esto borrará datos financieros, clasificaciones y configuraciones guardadas.')) {
      // Listar todas las claves de localStorage relacionadas con Artyco
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('artyco-')) {
          keysToRemove.push(key);
        }
      }
      
      // Remover todas las claves
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      alert(`✅ Caché limpiado correctamente. Se eliminaron ${keysToRemove.length} elementos:\n${keysToRemove.join('\n')}\n\nPor favor recarga la página.`);
      
      // Recargar la página para aplicar cambios
      window.location.reload();
    }
  };

  // Función para detectar cuentas especiales (SOLO LECTURA - no modifica cálculos)
  const detectSpecialAccounts = useMemo(() => {
    if (!data?.raw) return { depreciacion: [], intereses: [] };

    const detectedAccounts = {
      depreciacion: [] as DetectedAccount[],
      intereses: [] as DetectedAccount[]
    };

    // Función helper para verificar si una cuenta tiene subcuentas
    const hasChildren = (parentCode: string): boolean => {
      const parentDots = (parentCode.match(/\./g) || []).length;
      return data.raw.some(row => {
        const childCode = row['COD.'] || '';
        const childDots = (childCode.match(/\./g) || []).length;
        return childCode.startsWith(parentCode + '.') && childDots === parentDots + 1;
      });
    };

    (data.raw || []).forEach(row => {
      const codigo = row['COD.'] || '';
      const cuenta = row['CUENTA'] || '';
      
      // Solo cuentas de detalle (sin subcuentas)
      if (hasChildren(codigo)) return;

      // Obtener valor para el período actual
      let valor = 0;
      if (currentMonth === 'Anual') {
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            const numericValue = typeof monthValue === 'number' ? monthValue : 
              parseFloat(String(monthValue).replace(/\./g, '').replace(',', '.')) || 0;
            valor += numericValue;
          }
        });
      } else if (currentMonth === 'Promedio') {
        const monthValues: number[] = [];
        Object.keys(data.monthly).forEach(month => {
          const monthValue = row[month];
          if (monthValue) {
            const numericValue = typeof monthValue === 'number' ? monthValue : 
              parseFloat(String(monthValue).replace(/\./g, '').replace(',', '.')) || 0;
            monthValues.push(numericValue);
          }
        });
        valor = monthValues.length > 0 ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length : 0;
      } else {
        const monthValue = row[currentMonth];
        if (monthValue) {
          valor = typeof monthValue === 'number' ? monthValue : 
            parseFloat(String(monthValue).replace(/\./g, '').replace(',', '.')) || 0;
        }
      }

      if (Math.abs(valor) < 0.01) return; // Ignorar valores muy pequeños

      // DETECCIÓN DE DEPRECIACIÓN/AMORTIZACIÓN (SOLO POR NOMBRE)
      let isDepreciation = false;
      let depreciationMethod: DetectedAccount['detectionMethod'] = 'name_pattern';
      let depreciationRule = '';
      let matchedDepPattern = '';

      // Solo por patrón de nombre (más universal)
      const cuentaLower = cuenta.toLowerCase();
      const matchedPattern = ACCOUNT_PATTERNS.depreciacion.find(pattern => 
        cuentaLower.includes(pattern.toLowerCase())
      );
      if (matchedPattern) {
        isDepreciation = true;
        depreciationMethod = 'name_pattern';
        depreciationRule = `Nombre contiene: "${matchedPattern}"`;
        matchedDepPattern = matchedPattern;
      }

      if (isDepreciation) {
        detectedAccounts.depreciacion.push({
          code: codigo,
          name: cuenta,
          value: Math.abs(valor),
          detectionMethod: depreciationMethod,
          detectionRule: depreciationRule,
          matchedPattern: matchedDepPattern
        });
      }

      // DETECCIÓN DE INTERESES (SOLO POR NOMBRE)
      let isInterest = false;
      let interestMethod: DetectedAccount['detectionMethod'] = 'name_pattern';
      let interestRule = '';
      let matchedIntPattern = '';

      // Solo por patrón de nombre (más universal)
      const matchedIntPattern2 = ACCOUNT_PATTERNS.intereses.find(pattern => 
        cuentaLower.includes(pattern.toLowerCase())
      );
      if (matchedIntPattern2) {
        isInterest = true;
        interestMethod = 'name_pattern';
        interestRule = `Nombre contiene: "${matchedIntPattern2}"`;
        matchedIntPattern = matchedIntPattern2;
      }

      if (isInterest) {
        detectedAccounts.intereses.push({
          code: codigo,
          name: cuenta,
          value: Math.abs(valor),
          detectionMethod: interestMethod,
          detectionRule: interestRule,
          matchedPattern: matchedIntPattern
        });
      }
    });

    return detectedAccounts;
  }, [data, currentMonth]);

  // Filtrar cuentas según búsqueda
  const filteredAccounts = useMemo(() => {
    const accounts = detectSpecialAccounts[activeTab];
    if (!searchTerm) return accounts;
    
    return accounts.filter(account => 
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [detectSpecialAccounts, activeTab, searchTerm]);

  // Calcular totales
  const totals = useMemo(() => {
    return {
      depreciacion: detectSpecialAccounts.depreciacion.reduce((sum, acc) => sum + acc.value, 0),
      intereses: detectSpecialAccounts.intereses.reduce((sum, acc) => sum + acc.value, 0)
    };
  }, [detectSpecialAccounts]);

  const getMethodIcon = (method: DetectedAccount['detectionMethod']) => {
    switch (method) {
      case 'code': return '🔢';
      case 'name_pattern': return '🔍';
      default: return '❓';
    }
  };

  const getMethodColor = (method: DetectedAccount['detectionMethod']) => {
    switch (method) {
      case 'code': return 'text-accent';
      case 'name_pattern': return 'text-warning';
      default: return 'text-text-dim';
    }
  };

  // Calcular impacto en cada tipo de análisis
  const analysisImpact = useMemo(() => {
    return {
      contable: {
        depreciacion: '✅ Incluida',
        intereses: '✅ Incluidos',
        total: totals.depreciacion + totals.intereses
      },
      operativo: {
        depreciacion: '✅ Incluida',
        intereses: '❌ Excluidos',
        total: totals.depreciacion
      },
      caja: {
        depreciacion: '❌ Excluida',
        intereses: '✅ Incluidos',
        total: totals.intereses
      }
    };
  }, [totals]);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
          isOpen
            ? 'border-info/50 bg-info/10 text-info shadow-glow-info'
            : 'border-border hover:border-info/30 text-text-secondary hover:bg-glass/50'
        }`}
      >
        <Eye className="w-4 h-4" />
        {isOpen ? 'Cerrar Debug' : 'Debug Detección'}
        <span className="ml-1 px-2 py-1 rounded-full text-xs bg-info/20 text-info">
          🔍 Ver qué detecta
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 hologram-card rounded-xl border border-info/30 bg-info/5 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/20 border border-info/30">
                    <Eye className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-info">
                      🔍 Debug: Detección Automática
                    </h3>
                    <p className="text-sm text-text-muted">
                      Vista de solo lectura - Muestra qué detecta el algoritmo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm text-warning bg-warning/10 px-3 py-1 rounded-full border border-warning/30">
                    ⚠️ Solo informativo
                  </div>
                  <button
                    onClick={clearAllCache}
                    className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-danger/20 border border-danger/30 text-danger hover:bg-danger/30 transition-all duration-200"
                    title="Limpiar todos los datos en caché (localStorage)"
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpiar Caché
                  </button>
                </div>
              </div>

              {/* Impacto por tipo de análisis */}
              <div className="mb-6 p-4 glass-card rounded-lg border border-primary/30">
                <h4 className="text-sm font-display text-primary mb-3">📊 Impacto en Cada Tipo de Análisis</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="font-display text-primary mb-1">P.E. Contable</div>
                    <div className="text-text-muted">
                      <div>{analysisImpact.contable.depreciacion} Depreciación</div>
                      <div>{analysisImpact.contable.intereses} Intereses</div>
                      <div className="text-primary font-mono mt-1">CF: -{formatCurrency(analysisImpact.contable.total)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-accent mb-1">P.E. Operativo</div>
                    <div className="text-text-muted">
                      <div>{analysisImpact.operativo.depreciacion} Depreciación</div>
                      <div>{analysisImpact.operativo.intereses} Intereses</div>
                      <div className="text-accent font-mono mt-1">CF: -{formatCurrency(analysisImpact.operativo.total)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-warning mb-1">P.E. Caja</div>
                    <div className="text-text-muted">
                      <div>{analysisImpact.caja.depreciacion} Depreciación</div>
                      <div>{analysisImpact.caja.intereses} Intereses</div>
                      <div className="text-warning font-mono mt-1">CF: -{formatCurrency(analysisImpact.caja.total)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Totales */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="text-center p-3 glass-card rounded-lg border border-warning/30">
                  <div className="text-2xl font-mono text-warning">
                    {formatCurrency(totals.depreciacion)}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Total Depreciación/Amort.</div>
                  <div className="text-xs text-text-muted">
                    {detectSpecialAccounts.depreciacion.length} cuentas detectadas
                  </div>
                </div>
                
                <div className="text-center p-3 glass-card rounded-lg border border-danger/30">
                  <div className="text-2xl font-mono text-danger">
                    {formatCurrency(totals.intereses)}
                  </div>
                  <div className="text-xs text-text-dim uppercase">Total Intereses</div>
                  <div className="text-xs text-text-muted">
                    {detectSpecialAccounts.intereses.length} cuentas detectadas
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(['depreciacion', 'intereses'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-display transition-all duration-300 ${
                      activeTab === tab
                        ? 'bg-info/20 border-2 border-info/50 text-info'
                        : 'bg-glass border border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {tab === 'depreciacion' ? '⚙️ Depreciación/Amortización' : '💰 Intereses Financieros'}
                    <span className="ml-2 text-xs">
                      ({detectSpecialAccounts[tab].length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre de cuenta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-glass rounded-lg border border-border focus:border-info outline-none text-text-secondary"
                />
              </div>

              {/* Lista de Cuentas Detectadas */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-8 text-text-dim">
                    {searchTerm ? 'No se encontraron cuentas que coincidan con la búsqueda' : 
                     `No se detectaron cuentas de ${activeTab} en ${currentMonth}`}
                  </div>
                ) : (
                  filteredAccounts.map((account, index) => (
                    <motion.div
                      key={account.code}
                      layout
                      className="glass-card p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {getMethodIcon(account.detectionMethod)}
                          </div>
                          <div>
                            <div className="font-mono text-sm text-text-secondary">
                              {account.code}
                            </div>
                            <div className="text-text-muted text-sm">
                              {account.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-mono text-primary">
                            {formatCurrency(account.value)}
                          </div>
                          <div className={`text-xs ${getMethodColor(account.detectionMethod)}`}>
                            {account.detectionMethod === 'code' ? 'Por código' : 'Por nombre'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-text-dim bg-glass/50 p-2 rounded border border-border/50">
                        <strong>Detectado porque:</strong> {account.detectionRule}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Configuración actual */}
              <div className="mt-6 p-4 glass-card rounded-lg border border-info/30">
                <h4 className="text-sm font-display text-info mb-3">⚙️ Configuración Actual de Detección</h4>
                <div className="mb-3 p-2 bg-success/10 rounded border border-success/30">
                  <div className="text-xs text-success">
                    ✅ <strong>Detección Universal por Nombre:</strong> No depende de códigos específicos, funciona con cualquier plan contable.
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong className="text-warning">Patrones Depreciación/Amortización:</strong>
                    <div className="font-mono text-text-muted mt-1">
                      {ACCOUNT_PATTERNS.depreciacion.join(', ')}
                    </div>
                  </div>
                  <div>
                    <strong className="text-danger">Patrones Intereses/Financieros:</strong>
                    <div className="font-mono text-text-muted mt-1">
                      {ACCOUNT_PATTERNS.intereses.join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de debugging de datos */}
              <div className="mt-6 p-4 glass-card rounded-lg border border-info/30">
                <h4 className="text-sm font-display text-info mb-3">🔍 Info de Datos Cargados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong className="text-text-secondary">Período Analizado:</strong>
                    <div className="font-mono text-text-muted mt-1">{currentMonth}</div>
                    <strong className="text-text-secondary mt-2 block">Total Cuentas:</strong>
                    <div className="font-mono text-text-muted mt-1">{data?.raw?.length || 0} cuentas cargadas</div>
                  </div>
                  <div>
                    <strong className="text-text-secondary">Meses Disponibles:</strong>
                    <div className="font-mono text-text-muted mt-1">
                      {data?.monthly ? Object.keys(data.monthly).join(', ') : 'Ninguno'}
                    </div>
                    <strong className="text-text-secondary mt-2 block">¿Datos Antiguos?</strong>
                    <div className="text-text-muted mt-1">
                      Si ves datos incorrectos, usa "Limpiar Caché" arriba ↗️
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota importante */}
              <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/30">
                <div className="flex items-center gap-2 text-warning text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-display">Nota:</span>
                  <span className="text-text-muted">
                    Esta es una vista de debugging. Los cambios en la configuración requieren modificar el código fuente.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountDetectionPanel;