import React from 'react';
import { Loader2 } from 'lucide-react';
import UploadCard from '../modules/statusProduccion/components/UploadCard';
import StatusTable from '../modules/statusProduccion/components/StatusTable';
import { useArchivedProductionItems } from '../modules/statusProduccion/hooks/useArchivedProductionItems';

const ProductionArchive: React.FC = () => {
  const {
    items,
    statusOptions,
    loading,
    error,
    updateItem,
    isSaving,
    deleteQuote,
  } = useArchivedProductionItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Archivo Histórico de Producción</h1>
        <p className="text-text-muted max-w-3xl">
          Consulta el registro de todas las cotizaciones y productos cuyo estado es "Entregado".
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-border shadow-hologram p-12 flex flex-col items-center justify-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
          <p>Cargando matriz de producción...</p>
        </div>
      ) : (
        <StatusTable
          items={items}
          statusOptions={statusOptions}
          onSave={updateItem}
          isSaving={isSaving}
          onDeleteQuote={deleteQuote}
          viewMode="quotes"
        />
      )}
    </div>
  );
};

export default ProductionArchive;
