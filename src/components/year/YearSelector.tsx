import React, { useState } from 'react';
import { useYear, YearInfo } from '../../contexts/YearContext';
import CSVUploaderYearAware from '../upload/CSVUploaderYearAware';
import { getTenantBrand } from '../../utils/tenantBrand';

interface YearSelectorProps {
  onYearSelect?: (year: number) => void;
  onContinue?: () => void;
  showUpload?: boolean;
}

export const YearSelector: React.FC<YearSelectorProps> = ({ 
  onYearSelect, 
  onContinue,
  showUpload = true
}) => {
  const { 
    selectedYear, 
    availableYears, 
    isLoading, 
    error, 
    setSelectedYear,
    refreshYears 
  } = useYear();
  const brand = getTenantBrand();
  
  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleYearClick = (yearInfo: YearInfo) => {
    setSelectedYear(yearInfo.year);
    if (onYearSelect) {
      onYearSelect(yearInfo.year);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
  };

  const formatRevenue = (revenue: number): string => {
    if (revenue >= 1000000) {
      return `$${(revenue / 1000000).toFixed(1)}M`;
    } else if (revenue >= 1000) {
      return `$${(revenue / 1000).toFixed(0)}K`;
    } else {
      return `$${revenue.toFixed(0)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="bg-gray-800/80 backdrop-blur-lg border border-cyan-500/30 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
            <span className="text-cyan-400 font-mono">Cargando años disponibles...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center">
        <div className="bg-gray-800/80 backdrop-blur-lg border border-red-500/30 rounded-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-red-400 font-mono text-lg mb-2">Error de Conexión</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={refreshYears}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-mono"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/80 backdrop-blur-lg border border-cyan-500/30 rounded-lg p-8 max-w-2xl w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-cyan-400 text-6xl mb-4">📊</div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">
            {brand.displayName}
          </h1>
          <p className="text-gray-300 font-mono">
            Seleccione el año fiscal para continuar en la plataforma financiera multitenant
          </p>
        </div>

        {/* Lista de años disponibles */}
        <div className="space-y-3 mb-8">
          <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wide mb-4">
            Años Disponibles ({availableYears.length})
          </h3>
          
          {availableYears.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-gray-400 text-4xl mb-2">📂</div>
                <p className="text-gray-300 font-mono">No hay datos financieros cargados</p>
                <p className="text-gray-500 text-sm">Sube un archivo CSV para comenzar</p>
              </div>
              {/* Uploader por año inline para desbloquear el flujo */}
              <CSVUploaderYearAware />
            </div>
          ) : (
            availableYears.map((yearInfo) => (
              <div
                key={yearInfo.year}
                onClick={() => handleYearClick(yearInfo)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all duration-200 
                  ${selectedYear === yearInfo.year
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/25'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-cyan-500/50 hover:bg-gray-700/80'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold font-mono">
                      {yearInfo.year}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm opacity-75">
                        {yearInfo.accounts} cuentas • {yearInfo.records} registros
                      </div>
                      <div className="text-sm opacity-75">
                        Meses: {yearInfo.month_range} ({yearInfo.months} meses)
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatRevenue(yearInfo.total_revenue)}
                    </div>
                    <div className="text-sm opacity-75">
                      Ingresos Totales
                    </div>
                  </div>
                  
                  {selectedYear === yearInfo.year && (
                    <div className="text-cyan-400 text-xl ml-4">✓</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botones de acción */}
        {availableYears.length > 0 && (
          <div className="flex items-center justify-between">
            {/* Botón subir nuevo año */}
            {showUpload && (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors font-mono border border-gray-600 hover:border-gray-500"
              >
                + Subir Nuevo Año
              </button>
            )}
            
            {/* Botón continuar */}
            <button
              onClick={handleContinue}
              disabled={!selectedYear}
              className={`
                px-8 py-3 rounded-lg transition-colors font-mono font-bold
                ${selectedYear
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/25'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {selectedYear ? `Continuar con ${selectedYear} →` : 'Seleccione un año'}
            </button>
          </div>
        )}

        {/* Uploader embebido cuando se despliega */}
        {showUploadForm && availableYears.length > 0 && (
          <div className="mt-6">
            <CSVUploaderYearAware />
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-xs font-mono">
            RBAC Multi-Year Financial Analysis System
          </p>
        </div>
      </div>
    </div>
  );
};

export default YearSelector;
