// 🚨 VALIDADOR DE INTEGRIDAD DE DATOS
// Detecta inconsistencias críticas en los cálculos financieros

export interface DataIntegrityIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  expectedValue?: number;
  actualValue?: number;
  discrepancy?: number;
  affectedAnalysis?: string[];
}

export interface DataIntegrityResult {
  isValid: boolean;
  issues: DataIntegrityIssue[];
  criticalIssues: DataIntegrityIssue[];
  warningIssues: DataIntegrityIssue[];
}

export function validateDataIntegrity(
  contableData: any,
  operativoData: any,
  cajaData: any,
  tolerancePercent: number = 0.1 // 0.1% de tolerancia para errores de redondeo
): DataIntegrityResult {
  const issues: DataIntegrityIssue[] = [];

  // 1. VALIDACIÓN FUNDAMENTAL: P.E. = Costos Fijos ÷ Margen Contribución %
  const validateBreakEvenFormula = (data: any, type: string) => {
    if (data.margenContribucionPorc > 0) {
      const expectedPE = data.costosFijos / data.margenContribucionPorc;
      const actualPE = data.puntoEquilibrio;
      const discrepancy = Math.abs(expectedPE - actualPE);
      const discrepancyPercent = (discrepancy / expectedPE) * 100;

      if (discrepancyPercent > tolerancePercent) {
        issues.push({
          severity: 'critical',
          type: 'FORMULA_VALIDATION_FAILURE',
          message: `P.E. ${type} no coincide con la fórmula básica CFT ÷ MC%`,
          expectedValue: expectedPE,
          actualValue: actualPE,
          discrepancy: discrepancy,
          affectedAnalysis: [type]
        });
      }
    }
  };

  validateBreakEvenFormula(contableData, 'Contable');
  validateBreakEvenFormula(operativoData, 'Operativo');
  validateBreakEvenFormula(cajaData, 'Caja');

  // 2. VALIDACIÓN ESTRUCTURAL: P.E. Contable >= P.E. Operativo >= P.E. Caja
  if (contableData.puntoEquilibrio < operativoData.puntoEquilibrio) {
    issues.push({
      severity: 'critical',
      type: 'STRUCTURAL_HIERARCHY_VIOLATION',
      message: 'P.E. Contable debe ser mayor o igual que P.E. Operativo',
      expectedValue: operativoData.puntoEquilibrio,
      actualValue: contableData.puntoEquilibrio,
      affectedAnalysis: ['Contable', 'Operativo']
    });
  }

  if (operativoData.puntoEquilibrio < cajaData.puntoEquilibrio) {
    issues.push({
      severity: 'critical',
      type: 'STRUCTURAL_HIERARCHY_VIOLATION',
      message: 'P.E. Operativo debe ser mayor o igual que P.E. Caja',
      expectedValue: cajaData.puntoEquilibrio,
      actualValue: operativoData.puntoEquilibrio,
      affectedAnalysis: ['Operativo', 'Caja']
    });
  }

  // 3. VALIDACIÓN DE COSTOS FIJOS: CFT Contable >= CFT Operativo >= CFT Caja
  if (contableData.costosFijos < operativoData.costosFijos) {
    issues.push({
      severity: 'warning',
      type: 'COST_HIERARCHY_ISSUE',
      message: 'Costos fijos contables menores que operativos (inusual)',
      expectedValue: operativoData.costosFijos,
      actualValue: contableData.costosFijos,
      affectedAnalysis: ['Contable', 'Operativo']
    });
  }

  if (operativoData.costosFijos < cajaData.costosFijos) {
    issues.push({
      severity: 'warning',
      type: 'COST_HIERARCHY_ISSUE',
      message: 'Costos fijos operativos menores que de caja (inusual)',
      expectedValue: cajaData.costosFijos,
      actualValue: operativoData.costosFijos,
      affectedAnalysis: ['Operativo', 'Caja']
    });
  }

  // 4. VALIDACIÓN DE COHERENCIA: Mismo margen contribución para todos los tipos
  const mcContable = contableData.margenContribucionPorc;
  const mcOperativo = operativoData.margenContribucionPorc;
  const mcCaja = cajaData.margenContribucionPorc;

  if (Math.abs(mcContable - mcOperativo) > tolerancePercent) {
    issues.push({
      severity: 'critical',
      type: 'MARGIN_INCONSISTENCY',
      message: 'Margen de contribución debe ser igual entre análisis Contable y Operativo',
      expectedValue: mcContable,
      actualValue: mcOperativo,
      affectedAnalysis: ['Contable', 'Operativo']
    });
  }

  if (Math.abs(mcOperativo - mcCaja) > tolerancePercent) {
    issues.push({
      severity: 'critical',
      type: 'MARGIN_INCONSISTENCY',
      message: 'Margen de contribución debe ser igual entre análisis Operativo y Caja',
      expectedValue: mcOperativo,
      actualValue: mcCaja,
      affectedAnalysis: ['Operativo', 'Caja']
    });
  }

  // 5. VALIDACIÓN DE VALORES EXTREMOS
  const allData = [contableData, operativoData, cajaData];
  allData.forEach((data, index) => {
    const types = ['Contable', 'Operativo', 'Caja'];
    const type = types[index];

    if (data.margenContribucionPorc <= 0 || data.margenContribucionPorc > 1) {
      issues.push({
        severity: 'critical',
        type: 'INVALID_MARGIN_PERCENTAGE',
        message: `Margen de contribución ${type} fuera del rango válido (0-100%)`,
        actualValue: data.margenContribucionPorc * 100,
        affectedAnalysis: [type]
      });
    }

    if (data.puntoEquilibrio < 0) {
      issues.push({
        severity: 'critical',
        type: 'NEGATIVE_BREAK_EVEN',
        message: `Punto de equilibrio ${type} negativo`,
        actualValue: data.puntoEquilibrio,
        affectedAnalysis: [type]
      });
    }

    if (data.costosFijos < 0) {
      issues.push({
        severity: 'critical',
        type: 'NEGATIVE_FIXED_COSTS',
        message: `Costos fijos ${type} negativos`,
        actualValue: data.costosFijos,
        affectedAnalysis: [type]
      });
    }
  });

  // Separar por severidad
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  return {
    isValid: criticalIssues.length === 0,
    issues,
    criticalIssues,
    warningIssues
  };
}

export function generateIntegrityReport(result: DataIntegrityResult): string {
  if (result.isValid) {
    return "✅ Integridad de datos verificada. Todos los cálculos son consistentes.";
  }

  let report = "🚨 ALERTA DE INTEGRIDAD DE DATOS:\n\n";
  
  if ((result.criticalIssues || []).length > 0) {
    report += "ERRORES CRÍTICOS:\n";
    (result.criticalIssues || []).forEach((issue, index) => {
      report += `${index + 1}. ${issue.message}\n`;
      if (issue.expectedValue !== undefined && issue.actualValue !== undefined) {
        report += `   Esperado: ${issue.expectedValue.toFixed(2)} | Actual: ${issue.actualValue.toFixed(2)}\n`;
        if (issue.discrepancy) {
          report += `   Discrepancia: ${issue.discrepancy.toFixed(2)}\n`;
        }
      }
      report += "\n";
    });
  }

  if (result.warningIssues.length > 0) {
    report += "ADVERTENCIAS:\n";
    result.warningIssues.forEach((issue, index) => {
      report += `${index + 1}. ${issue.message}\n`;
      if (issue.expectedValue !== undefined && issue.actualValue !== undefined) {
        report += `   Esperado: ${issue.expectedValue.toFixed(2)} | Actual: ${issue.actualValue.toFixed(2)}\n`;
      }
      report += "\n";
    });
  }

  return report;
}