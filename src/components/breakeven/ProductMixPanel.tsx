import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Package, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Save, RotateCcw, Calculator, Database } from 'lucide-react';
import { ProductBreakEven, MultiProductBreakEvenData, CombinedData } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { loadCombinedData } from '../../utils/productionStorage';
import { useYear } from '../../contexts/YearContext';

interface ProductMixPanelProps {
  onProductMixChange?: (productMix: ProductBreakEven[]) => void;
  costosFijos: number;
  currentMonth: string;
  className?: string;
}

const ProductMixPanel: React.FC<ProductMixPanelProps> = ({
  onProductMixChange,
  costosFijos,
  currentMonth,
  className = ''
}) => {
  const { selectedYear } = useYear();
  const [isOpen, setIsOpen] = useState(false);
  const [useRealData, setUseRealData] = useState(true); // SIEMPRE usar datos reales por defecto
  const [realProductionData, setRealProductionData] = useState<CombinedData | null>(null);
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductBreakEven[]>([
    {
      productId: 'product-1',
      productName: 'Producto A',
      precioVentaUnitario: 100,
      costoVariableUnitario: 60,
      margenContribucionUnitario: 40,
      participacionVentas: 60,
      unidadMedida: 'unidades',
      categoria: 'Principal'
    },
    {
      productId: 'product-2',
      productName: 'Producto B',
      precioVentaUnitario: 150,
      costoVariableUnitario: 80,
      margenContribucionUnitario: 70,
      participacionVentas: 40,
      unidadMedida: 'unidades',
      categoria: 'Secundario'
    }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateProductsFromRealData = useCallback((combined: CombinedData) => {
    if (!combined || !combined.production || combined.production.length === 0) {
      return;
    }

    try {
      type MonthData = {
        metrosVendidos: number;
        ingresos: number;
        costoProduccionPorMetro: number;
        costoVariablePorMetro?: number;
      };

      let monthData: MonthData | null = null;

      if (currentMonth === 'Anual' || currentMonth === 'Promedio') {
        const totalVendidos = combined.production.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0);
        const monthsCount = combined.production.length || 1;
        const yearly = combined.financial?.yearly;

        if (totalVendidos > 0 && yearly) {
          const promedioVendidos = totalVendidos / monthsCount;
          const ingresosPromedio = yearly.ingresos / monthsCount;
          const costoVentasPromedio = yearly.costoVentasTotal / monthsCount;
          monthData = {
            metrosVendidos: promedioVendidos,
            ingresos: ingresosPromedio,
            costoProduccionPorMetro: promedioVendidos > 0 ? costoVentasPromedio / promedioVendidos : 0
          };
        }
      } else {
        const productionMonth = combined.production.find((p) => p.month === currentMonth);
        const monthlyFinancial = combined.financial?.monthly?.[currentMonth];
        const operationalMonth = combined.operational?.find((o) => o.month === currentMonth);

        if (productionMonth && monthlyFinancial) {
          const metrosVendidos = productionMonth.metrosVendidos || 0;
          if (metrosVendidos > 0) {
            const ingresosCalculados = operationalMonth?.precioVentaPorMetro
              ? operationalMonth.precioVentaPorMetro * metrosVendidos
              : monthlyFinancial.ingresos;
            const costoVariablePorMetro = operationalMonth?.costoVariablePorMetro
              ?? (monthlyFinancial.costosVariables / metrosVendidos);
            monthData = {
              metrosVendidos,
              ingresos: ingresosCalculados,
              costoProduccionPorMetro: costoVariablePorMetro,
              costoVariablePorMetro
            };
          }
        }
      }

      if (!monthData || !monthData.metrosVendidos || monthData.metrosVendidos <= 0) {
        return;
      }

      const precioUnitarioBase = monthData.ingresos / monthData.metrosVendidos;
      const costoVariableBase = monthData.costoVariablePorMetro ?? monthData.costoProduccionPorMetro;

      if (precioUnitarioBase <= 0 || costoVariableBase <= 0) {
        return;
      }

      const realProducts: ProductBreakEven[] = [
        {
          productId: 'real-product-1',
          productName: 'Producto Principal (m²)',
          precioVentaUnitario: precioUnitarioBase,
          costoVariableUnitario: costoVariableBase,
          margenContribucionUnitario: 0,
          participacionVentas: 70,
          unidadMedida: 'm²',
          categoria: 'Principal',
          unidadesVendidas: monthData.metrosVendidos * 0.7
        },
        {
          productId: 'real-product-2',
          productName: 'Producto Secundario (m²)',
          precioVentaUnitario: precioUnitarioBase * 0.8,
          costoVariableUnitario: costoVariableBase * 0.9,
          margenContribucionUnitario: 0,
          participacionVentas: 30,
          unidadMedida: 'm²',
          categoria: 'Secundario',
          unidadesVendidas: monthData.metrosVendidos * 0.3
        }
      ];

      setProducts(realProducts);
      setUseRealData(true);
      setErrors({});
    } catch (error) {
      // console.error('Error generando productos desde datos reales:', error);
    }
  }, [currentMonth]);

  useEffect(() => {
    let isMounted = true;

    const fetchRealData = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      setIsLoadingRealData(true);
      setLoadError(null);

      try {
        const yearToLoad = selectedYear ?? new Date().getFullYear();
        const combined = await loadCombinedData(yearToLoad);
        if (!isMounted) {
          return;
        }
        setRealProductionData(combined);
      } catch (error) {
        if (isMounted) {
          setRealProductionData(null);
          setLoadError(error instanceof Error ? error.message : 'Error cargando datos reales de producción');
        }
      } finally {
        if (isMounted) {
          setIsLoadingRealData(false);
        }
      }
    };

    fetchRealData();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  useEffect(() => {
    if (realProductionData && useRealData) {
      generateProductsFromRealData(realProductionData);
    }
  }, [realProductionData, useRealData, currentMonth, generateProductsFromRealData]);

  // Calcular margen de contribución automáticamente
  useEffect(() => {
    const updatedProducts = products.map(product => ({
      ...product,
      margenContribucionUnitario: product.precioVentaUnitario - product.costoVariableUnitario
    }));
    setProducts(updatedProducts);
  }, [products.map(p => `${p.precioVentaUnitario}-${p.costoVariableUnitario}`).join(',')]);

  // Validaciones
  const validationResults = useMemo(() => {
    const totalParticipacion = products.reduce((sum, p) => sum + p.participacionVentas, 0);
    const hasNegativeMargins = products.some(p => p.margenContribucionUnitario <= 0);
    const hasEmptyNames = products.some(p => !p.productName.trim());
    const hasDuplicateNames = new Set(products.map(p => p.productName)).size !== products.length;
    
    return {
      totalParticipacion,
      isValidParticipacion: Math.abs(totalParticipacion - 100) < 0.01,
      hasNegativeMargins,
      hasEmptyNames,
      hasDuplicateNames,
      isValid: Math.abs(totalParticipacion - 100) < 0.01 && !hasNegativeMargins && !hasEmptyNames && !hasDuplicateNames
    };
  }, [products]);

  // Cálculo del análisis multiproducto
  const multiProductAnalysis = useMemo((): MultiProductBreakEvenData | null => {
    if (!validationResults.isValid) return null;

    const mcppTotal = products.reduce((sum, product) => 
      sum + (product.margenContribucionUnitario * product.participacionVentas / 100), 0
    );

    const breakEvenTotalUnidades = mcppTotal > 0 ? costosFijos / mcppTotal : 0;
    
    const breakEvenByProduct: Record<string, { unidades: number; valor: number }> = {};
    const salesMixActual: Record<string, number> = {};
    const rentabilidadByProduct: Record<string, number> = {};
    
    let breakEvenTotalValor = 0;

    products.forEach(product => {
      const unidadesParaEquilibrio = breakEvenTotalUnidades * (product.participacionVentas / 100);
      const valorParaEquilibrio = unidadesParaEquilibrio * product.precioVentaUnitario;
      
      breakEvenByProduct[product.productId] = {
        unidades: unidadesParaEquilibrio,
        valor: valorParaEquilibrio
      };
      
      salesMixActual[product.productId] = product.participacionVentas;
      rentabilidadByProduct[product.productId] = product.margenContribucionUnitario / product.precioVentaUnitario * 100;
      
      breakEvenTotalValor += valorParaEquilibrio;
    });

    return {
      products,
      mcppTotal,
      breakEvenTotalUnidades,
      breakEvenTotalValor,
      breakEvenByProduct,
      salesMixActual,
      rentabilidadByProduct
    };
  }, [products, costosFijos, validationResults.isValid]);

  // Notificar cambios al componente padre
  useEffect(() => {
    if (onProductMixChange && validationResults.isValid) {
      onProductMixChange(products);
    }
  }, [products, validationResults.isValid, onProductMixChange]);

  const addProduct = () => {
    const newProduct: ProductBreakEven = {
      productId: `product-${Date.now()}`,
      productName: `Producto ${products.length + 1}`,
      precioVentaUnitario: 100,
      costoVariableUnitario: 60,
      margenContribucionUnitario: 40,
      participacionVentas: 0,
      unidadMedida: 'unidades',
      categoria: 'Nuevo'
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = (productId: string) => {
    if (products.length <= 2) return; // Mínimo 2 productos
    setProducts(products.filter(p => p.productId !== productId));
  };

  const updateProduct = (productId: string, field: keyof ProductBreakEven, value: any) => {
    setProducts(products.map(product => 
      product.productId === productId 
        ? { ...product, [field]: value }
        : product
    ));
  };

  const distributeEvenly = () => {
    const equalShare = 100 / products.length;
    setProducts(products.map(product => ({
      ...product,
      participacionVentas: equalShare
    })));
  };

  const resetToDefaults = () => {
    setProducts([
      {
        productId: 'product-1',
        productName: 'Producto A',
        precioVentaUnitario: 100,
        costoVariableUnitario: 60,
        margenContribucionUnitario: 40,
        participacionVentas: 60,
        unidadMedida: 'unidades',
        categoria: 'Principal'
      },
      {
        productId: 'product-2',
        productName: 'Producto B',
        precioVentaUnitario: 150,
        costoVariableUnitario: 80,
        margenContribucionUnitario: 70,
        participacionVentas: 40,
        unidadMedida: 'unidades',
        categoria: 'Secundario'
      }
    ]);
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
          isOpen
            ? 'border-accent/50 bg-accent/10 text-accent shadow-glow-accent'
            : 'border-border hover:border-accent/30 text-text-secondary hover:bg-glass/50'
        }`}
      >
        <Package className="w-4 h-4" />
        {isOpen ? 'Cerrar Mix Productos' : 'Análisis Multi-Producto'}
        {products.length > 0 && (
          <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
            validationResults.isValid ? 'bg-accent/20 text-accent' : 'bg-warning/20 text-warning'
          }`}>
            {products.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 hologram-card rounded-xl border border-accent/30 bg-accent/5 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                    <BarChart3 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-accent">
                      Análisis Multiproducto (MCPP)
                    </h3>
                    <p className="text-sm text-text-muted">
                      Margen de Contribución Promedio Ponderado
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={distributeEvenly}
                    className="px-3 py-1 text-xs rounded-lg bg-glass border border-border hover:border-accent/30 text-text-secondary transition-all duration-200"
                  >
                    Distribuir Igual
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className="p-2 rounded-lg bg-glass border border-border hover:border-warning/30 text-text-secondary transition-all duration-200"
                    title="Volver a productos de ejemplo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={addProduct}
                    className="p-2 rounded-lg bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Validaciones */}
              <div className="mb-4 space-y-2">
                {isLoadingRealData && (
                  <div className="flex items-center gap-2 text-info text-sm p-2 bg-info/10 rounded-lg border border-info/20">
                    <Database className="w-4 h-4 animate-spin" />
                    Cargando métricas reales de producción...
                  </div>
                )}
                {loadError && (
                  <div className="flex items-center gap-2 text-danger text-sm p-2 bg-danger/10 rounded-lg border border-danger/20">
                    <AlertTriangle className="w-4 h-4" />
                    No se pudieron sincronizar los datos de producción: {loadError}
                  </div>
                )}
                {realProductionData && !loadError && (
                  <div className="flex items-center gap-2 text-info text-sm p-2 bg-info/10 rounded-lg border border-info/20">
                    <Database className="w-4 h-4" />
                    Datos reales de producción ({currentMonth}) - Precios y costos calculados desde m² vendidos
                  </div>
                )}
                {!validationResults.isValidParticipacion && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Participación total: {validationResults.totalParticipacion.toFixed(1)}% (debe ser 100%)
                  </div>
                )}
                {validationResults.hasNegativeMargins && (
                  <div className="flex items-center gap-2 text-danger text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Algunos productos tienen margen de contribución negativo
                  </div>
                )}
                {validationResults.isValid && (
                  <div className="flex items-center gap-2 text-accent text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Configuración válida - Análisis disponible
                  </div>
                )}
              </div>

              {/* Lista de Productos */}
              <div className="space-y-4 mb-6">
                {products.map((product, index) => (
                  <motion.div
                    key={product.productId}
                    layout
                    className="glass-card p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={product.productName}
                        onChange={(e) => updateProduct(product.productId, 'productName', e.target.value)}
                        className="text-lg font-display bg-transparent border-b border-border focus:border-accent outline-none text-text-secondary"
                        placeholder="Nombre del producto"
                      />
                      {products.length > 2 && (
                        <button
                          onClick={() => removeProduct(product.productId)}
                          className="p-1 rounded text-danger hover:bg-danger/20 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-text-dim uppercase tracking-wider">Precio Venta</label>
                        <input
                          type="number"
                          value={product.precioVentaUnitario}
                          onChange={(e) => updateProduct(product.productId, 'precioVentaUnitario', Number(e.target.value))}
                          className="w-full p-2 bg-glass rounded border border-border focus:border-accent outline-none text-text-secondary"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-text-dim uppercase tracking-wider">Costo Variable</label>
                        <input
                          type="number"
                          value={product.costoVariableUnitario}
                          onChange={(e) => updateProduct(product.productId, 'costoVariableUnitario', Number(e.target.value))}
                          className="w-full p-2 bg-glass rounded border border-border focus:border-accent outline-none text-text-secondary"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-text-dim uppercase tracking-wider">Margen Contrib.</label>
                        <div className={`p-2 bg-glass/50 rounded border text-center font-mono ${
                          product.margenContribucionUnitario > 0 ? 'text-accent' : 'text-danger'
                        }`}>
                          {formatCurrency(product.margenContribucionUnitario)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs text-text-dim uppercase tracking-wider">Mix % Ventas</label>
                        <input
                          type="number"
                          value={product.participacionVentas}
                          onChange={(e) => updateProduct(product.productId, 'participacionVentas', Number(e.target.value))}
                          className="w-full p-2 bg-glass rounded border border-border focus:border-accent outline-none text-text-secondary"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Resultados del Análisis */}
              {multiProductAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 rounded-lg border-2 border-accent/30 bg-accent/10"
                >
                  <h4 className="text-lg font-display text-accent mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Resultados del Análisis MCPP
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-mono text-accent">
                        {formatCurrency(multiProductAnalysis.mcppTotal)}
                      </div>
                      <div className="text-xs text-text-dim uppercase">MCPP Total</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-mono text-primary">
                        {Math.round(multiProductAnalysis.breakEvenTotalUnidades).toLocaleString()}
                      </div>
                      <div className="text-xs text-text-dim uppercase">
                        {useRealData ? 'm² P.E.' : 'Unidades P.E.'}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-mono text-warning">
                        {formatCurrency(multiProductAnalysis.breakEvenTotalValor)}
                      </div>
                      <div className="text-xs text-text-dim uppercase">Valor P.E.</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-mono text-accent">
                        {((multiProductAnalysis.mcppTotal / costosFijos) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-text-dim uppercase">Eficiencia</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-display text-text-secondary">Punto de Equilibrio por Producto:</h5>
                    {products.map(product => {
                      const peData = multiProductAnalysis.breakEvenByProduct[product.productId];
                      return (
                        <div key={product.productId} className="flex justify-between items-center text-sm">
                          <span className="text-text-muted">{product.productName}:</span>
                          <span className="font-mono text-text-secondary">
                            {Math.round(peData.unidades).toLocaleString()} {useRealData ? 'm²' : 'unidades'} / {formatCurrency(peData.valor)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductMixPanel;
