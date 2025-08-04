import { CostClassification } from '../types';

// Clasificación profesional basada en mejores prácticas contables
export const PROFESSIONAL_COST_CLASSIFICATION: Record<string, CostClassification> = {
  
  // ========== COSTOS VARIABLES ==========
  // Materiales y Producción Directa
  'Materiales Utilizados o Productos Vendidos': 'Variable',
  'Productos Terminados C': 'Variable',
  'Costo Mercadería': 'Variable',
  'Materia Prima': 'Variable',
  'Materiales Directos': 'Variable',
  'Insumos Directos': 'Variable',
  
  // Mano de Obra Directa (todas las subcuentas)
  'Sueldos Mano de Obra Directa': 'Variable',
  'Sobretiempos Mano de Obra Directa': 'Variable',
  'Décimo Tercer Sueldo Mano de Obra Directa': 'Variable',
  'Decimo Cuarto Sueldo Mano de Obra Directa': 'Variable',
  'Vacaciones Mano de Obra Directa': 'Variable',
  'Aportes Patronales al I.E.S.S. Mano de Obra Directa': 'Variable',
  'Secap - Iece Mano de Obra Directa': 'Variable',
  'Fondos de Reserva Mano de Obra Directa': 'Variable',
  'Bonificaciones Mano de Obra Directa': 'Variable',
  
  // Costos Variables de Producción
  'Suministros, Materiales y Repuestos Costos': 'Variable',
  'Empaque y Embalaje': 'Variable',
  'Fletes y Transporte Producción': 'Variable',
  'Fletes Vtas.': 'Variable',
  'Terminados y Acabados': 'Variable',
  
  // Costos Variables de Ventas  
  'Comisiones por Ventas': 'Variable',
  'Gastos de Cobranza': 'Variable',
  
  // ========== COSTOS FIJOS ==========
  // Infraestructura y Arriendos
  'Arriendo Planta': 'Fijo',
  'Arriendos Adm.': 'Fijo',
  
  // Depreciaciones y Amortizaciones (CRÍTICO: Siempre fijo)
  'Depreciación Propiedades, Plantas y Equipos': 'Fijo',
  'Amortización Adecuaciones y mejoras en bienes arrendados': 'Fijo',
  'Amortizaciones Intangibles Adm.': 'Fijo',
  
  // Personal Administrativo
  'Sueldos Unificados Adm.': 'Fijo',
  'Aportes Patronales al IESS Adm.': 'Fijo',
  'Secap - Iece Adm.': 'Fijo',
  'Fondos de Reserva Adm.': 'Fijo',
  'Décimo Tercer Sueldo Adm.': 'Fijo',
  'Décimo Cuarto Sueldo Adm.': 'Fijo',
  'Vacaciones Adm.': 'Fijo',
  
  // Servicios Profesionales
  'Honorarios Profesionales Adm.': 'Fijo',
  'Servicios Contratados Adm.': 'Fijo',
  
  // Gastos Financieros (CRÍTICO: Generalmente fijo)
  'Intereses PL': 'Fijo',
  'Comisiones Bancarias y Financieras': 'Fijo',
  'Otros Gastos Financieros': 'Fijo',
  'Gastos de Gestión y Credito': 'Fijo',
  
  // Seguros y Licencias
  'Seguros': 'Fijo',
  'Licencias y Permisos': 'Fijo',
  'Contribuciones a Superintendencia de Compañías Adm.': 'Fijo',
  
  // Servicios Básicos Fijos
  'Limpieza y aseo no deducible': 'Fijo',
  
  // ========== COSTOS MIXTOS/SEMI-VARIABLES ==========
  // Servicios Básicos (Tienen cargo base + consumo)
  'Energía Eléctrica Planta': 'Semi-variable',
  'Energía Eléctrica Vtas.': 'Semi-variable',
  'Agua Adm.': 'Semi-variable',
  'Internet Adm.': 'Semi-variable',
  'Internet Vtas.': 'Semi-variable',
  'Celulares Adm.': 'Semi-variable',
  
  // Mantenimiento (Preventivo fijo + correctivo variable)
  'Herramientas Menores': 'Semi-variable',
  'Mantenimiento Moldes': 'Semi-variable',
  'Equipos y Materiales de Seguridad': 'Semi-variable',
  
  // Combustible (Ruta fija + extra variable)
  'Combustibles Planta': 'Semi-variable',
  'Combustible Adm.': 'Semi-variable',
  
  // Gastos de Gestión Variable
  'Gastos de Gestión Adm.': 'Semi-variable',
  'Publicidad y Promoción Vtas.': 'Semi-variable',
  'Reparaciones, adecuaciones a clientes': 'Semi-variable',
  
  // ========== CASOS ESPECIALES ==========
  // Desperdicios (Normalmente variable, pero pueden tener componente fijo)
  'Desperdicios, Mermas, Desecho': 'Variable',
  
  // Mejoras (Usualmente proyectos puntuales = Fijo)
  'Mejoras En Nueva Planta': 'Fijo',
  'Pallets': 'Variable', // Se usan por producto
  
  // Gastos No Operacionales (Usualmente no recurrentes = Fijo)
  'Multas Superintendencia de Compañías': 'Fijo',
  'Faltantes de Caja': 'Fijo',
  'Fletes y Transporte No Deducibles': 'Semi-variable',
  'Misceláneos No Deducibles': 'Fijo',
  'Comisiones Bancarias': 'Semi-variable',
  'Comisiones, Convenios y multas IESS': 'Fijo',
  'Costos Indirectos No Deducibles': 'Fijo',
  'Reparaciones y Adecuaciones No Deducibles': 'Semi-variable',
  
  // Alimentación (Normalmente fijo para personal)
  'Alimentación Adm.': 'Fijo',
};

// Palabras clave para clasificación automática semántica
export const SEMANTIC_PATTERNS = {
  variable: [
    'materiales', 'materia prima', 'insumos', 'productos terminados', 'mercadería',
    'mano de obra directa', 'sueldos directos', 'empaque', 'embalaje', 'fletes',
    'transporte', 'comisiones', 'cobranza', 'suministros', 'repuestos',
    'terminados', 'acabados', 'desperdicios', 'mermas', 'pallets'
  ],
  fijo: [
    'arriendo', 'alquiler', 'depreciación', 'amortización', 'sueldos administrativos',
    'honorarios', 'intereses', 'seguros', 'licencias', 'contribuciones',
    'limpieza', 'aseo', 'multas', 'faltantes', 'mejoras', 'alimentación',
    'décimo tercer', 'décimo cuarto', 'vacaciones', 'fondos de reserva'
  ],
  semivariable: [
    'energía', 'eléctrica', 'agua', 'internet', 'celulares', 'combustible',
    'mantenimiento', 'herramientas', 'seguridad', 'gestión', 'publicidad',
    'promoción', 'reparaciones', 'adecuaciones', 'misceláneos'
  ]
};

// Patrones estructurales basados en códigos contables
export const STRUCTURAL_PATTERNS = {
  variable: [
    '5.1.1',    // Materiales
    '5.1.2',    // Mano de Obra Directa
    '5.1.4.7',  // Suministros
    '5.1.4.12', // Empaque
    '5.1.4.15', // Fletes
    '5.1.4.19'  // Terminados
  ],
  fijo: [
    '5.1.4.1',  // Depreciación
    '5.1.4.16', // Arriendos
    '5.1.4.18', // Amortización
    '5.2.1.2',  // Administrativos
    '5.2.1.3',  // Gastos Financieros
    '5.2.2.1'   // Gastos No Operacionales
  ],
  semivariable: [
    '5.1.4.13', // Energía Eléctrica
    '5.1.4.17', // Combustibles
    '5.2.1.1',  // Ventas (algunos gastos)
    '5.2.1.2.29', // Gastos de Gestión
    '5.2.1.2.23'  // Combustible Adm
  ]
};

// Configuración del algoritmo inteligente
export const CLASSIFICATION_ALGORITHM_CONFIG = {
  confidence: {
    high: 0.85,    // 85% o más = clasificación automática
    medium: 0.60,  // 60-84% = sugerencia con confirmación
    low: 0.35      // Menos de 35% = requiere intervención manual
  },
  correlation: {
    variable_threshold: 0.70,  // Correlación alta con ventas = Variable
    fixed_threshold: 0.20      // Correlación baja con ventas = Fijo
  },
  volatility: {
    fixed_cv_max: 0.10,       // CV < 10% = probablemente Fijo
    variable_cv_min: 0.30     // CV > 30% = probablemente Variable
  },
  weights: {
    semantic: 0.40,    // 40% del peso a análisis semántico
    behavioral: 0.40,  // 40% del peso a análisis de comportamiento
    structural: 0.20   // 20% del peso a análisis estructural
  }
};