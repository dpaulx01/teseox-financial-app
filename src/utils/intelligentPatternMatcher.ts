/**
 * Sistema Híbrido de Patrones Inteligentes
 * 
 * Combina:
 * 1. Algoritmo inteligente original (fallback)
 * 2. Patrones configurables por usuario (overrides)
 * 3. Sinónimos y detección automática
 * 
 * @author Sistema Artyco Financial
 * @date 2025-01-24
 */

import { ACCOUNT_PATTERNS } from '../constants/breakEvenConfig';
import { analysisConfigService } from '../services/analysisConfigService';

interface IntelligentPattern {
  value: string;
  type: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
  confidence: number; // 0-1, donde 1 es máxima confianza
  source: 'intelligent' | 'user_configured' | 'combined';
}

class IntelligentPatternMatcher {
  private userPatterns: Record<string, any[]> = {};
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos (reducir llamadas API)
  private patternMatchCache = new Map<string, boolean>(); // Cache para matches frecuentes

  /**
   * Algoritmo inteligente original - mantiene tu lógica
   */
  private getIntelligentPatterns(): Record<string, IntelligentPattern[]> {
    const intelligentPatterns: Record<string, IntelligentPattern[]> = {};

    // Depreciación - Tu algoritmo original + extensiones inteligentes
    intelligentPatterns.depreciacion = [
      // Patrones originales con alta confianza
      ...ACCOUNT_PATTERNS.depreciacion.map(pattern => ({
        value: pattern,
        type: 'contains' as const,
        confidence: 0.9,
        source: 'intelligent' as const
      })),
      
      // Extensiones inteligentes
      { value: 'deterioro', type: 'contains', confidence: 0.8, source: 'intelligent' },
      { value: 'obsolescencia', type: 'contains', confidence: 0.7, source: 'intelligent' },
      { value: 'agotamiento', type: 'contains', confidence: 0.7, source: 'intelligent' },
      { value: 'depletion', type: 'contains', confidence: 0.6, source: 'intelligent' }, // English
      { value: 'wear', type: 'contains', confidence: 0.5, source: 'intelligent' }, // English
    ];

    // Intereses - Tu algoritmo original + extensiones inteligentes  
    intelligentPatterns.intereses = [
      // Patrones originales con alta confianza
      ...ACCOUNT_PATTERNS.intereses.map(pattern => ({
        value: pattern,
        type: 'contains' as const,
        confidence: 0.9,
        source: 'intelligent' as const
      })),
      
      // Extensiones inteligentes
      { value: 'rendimientos', type: 'contains', confidence: 0.8, source: 'intelligent' },
      { value: 'dividendos', type: 'contains', confidence: 0.7, source: 'intelligent' },
      { value: 'yields', type: 'contains', confidence: 0.6, source: 'intelligent' }, // English
      { value: 'bonds', type: 'contains', confidence: 0.5, source: 'intelligent' }, // English
      { value: 'securities', type: 'contains', confidence: 0.4, source: 'intelligent' }, // English
    ];

    return intelligentPatterns;
  }

  /**
   * Obtener patrones configurables por usuario
   */
  private async getUserConfiguredPatterns(): Promise<Record<string, IntelligentPattern[]>> {
    try {
      // SIEMPRE recargar desde API para cambios inmediatos
      // (comentar cache temporalmente para debug)
      // if (Date.now() - this.cacheTimestamp < this.CACHE_TTL && Object.keys(this.userPatterns).length > 0) {
      //   return this.convertUserPatternsToIntelligent(this.userPatterns);
      // }

      // Cargar desde API
      this.userPatterns = await analysisConfigService.getExclusionPatterns();
      this.cacheTimestamp = Date.now();
      
      const converted = this.convertUserPatternsToIntelligent(this.userPatterns);
      console.log('🔄 Patrones de usuario recargados desde API:', converted);
      
      return converted;
    } catch (error) {
      console.warn('Error cargando patrones de usuario, usando solo algoritmo inteligente:', error);
      return {};
    }
  }

  /**
   * Convertir patrones de usuario al formato inteligente
   */
  private convertUserPatternsToIntelligent(userPatterns: Record<string, any[]>): Record<string, IntelligentPattern[]> {
    const converted: Record<string, IntelligentPattern[]> = {};
    
    Object.entries(userPatterns).forEach(([group, patterns]) => {
      converted[group] = patterns.map(pattern => ({
        value: pattern.value || pattern,
        type: pattern.type || 'contains',
        confidence: 1.0, // Patrones de usuario tienen máxima confianza
        source: 'user_configured' as const
      }));
    });
    
    return converted;
  }

  /**
   * Combinar algoritmo inteligente + configuración de usuario
   * IMPORTANTE: Si el usuario ha configurado patrones para un grupo, 
   * SOLO usar esos patrones (no combinar con inteligentes)
   */
  public async getCombinedPatterns(): Promise<Record<string, IntelligentPattern[]>> {
    const intelligentPatterns = this.getIntelligentPatterns();
    const userPatterns = await this.getUserConfiguredPatterns();
    
    const combined: Record<string, IntelligentPattern[]> = {};
    
    // Obtener todas las categorías (inteligentes + usuario)
    const allGroups = new Set([
      ...Object.keys(intelligentPatterns),
      ...Object.keys(userPatterns)
    ]);
    
    allGroups.forEach(group => {
      combined[group] = [];
      
      // Si el usuario ha configurado patrones para este grupo,
      // SOLO usar los patrones del usuario (respetar su configuración completa)
      if (userPatterns[group] && userPatterns[group].length > 0) {
        combined[group].push(...userPatterns[group]);
        console.log(`🔧 Usando SOLO patrones de usuario para ${group}:`, userPatterns[group].map(p => p.value));
      } else {
        // Si no hay configuración de usuario, usar patrones inteligentes
        if (intelligentPatterns[group]) {
          combined[group].push(...intelligentPatterns[group]);
          console.log(`🧠 Usando patrones inteligentes para ${group}:`, intelligentPatterns[group].map(p => p.value));
        }
      }
      
      // Ordenar por confianza (mayor a menor)
      combined[group].sort((a, b) => b.confidence - a.confidence);
    });
    
    return combined;
  }

  /**
   * Buscar coincidencias con score de confianza
   */
  public async findMatches(accountName: string, group: string): Promise<{
    matches: IntelligentPattern[];
    bestMatch: IntelligentPattern | null;
    confidence: number;
  }> {
    const patterns = await this.getCombinedPatterns();
    const groupPatterns = patterns[group] || [];
    
    const matches: IntelligentPattern[] = [];
    const accountLower = accountName.toLowerCase();
    
    groupPatterns.forEach(pattern => {
      let isMatch = false;
      
      switch (pattern.type) {
        case 'contains':
          isMatch = accountLower.includes(pattern.value.toLowerCase());
          break;
        case 'starts_with':
          isMatch = accountLower.startsWith(pattern.value.toLowerCase());
          break;
        case 'ends_with':
          isMatch = accountLower.endsWith(pattern.value.toLowerCase());
          break;
        case 'exact':
          isMatch = accountLower === pattern.value.toLowerCase();
          break;
        case 'regex':
          try {
            const regex = new RegExp(pattern.value, 'i');
            isMatch = regex.test(accountName);
          } catch (e) {
            console.warn(`Regex inválido: ${pattern.value}`);
          }
          break;
      }
      
      if (isMatch) {
        matches.push(pattern);
      }
    });
    
    // Obtener mejor coincidencia (mayor confianza)
    const bestMatch = matches.length > 0 ? matches[0] : null;
    const confidence = matches.length > 0 ? Math.max(...matches.map(m => m.confidence)) : 0;
    
    return { matches, bestMatch, confidence };
  }

  /**
   * Verificar si una cuenta debe ser excluida (con cache)
   */
  public async shouldExclude(accountName: string, group: string, threshold: number = 0.5): Promise<boolean> {
    const cacheKey = `${accountName}_${group}_${threshold}`;
    
    // Verificar cache primero
    if (this.patternMatchCache.has(cacheKey)) {
      return this.patternMatchCache.get(cacheKey)!;
    }
    
    const result = await this.findMatches(accountName, group);
    const shouldExclude = result.confidence >= threshold;
    
    // Guardar en cache (máximo 1000 entradas)
    if (this.patternMatchCache.size < 1000) {
      this.patternMatchCache.set(cacheKey, shouldExclude);
    }
    
    return shouldExclude;
  }

  /**
   * Obtener estadísticas del sistema híbrido
   */
  public async getSystemStats(): Promise<{
    intelligentPatterns: number;
    userPatterns: number;
    totalPatterns: number;
    coverage: Record<string, number>;
  }> {
    const intelligent = this.getIntelligentPatterns();
    const user = await this.getUserConfiguredPatterns();
    const combined = await this.getCombinedPatterns();
    
    const stats = {
      intelligentPatterns: Object.values(intelligent).flat().length,
      userPatterns: Object.values(user).flat().length,
      totalPatterns: Object.values(combined).flat().length,
      coverage: {} as Record<string, number>
    };
    
    Object.keys(combined).forEach(group => {
      stats.coverage[group] = combined[group].length;
    });
    
    return stats;
  }
}

// Instancia singleton
export const intelligentPatternMatcher = new IntelligentPatternMatcher();

// Función de utilidad para uso directo
export async function getSmartPatterns(group: string): Promise<string[]> {
  const combined = await intelligentPatternMatcher.getCombinedPatterns();
  return combined[group]?.map(p => p.value) || [];
}

export default intelligentPatternMatcher;