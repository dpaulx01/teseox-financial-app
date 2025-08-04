import { BreakEvenAnalysisType, BreakEvenLevelConfig } from '../types';

export const BREAK_EVEN_CONFIGS: Record<BreakEvenAnalysisType, BreakEvenLevelConfig> = {
  contable: {
    includeDepreciacion: true,
    includeIntereses: true,
    description: 'Punto de Equilibrio Contable (Estándar)',
    objective: 'Nivel de ventas donde la utilidad neta contable es cero. Incluye todos los gastos contables.'
  },
  operativo: {
    includeDepreciacion: true,
    includeIntereses: false,
    description: 'Punto de Equilibrio Operativo (EBIT)',
    objective: 'Nivel de ventas donde las ganancias antes de intereses e impuestos (EBIT) son cero. Evalúa la eficiencia operativa sin considerar el financiamiento.'
  },
  caja: {
    includeDepreciacion: false,
    includeIntereses: false,
    description: 'Punto de Equilibrio de Caja (EBITDA)', 
    objective: 'Nivel de ventas donde las entradas de efectivo igualan las salidas. Excluye depreciación e intereses.'
  }
};

// NOTA: Detección únicamente por nombres de cuenta para universalidad
// Los códigos pueden variar entre empresas, pero los nombres suelen ser similares
export const SPECIAL_ACCOUNTS = {
  depreciacion: [
    // Códigos eliminados - ahora solo detección por nombre
  ],
  amortizacion: [
    // Códigos eliminados - ahora solo detección por nombre  
  ],
  intereses: [
    // Códigos eliminados - ahora solo detección por nombre
  ]
};

// Nombres de cuentas que pueden indicar depreciación o intereses
export const ACCOUNT_PATTERNS = {
  depreciacion: [
    'depreciación',
    'depreciacion', 
    'depreciation',
    'desgaste',
    'amortización',
    'amortizacion',
    'propiedades, plantas y equipos',
    'intangibles'
  ],
  intereses: [
    'intereses',
    'interest',
    'financier',
    'financiera',
    'financiero',
    'financieros',
    'préstamo',
    'prestamo',
    'crédito',
    'credito',
    'loan',
    'gastos financieros',
    'comisiones bancarias',
    'gastos de gestión',
    'gastos de gestión y credito',
    'gestión y credito',
    'otros gastos financieros'
  ]
};

// Configuración visual para cada tipo de análisis
export const ANALYSIS_VISUAL_CONFIG = {
  contable: {
    color: 'primary',
    chartColor: '#00F0FF',
    icon: '📊',
    bgGradient: 'from-primary/10 to-primary/5'
  },
  operativo: {
    color: 'accent', 
    chartColor: '#00FF99',
    icon: '⚡',
    bgGradient: 'from-accent/10 to-accent/5'
  },
  caja: {
    color: 'warning',
    chartColor: '#FFB800', 
    icon: '💰',
    bgGradient: 'from-warning/10 to-warning/5'
  }
} as const;