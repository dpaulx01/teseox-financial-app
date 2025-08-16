# 📊 Balance Interno - Progreso del Módulo y Estado Crítico

## 🚨 **ESTADO ACTUAL: CRÍTICO**
**PROBLEMA URGENTE**: calculatePnl falla en ejecuciones posteriores a la primera

## ⚠️ Error Crítico Actual

### Descripción del Problema
El método `calculatePnl` en `EditablePygMatrixV2.tsx` funciona correctamente en la primera ejecución pero falla en ejecuciones subsecuentes con:
```
Error: No financial data found for period: Enero
```

### Evidencia del Error
**Primera ejecución (EXITOSA)**:
```
💰 BALANCE INTERNO UTILIDADES enero: {
  ub: -2931, un: -2911, ebitda: -1353, inputMonth: "Enero"
}
```

**Ejecuciones posteriores (FALLAN)**:
```
Error calculando utilidades para enero: Error: No financial data found for period: Enero
```

### Ubicación del Error
- **Archivo**: `src/utils/pnlCalculator.ts`
- **Línea**: 120
- **Función**: `calculatePnl()`
- **Validación que falla**: `if (!periodData) throw new Error(...)`

### Datos Disponibles Confirmados
- `workingData.monthly` contiene: `['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']`
- `workingData.raw` tiene 124 filas con columnas capitalizadas: `['Enero', 'Febrero', etc.]`
- Los datos están presentes pero la validación falla por alguna razón

## 🎯 Resumen Ejecutivo ANTES del Error
El módulo de Balance Interno estaba funcionando correctamente hasta encontrar este bug crítico.

## ✅ Logros Principales Completados

### 1. **Corrección de Datos por Mes** ✔️
**Problema resuelto**: Todos los meses mostraban valores de junio
**Solución**: Modificación de `getAccountValueForRow()` para consultar datos raw directamente
```typescript
const getAccountValueForRow = (code: string, monthData: MonthlyData, month: string): number => {
  if (workingData?.raw) {
    const rawRow = workingData.raw.find(r => r['COD.'] === code);
    if (rawRow) {
      const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      return parseFloat(rawRow[monthKey] as string) || 0;
    }
  }
  return 0;
};
```

### 2. **Implementación de Utilidades Diferenciadas** ✔️ 
**Problema resuelto**: UB, UN y EBITDA mostraban valores idénticos
**Solución**: Uso exacto de la lógica de `PygContainer.tsx` con diferentes perspectivas
- **UB (Utilidad Bruta)**: Perspectiva 'contable' - Sin exclusiones
- **UN (Utilidad Neta/EBIT)**: Perspectiva 'operativo' - Excluye intereses
- **EBITDA**: Perspectiva 'caja' - Excluye depreciación e intereses

### 3. **Eliminación de Selector de Perspectiva** ✔️
**Problema resuelto**: Selector innecesario que confundía la funcionalidad
**Solución**: Eliminado completamente - Las 3 utilidades se muestran como filas fijas

### 4. **Corrección de Alineación** ✔️
**Problema resuelto**: Utilidades aparecían en columnas incorrectas
**Solución**: Ajuste de `colSpan` y estructura de tabla

## 📋 Arquitectura del Módulo

### Contextos y Flujo de Datos
```typescript
DataContext/ScenarioContext → workingData → ProjectionEngine → calculatePnl → Matrix Rendering
```

### Componente Principal: EditablePygMatrixV2.tsx
**Líneas clave**:
- **415-444**: `getAccountValueForRow()` - Obtiene valores por mes específico
- **139-182**: `calculateUtilities()` - Calcula UB, UN, EBITDA  
- **334-341**: Llamada a `calculatePnl()` que funciona en primera ejecución
- **375-377**: Llamada a `calculateUtilities()` que falla en segunda ejecución

### Datos de Entrada
**workingData.raw** (ReportePyG 2024.csv):
```
COD. | CUENTA | Enero | Febrero | Marzo | ... 
4    | Ingresos | 15234.95 | 11371.58 | ...
5    | Costos y Gastos | 36975.14 | 33082.68 | ...
```

**workingData.monthly**:
```javascript
{
  enero: { /* objeto MonthlyData */ },
  febrero: { /* objeto MonthlyData */ },
  // ...
}
```

## 🔍 Análisis del Error Crítico

### Situación Actual en calculatePnl()
```typescript
// src/utils/pnlCalculator.ts:117-121
const periodData = month === 'Anual' ? yearly : monthly[month];
if (!periodData) {
  throw new Error(`No financial data found for period: ${month}`);
}
```

### Hipótesis del Error
1. **Modificación de datos**: `monthly` se modifica entre llamadas
2. **Problema de referencia**: El objeto `financialData` cambia
3. **Race condition**: Múltiples llamadas simultáneas
4. **Formato de mes**: Inconsistencia entre 'enero'/'Enero'

### Logging Crítico Implementado
```typescript
console.log('🔍 BALANCE INTERNO - Calculando utilidades para ${month} (usando: ${monthForCalculation})');
console.log('💰 BALANCE INTERNO UTILIDADES ${month}:', {
  ub, un, ebitda, inputMonth: monthForCalculation
});
```

## 🛠️ Implementación Técnica Completada

### Funciones Principales Corregidas

#### 1. getAccountValueForRow() - FUNCIONANDO ✅
```typescript
const getAccountValueForRow = (code: string, monthData: MonthlyData, month: string): number => {
  if (workingData?.raw) {
    const rawRow = workingData.raw.find(r => r['COD.'] === code);
    if (rawRow) {
      const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      const value = parseFloat(rawRow[monthKey] as string) || 0;
      return value;
    }
  }
  return 0;
};
```

#### 2. calculateUtilities() - FALLA EN SEGUNDA EJECUCIÓN ❌
```typescript
const calculateUtilities = useCallback(async (data: FinancialData, months: string[]) => {
  for (const month of months) {
    const monthForCalculation = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    
    // PRIMERA EJECUCIÓN: ✅ Funciona
    // SEGUNDA+ EJECUCIÓN: ❌ Falla aquí
    const ubResult = await calculatePnl(data, monthForCalculation, 'contable', undefined, 1);
    const unResult = await calculatePnl(data, monthForCalculation, 'operativo', undefined, 1);  
    const ebitdaResult = await calculatePnl(data, monthForCalculation, 'caja', undefined, 1);
  }
}, []);
```

### Configuración de Perspectivas
```typescript
// UB (Utilidad Bruta/Contable) - Sin exclusiones
viewType: 'contable' → includeDepreciacion: true, includeIntereses: true

// UN (Utilidad Neta/EBIT) - Excluye intereses  
viewType: 'operativo' → includeDepreciacion: true, includeIntereses: false

// EBITDA - Excluye depreciación e intereses
viewType: 'caja' → includeDepreciacion: false, includeIntereses: false
```

## 📁 Archivos Críticos del Balance Interno

### Archivo Principal con Error
```
src/components/pyg/EditablePygMatrixV2.tsx (674 líneas)
├── Líneas 139-182: calculateUtilities() ❌ FALLA
├── Líneas 375-377: Llamada que desencadena el error
├── Líneas 415-444: getAccountValueForRow() ✅ FUNCIONA
└── Líneas 334-341: calculatePnl() inicial ✅ FUNCIONA
```

### Archivo donde Ocurre el Error
```
src/utils/pnlCalculator.ts (737 líneas)
├── Línea 120: throw new Error(`No financial data found for period: ${month}`) ❌
├── Líneas 117-121: Validación que falla
├── Líneas 225-228: Misma validación en función alternativa
└── Función calculatePnl(): Entry point del error
```

### Archivos de Contexto 
```
src/contexts/DataContext.tsx - Proporciona workingData
src/contexts/ScenarioContext.tsx - Modo simulación
src/utils/projectionEngine.ts - Completa datos del año
```

### Archivos de Configuración
```
src/constants/breakEvenConfig.ts - Configuración de perspectivas UB/UN/EBITDA
ReportePyG 2024.csv - Datos fuente (124 filas, meses capitalizados)
```

## 🚨 ACCIONES URGENTES REQUERIDAS

### 1. INVESTIGAR calculatePnl() 
```bash
# Debug necesario en pnlCalculator.ts línea 117:
console.log('DEBUG calculatePnl:', {
  month,
  hasMonthly: !!monthly,
  monthlyKeys: monthly ? Object.keys(monthly) : [],
  periodData: !!periodData,
  fullMonthlyObject: monthly
});
```

### 2. VERIFICAR DATOS EN SEGUNDA LLAMADA
```bash
# En EditablePygMatrixV2.tsx antes de calculateUtilities:
console.log('PRE-CALCULATEUTILITIES:', {
  hasWorkingData: !!workingData,
  monthlyKeys: workingData?.monthly ? Object.keys(workingData.monthly) : [],
  rawLength: workingData?.raw?.length,
  availableMonths
});
```

### 3. VALIDAR REFERENCIA DE OBJETO
```bash
# Verificar si workingData/financialData cambia entre llamadas
console.log('DATA REFERENCE:', {
  workingDataId: workingData?._id || 'no-id',
  financialDataId: financialData?._id || 'no-id'
});
```

## 🔧 Estado Crítico del Sistema

### ❌ BLOQUEADO POR ERROR
- **Balance Interno**: Funciona parcialmente (primera carga OK, recálculos fallan)
- **Utilidades UB/UN/EBITDA**: Solo se calculan una vez
- **Módulo**: NO ESTÁ COMPLETAMENTE FUNCIONAL hasta resolver el error

### ✅ PARTES FUNCIONANDO
- Matriz de cuentas con valores por mes específico
- Estructura jerárquica de PyG
- Interfaz visual y navegación
- Datos de entrada correctos

### ⚠️ IMPACTO DEL ERROR
- **Gravedad**: CRÍTICA
- **Funcionalidad afectada**: Recálculo de utilidades
- **Experiencia de usuario**: Degradada (funciona solo al cargar)
- **Datos**: No se pierden, pero cálculos fallan

## 🚦 Próximos Pasos CRÍTICOS

### INMEDIATO (URGENTE)
1. **Debug exhaustivo de calculatePnl()** - Identificar por qué `periodData` es undefined en segunda ejecución
2. **Verificar mutabilidad de datos** - Confirmar si `monthly` se modifica entre llamadas  
3. **Race condition check** - Validar si hay conflictos en llamadas simultáneas
4. **Rollback temporal** - Considerar versión estable anterior si es necesario

### MEDIANO PLAZO 
1. Implementar manejo de errores más robusto
2. Cache de datos para evitar recálculos
3. Tests unitarios para calculatePnl()

## 🎯 CONTEXTO PARA COMPACTACIÓN

**RESUMEN PARA PRÓXIMA SESIÓN**:
El Balance Interno está 85% completado. Todas las funcionalidades principales están implementadas pero hay un bug crítico en `calculatePnl()` que impide el recálculo de utilidades. El error ocurre en `src/utils/pnlCalculator.ts:120` cuando `periodData` es undefined en la segunda ejecución. Los datos están presentes pero la validación falla. El commit `e1fbf39` captura el estado actual. **PRIORIDAD MÁXIMA**: Debug de calculatePnl() para resolver este blocking issue.

---
**Estado**: ⚠️ **85% COMPLETADO - BLOQUEADO POR BUG CRÍTICO**  
**Última actualización**: 2024-08-16  
**Commit actual**: `e1fbf39`