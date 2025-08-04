import React from 'react';
import { useFinancialData } from '../contexts/DataContext';

const DashboardKPIsMinimal: React.FC = () => {
  const { data } = useFinancialData();
  
  // Si no hay datos, mostrar mensaje simple
  if (!data) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        textAlign: 'center'
      }}>
        <div>
          <h2 style={{ color: '#10b981', fontSize: '24px', marginBottom: '16px' }}>
            No hay datos disponibles
          </h2>
          <p style={{ color: '#6b7280' }}>
            Por favor, carga tu archivo CSV en la sección de Configuración.
          </p>
        </div>
      </div>
    );
  }

  // Verificación básica sin usar Object.keys o métodos complejos
  if (!data.yearly) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        textAlign: 'center'
      }}>
        <div>
          <h2 style={{ color: '#10b981', fontSize: '24px', marginBottom: '16px' }}>
            Datos yearly no disponibles
          </h2>
          <p style={{ color: '#6b7280' }}>
            Por favor, recarga tu archivo CSV.
          </p>
        </div>
      </div>
    );
  }

  // Extraer datos de forma segura
  const ingresos = data.yearly.ingresos || 0;
  const ebitda = data.yearly.ebitda || 0;
  const utilidadNeta = data.yearly.utilidadNeta || 0;

  // Formatear moneda de forma simple
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ 
        fontSize: '36px', 
        color: '#10b981', 
        textAlign: 'center', 
        marginBottom: '32px' 
      }}>
        Cuadro de Mando de KPIs
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Card Ingresos */}
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#10b981', fontSize: '18px', marginBottom: '8px' }}>
            Ingresos Anuales
          </h3>
          <p style={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold' }}>
            {formatCurrency(ingresos)}
          </p>
        </div>

        {/* Card EBITDA */}
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#3b82f6', fontSize: '18px', marginBottom: '8px' }}>
            EBITDA Anual
          </h3>
          <p style={{ color: '#3b82f6', fontSize: '28px', fontWeight: 'bold' }}>
            {formatCurrency(ebitda)}
          </p>
        </div>

        {/* Card Utilidad Neta */}
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: utilidadNeta >= 0 ? '#10b981' : '#ef4444', fontSize: '18px', marginBottom: '8px' }}>
            Utilidad Neta Anual
          </h3>
          <p style={{ color: utilidadNeta >= 0 ? '#10b981' : '#ef4444', fontSize: '28px', fontWeight: 'bold' }}>
            {formatCurrency(utilidadNeta)}
          </p>
        </div>

        {/* Card Margen EBITDA */}
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#3b82f6', fontSize: '18px', marginBottom: '8px' }}>
            Margen EBITDA
          </h3>
          <p style={{ color: '#3b82f6', fontSize: '28px', fontWeight: 'bold' }}>
            {ingresos > 0 ? ((ebitda / ingresos) * 100).toFixed(2) : '0.00'}%
          </p>
        </div>
      </div>

      {/* Información básica de datos mensuales */}
      <div style={{
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#6b7280', fontSize: '18px', marginBottom: '16px' }}>
          Estado de los Datos
        </h3>
        <p style={{ color: '#6b7280' }}>
          {data.monthly ? 'Datos mensuales cargados correctamente' : 'No hay datos mensuales disponibles'}
        </p>
        {data.kpis && (
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            KPIs calculados: {Array.isArray(data.kpis) ? data.kpis.length : 0}
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardKPIsMinimal;