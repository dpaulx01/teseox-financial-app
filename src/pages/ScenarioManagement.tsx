import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, Share2, Copy, Trash2, BarChart3, TrendingUp, Play, Eye } from 'lucide-react';
import { useScenario } from '../contexts/ScenarioContext';
import { useFinancialData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateScenarioForm {
  name: string;
  description: string;
  base_year: number;
  category: string;
}

const ScenarioManagement: React.FC = () => {
  const { 
    scenarios, 
    refreshScenarios, 
    createScenario, 
    setActiveScenarioId, 
    duplicateScenario, 
    deleteScenario,
    getScenarioIcon,
    isLoading,
    error,
    clearError,
    scenarioStats
  } = useScenario();

  const { data: financialData } = useFinancialData();

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScenario, setNewScenario] = useState<CreateScenarioForm>({
    name: '',
    description: '',
    base_year: new Date().getFullYear(),
    category: 'simulación'
  });

  // Cargar datos iniciales
  useEffect(() => {
    refreshScenarios();
  }, [refreshScenarios]);

  // Filtrar escenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (scenario.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || scenario.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Manejar creación de escenario
  const handleCreateScenario = async () => {
    if (!newScenario.name.trim()) {
      return;
    }

    if (!financialData) {
      alert('No hay datos financieros disponibles para crear el escenario. Por favor, carga datos financieros primero.');
      return;
    }

    try {
      await createScenario({
        name: newScenario.name,
        description: newScenario.description,
        base_year: newScenario.base_year,
        category: newScenario.category,
        financial_data: financialData
      });
      
      setShowCreateModal(false);
      setNewScenario({ 
        name: '', 
        description: '', 
        base_year: new Date().getFullYear(),
        category: 'simulación'
      });
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  // Navegar a simulación
  const handleEnterSimulation = (scenarioId: number) => {
    setActiveScenarioId(scenarioId);
    // El usuario debería ser redirigido al dashboard principal por el context del App
  };

  // Manejar duplicación
  const handleDuplicate = async (scenarioId: number, currentName: string) => {
    const newName = `${currentName} - Copia`;
    try {
      await duplicateScenario(scenarioId, newName);
    } catch (error) {
      console.error('Error duplicating scenario:', error);
    }
  };

  // Manejar eliminación
  const handleDelete = async (scenarioId: number, name: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el escenario "${name}"?`)) {
      try {
        await deleteScenario(scenarioId);
      } catch (error) {
        console.error('Error deleting scenario:', error);
      }
    }
  };

  // Obtener categorías únicas
  const categories = Array.from(new Set(scenarios.map(s => s.category)));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-4xl">🔬</div>
          <div>
            <h1 className="text-4xl font-display text-primary neon-text">
              Balance Interno
            </h1>
            <p className="text-text-secondary">
              Crea y gestiona escenarios financieros para análisis estratégico
            </p>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {scenarioStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {scenarioStats.total_own_scenarios}
              </div>
              <div className="text-sm text-text-muted">Mis Escenarios</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-accent">
                {scenarioStats.shared_scenarios_accessible}
              </div>
              <div className="text-sm text-text-muted">Compartidos</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-purple">
                {Object.values(scenarioStats.scenarios_by_category).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm text-text-muted">Total</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-bold text-warning">
                {scenarioStats.scenarios_by_status?.active || 0}
              </div>
              <div className="text-sm text-text-muted">Activos</div>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar escenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-border rounded-lg 
                          text-text-primary placeholder-text-muted focus:border-primary 
                          focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-dark-surface border border-border rounded-lg 
                        text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getScenarioIcon(category)} {category}
                </option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!financialData}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 
                      text-white px-6 py-2 rounded-lg transition-all duration-300 flex items-center 
                      space-x-2 shadow-glow-md hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title={!financialData ? "Carga datos financieros primero para crear escenarios" : ""}
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Escenario</span>
          </button>
        </div>
      </div>

      {/* No data state */}
      {!financialData && (
        <div className="glass-card p-8 text-center mb-8">
          <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No hay datos financieros
          </h3>
          <p className="text-text-secondary mb-4">
            Para crear escenarios necesitas cargar datos financieros primero
          </p>
          <button
            onClick={() => window.location.href = '#config'}
            className="bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Cargar Datos
          </button>
        </div>
      )}

      {/* Scenarios Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <TrendingUp className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {searchTerm || selectedCategory ? 'No se encontraron escenarios' : 'No hay escenarios creados'}
          </h3>
          <p className="text-text-secondary">
            {searchTerm || selectedCategory 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea tu primer escenario para empezar con el análisis estratégico'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredScenarios.map((scenario) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card p-6 hover:shadow-glow-md transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getScenarioIcon(scenario.category)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {scenario.name}
                      </h3>
                      <span className="text-sm text-text-muted capitalize">
                        {scenario.category}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    scenario.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : scenario.status === 'draft'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {scenario.status}
                  </span>
                </div>

                {scenario.description && (
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {scenario.description}
                  </p>
                )}

                <div className="flex items-center text-xs text-text-muted mb-4 space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Año base: {scenario.base_year}</span>
                  </div>
                  {scenario.owner && (
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{scenario.owner}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-text-dim mb-4">
                  Creado: {new Date(scenario.created_at).toLocaleDateString()}
                  {scenario.updated_at !== scenario.created_at && (
                    <span className="ml-2">
                      • Modificado: {new Date(scenario.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleEnterSimulation(scenario.id)}
                    className="bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 
                              text-primary border border-primary/30 px-4 py-2 rounded-lg transition-all 
                              duration-300 flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Simular</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(scenario.id, scenario.name)}
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-primary"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-primary"
                      title="Compartir"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id, scenario.name)}
                      className="p-2 hover:bg-glass rounded-lg transition-colors text-text-muted hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-semibold text-primary mb-6">Crear Nuevo Escenario</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Nombre del Escenario *
                </label>
                <input
                  type="text"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-border rounded-lg 
                            text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Ej: Proyección Q2 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-border rounded-lg 
                            text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Descripción del escenario..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Año Base
                </label>
                <input
                  type="number"
                  value={newScenario.base_year}
                  onChange={(e) => setNewScenario({ ...newScenario, base_year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-surface border border-border rounded-lg 
                            text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
                  min="2020"
                  max="2030"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Categoría
                </label>
                <select
                  value={newScenario.category}
                  onChange={(e) => setNewScenario({ ...newScenario, category: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-surface border border-border rounded-lg 
                            text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="simulación">🔬 Simulación</option>
                  <option value="proyección">📊 Proyección</option>
                  <option value="análisis">📈 Análisis</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateScenario}
                disabled={!newScenario.name.trim() || isLoading}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 
                          text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50 
                          disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>Crear Escenario</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManagement;