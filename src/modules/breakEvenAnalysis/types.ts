// Tipos específicos para el módulo de análisis de punto de equilibrio

export interface BreakEvenLevel {
  type: 'accounting' | 'operational' | 'cash';
  breakEvenPoint: number;
  marginOfSafety: number;
  contributionMargin: number;
  contributionMarginRatio: number;
}

export interface ClassifiedAccounts {
  [accountCode: string]: {
    type: 'CFT' | 'CVU' | 'PVU' | 'MIX';
    confidence: number;
  };
}

export interface AccountData {
  code: string;
  name: string;
  amount: number;
  type: 'revenue' | 'fixed_cost' | 'variable_cost' | 'mixed_cost';
}