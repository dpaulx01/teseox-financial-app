import { PnlResult, AccountNode } from './pnlCalculator';

export interface PnlInsight {
  id: string;
  type: 'info' | 'warning' | 'critical';
  targetCode: string; // Código de la cuenta a la que se aplica
  message: string;
}

export class PnlInsightEngine {
  private insights: PnlInsight[] = [];

  constructor(private currentPnl: PnlResult, private previousPnl?: PnlResult) {}

  public run(): PnlInsight[] {
    this.insights = [];
    this.currentPnl.treeData.forEach(node => this.analyzeNode(node));
    return this.insights;
  }

  private analyzeNode(node: AccountNode) {
    // Lógica de detección de anomalías irá aquí
    // Ejemplo: Detectar un gran cambio en el análisis horizontal
    if (node.horizontalChange && Math.abs(node.horizontalChange.percentage) > 50) {
      this.insights.push({
        id: `h-change-${node.code}`,
        type: 'warning',
        targetCode: node.code,
        message: `Variación significativa del ${node.horizontalChange.percentage.toFixed(1)}% respecto al período anterior.`,
      });
    }

    node.children.forEach(child => this.analyzeNode(child));
  }
}
