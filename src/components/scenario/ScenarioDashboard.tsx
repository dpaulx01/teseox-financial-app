import React, { useState, useEffect } from 'react';
import { useScenario } from '../../contexts/ScenarioContext';
import { useFinancialData } from '../../contexts/DataContext';
import { useYear } from '../../contexts/YearContext';
import { Plus, BookOpen, Copy, Trash2, Share, Calendar, User, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface ScenarioDashboardProps {
  onEnterScenario: (scenarioId: number) => void;
}

const ScenarioDashboard: React.FC<ScenarioDashboardProps> = ({ onEnterScenario }) => {
  const { 
    scenarios, 
    refreshScenarios, 
    createScenario, 
    deleteScenario, 
    duplicateScenario,
    isLoading,
    error,
    scenarioStats
  } = useScenario();
  
  const { data: financialData } = useFinancialData();
  const { selectedYear } = useYear();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');

  useEffect(() => {
    refreshScenarios();
  }, [refreshScenarios]);

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim() || !financialData) return;
    
    try {
      const scenarioId = await createScenario({
        name: newScenarioName.trim(),
        description: newScenarioDescription.trim(),
        base_year: selectedYear,
        category: 'balance_interno',
        financial_data: financialData
      });
      
      // Reset form
      setNewScenarioName('');
      setNewScenarioDescription('');
      setShowCreateForm(false);
      
      // Enter the newly created scenario
      onEnterScenario(scenarioId);
      
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  const handleDuplicateScenario = async (scenarioId: number, originalName: string) => {
    const newName = `${originalName} (Copia)`;
    try {
      await duplicateScenario(scenarioId, newName);
      await refreshScenarios();
    } catch (error) {
      console.error('Error duplicating scenario:', error);
    }
  };

  const handleDeleteScenario = async (scenarioId: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este escenario?')) {
      try {
        await deleteScenario(scenarioId);
        await refreshScenarios();
      } catch (error) {
        console.error('Error deleting scenario:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-primary flex items-center space-x-3">
              <BookOpen className="w-8 h-8" />
              <span>Balance Interno</span>
            </h1>
            <p className="text-text-secondary mt-2">
              Crea y gestiona escenarios de simulación financiera para análisis extracontable
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-text-muted">Año Base</div>
            <div className="text-2xl font-bold text-primary">{selectedYear}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-sm text-text-muted">Total Escenarios</div>
              <div className="text-2xl font-bold text-white">{scenarioStats.total}</div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-sm text-text-muted">Activos</div>
              <div className="text-2xl font-bold text-white">{scenarioStats.active}</div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <Share className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-sm text-text-muted">Compartidos</div>
              <div className="text-2xl font-bold text-white">{scenarioStats.shared}</div>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <Copy className="w-8 h-8 text-orange-400" />
            <div>
              <div className="text-sm text-text-muted">Plantillas</div>
              <div className="text-2xl font-bold text-white">{scenarioStats.templates}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create New Scenario */}
      <div className="glass-card p-6">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center space-x-3 py-8 border-2 border-dashed 
                      border-primary/30 hover:border-primary/50 rounded-lg transition-all hover:scale-[1.02] group"
          >
            <Plus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xl font-semibold text-primary">Crear Nuevo Escenario</div>
              <div className="text-text-muted">Simula cambios en tus datos financieros</div>
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-4">
              <Plus className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-white">Nuevo Escenario</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Nombre del Escenario
                </label>
                <input
                  type="text"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="Ej: Proyección Optimista Q1-2025"
                  className="w-full px-3 py-2 bg-dark-surface border border-border rounded-lg 
                            text-white placeholder-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={newScenarioDescription}
                  onChange={(e) => setNewScenarioDescription(e.target.value)}
                  placeholder="Describe el propósito de este escenario"
                  className="w-full px-3 py-2 bg-dark-surface border border-border rounded-lg 
                            text-white placeholder-text-muted focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCreateScenario}
                disabled={!newScenarioName.trim()}
                className="px-6 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/30 
                          text-white rounded-lg transition-colors"
              >
                Crear Escenario
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewScenarioName('');
                  setNewScenarioDescription('');
                }}
                className="px-6 py-2 bg-dark-surface hover:bg-dark-surface/80 
                          text-text-secondary rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Scenarios */}
      {scenarios.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Escenarios Existentes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-dark-surface border border-border rounded-lg p-4 hover:border-primary/50 
                          transition-all cursor-pointer hover:scale-[1.02]"
                onClick={() => onEnterScenario(scenario.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-white truncate">{scenario.name}</h4>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateScenario(scenario.id, scenario.name);
                      }}
                      className="p-1 text-text-muted hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScenario(scenario.id);
                      }}
                      className="p-1 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {scenario.description && (
                  <p className="text-sm text-text-muted mb-3 line-clamp-2">
                    {scenario.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{scenario.base_year}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(scenario.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      scenario.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <span className="text-xs text-text-muted capitalize">{scenario.status}</span>
                    
                    {scenario.is_shared && (
                      <div className="flex items-center space-x-1">
                        <Share className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-purple-400">Compartido</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-4 bg-red-500/10 border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ScenarioDashboard;