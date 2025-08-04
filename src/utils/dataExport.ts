import { FinancialData } from '../types';
import { formatCurrency } from './formatters';

export const exportToCSV = (data: FinancialData, filename: string = 'reporte-financiero.csv') => {
  const csvContent = generateCSVContent(data);
  downloadFile(csvContent, filename, 'text/csv');
};

export const exportToJSON = (data: FinancialData, filename: string = 'datos-financieros.json') => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};

const generateCSVContent = (data: FinancialData): string => {
  const headers = ['Mes', 'Ingresos', 'EBITDA', 'Utilidad Neta', 'Punto de Equilibrio'];
  const rows = [headers.join(',')];

  // Validación defensiva para evitar errores con Object.entries
  if (data.monthly && typeof data.monthly === 'object') {
    Object.entries(data.monthly).forEach(([month, monthData]) => {
      const row = [
        month,
        (monthData?.ingresos || 0).toString(),
        (monthData?.ebitda || 0).toString(),
        (monthData?.utilidadNeta || 0).toString(),
        (monthData?.puntoEquilibrio || 0).toString(),
      ];
      rows.push(row.join(','));
    });
  }

  return rows.join('\n');
};

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};