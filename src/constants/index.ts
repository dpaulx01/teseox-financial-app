import { CostClassification } from '../types';

export const COST_CLASSIFICATION: Record<string, CostClassification> = {
  // Costos Variables
  'Productos Terminados C': 'Variable',
  'Sueldos Mano de Obra Directa': 'Variable',
  'Aportes Patronales al I.E.S.S. Mano de Obra Directa': 'Variable',
  'Fletes y Transporte Producción': 'Variable',
  'Fletes Vtas.': 'Variable',
  'Materia Prima': 'Variable',
  'Insumos Directos': 'Variable',
  'Comisiones por Ventas': 'Variable',
  
  // Costos Fijos
  'Depreciación Propiedades, Plantas y Equipos': 'Fijo',
  'Arriendo Planta': 'Fijo',
  'Sueldos Unificados Adm.': 'Fijo',
  'Honorarios Profesionales Adm.': 'Fijo',
  'Arriendos Adm.': 'Fijo',
  'Intereses PL': 'Fijo',
  'Seguros': 'Fijo',
  'Licencias y Permisos': 'Fijo',
  
  // Costos Semi-variables
  'Energía Eléctrica Planta': 'Semi-variable',
  'Servicios Públicos': 'Semi-variable',
  'Teléfono y Comunicaciones': 'Semi-variable',
  'Mantenimiento de Equipos': 'Semi-variable',
  
  // Costos Escalonados (requieren decisiones de capacidad)
  'Supervisión de Planta': 'Escalonado',
  'Alquiler de Almacenes Adicionales': 'Escalonado',
  'Personal de Ventas por Territorios': 'Escalonado',
};

export const PNL_ACCOUNT_CODES = {
  ingresos: '4',
  costoVentas: '5.1',
  gastosVentas: '5.2',
  gastosAdmin: '5.3',
  depreciacion: '5.1.4.1',
};

export const NAV_ITEMS = [
  { id: 'kpi', label: 'Dashboard KPIs', icon: 'BarChart2' },
  { id: 'pnl', label: 'Análisis PyG', icon: 'FileText' },
  { id: 'breakeven', label: 'Punto de Equilibrio', icon: 'Target' },
];