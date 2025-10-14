// Servicio de API para comunicación con el backend Brain System

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  PyGConfig, 
  PyGResult, 
  FinancialData, 
  ApiResponse,
  BrainResponse,
  PortfolioAnalysis,
  RiskAnalysis,
  TransactionAnalysis 
} from '../types/financial';
import {
  ProductionStatusResponse,
  ProductionUpdatePayload,
  ProductionUploadResponse,
  ProductionItem,
  ProductionDeleteResponse,
  DashboardKpisResponse,
  DailyProductionPlanEntry,
  DailyProductionPlanResponse,
  DailyScheduleResponse,
} from '../types/production';

class FinancialAPIService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Vite expone variables con prefijo VITE_
    // Usamos VITE_API_BASE_URL para configurar la URL base del backend
    this.baseURL = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds for complex calculations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth & debugging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('access_token');
          if (token) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.config.url}`, response.data);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }

  // ===============================
  // PyG ANALYSIS ENDPOINTS
  // ===============================

  async analyzePyG(
    financialData: FinancialData, 
    config: PyGConfig
  ): Promise<PyGResult> {
    const response: AxiosResponse<ApiResponse<PyGResult>> = await this.api.post(
      '/api/pyg/analyze',
      {
        financial_data: financialData,
        analysis_month: config.analysis_month,
        view_type: config.view_type,
        enable_vertical_analysis: config.enable_vertical_analysis,
        enable_horizontal_analysis: config.enable_horizontal_analysis,
        comparison_month: config.comparison_month,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze PyG');
    }

    return response.data.data!;
  }

  // ===============================
  // FINANCIAL TOOLS ENDPOINTS
  // ===============================

  async analyzePortfolio(investments: any[], analysisType: string = 'return'): Promise<PortfolioAnalysis> {
    const response: AxiosResponse<ApiResponse<PortfolioAnalysis>> = await this.api.post(
      '/api/portfolio/analyze',
      {
        investments,
        analysis_type: analysisType,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze portfolio');
    }

    return response.data.data!;
  }

  async analyzeRisk(
    returns: number[], 
    confidenceLevel: number = 0.95, 
    riskFreeRate: number = 0.02
  ): Promise<RiskAnalysis> {
    const response: AxiosResponse<ApiResponse<RiskAnalysis>> = await this.api.post(
      '/api/risk/analyze',
      {
        returns,
        confidence_level: confidenceLevel,
        risk_free_rate: riskFreeRate,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze risk');
    }

    return response.data.data!;
  }

  async analyzeTransactions(
    transactions: any[], 
    analysisPeriod: string = 'monthly'
  ): Promise<TransactionAnalysis> {
    const response: AxiosResponse<ApiResponse<TransactionAnalysis>> = await this.api.post(
      '/api/transactions/analyze',
      {
        transactions,
        analysis_period: analysisPeriod,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze transactions');
    }

    return response.data.data!;
  }

  async calculateFinancial(
    calculationType: string,
    principal: number,
    rate: number,
    time: number,
    compoundingFrequency: number = 12
  ): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      '/api/financial/calculate',
      {
        calculation_type: calculationType,
        principal,
        rate,
        time,
        compounding_frequency: compoundingFrequency,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to calculate');
    }

    return response.data.data!;
  }

  // ===============================
  // BRAIN SYSTEM ENDPOINTS
  // ===============================

  async queryBrain(prompt: string, context?: Record<string, any>): Promise<BrainResponse> {
    const response: AxiosResponse<ApiResponse<BrainResponse>> = await this.api.post(
      '/api/brain/query',
      {
        prompt,
        context,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to query brain');
    }

    return response.data.data!;
  }

  async sendFeedback(feedback: string, context?: Record<string, any>): Promise<void> {
    const response = await this.api.post('/api/brain/feedback', {
      feedback,
      context,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send feedback');
    }
  }

  async getBrainStats(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/api/brain/stats');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get brain stats');
    }

    return response.data.data!;
  }

  async getAvailableTools(): Promise<any[]> {
    const response = await this.api.get('/api/tools');
    return response.data.tools || [];
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  async uploadFinancialData(file: File): Promise<FinancialData> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/api/upload/financial-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // ===============================
  // STATUS PRODUCCIÓN
  // ===============================

  async getDashboardKpis(): Promise<DashboardKpisResponse> {
    const response = await this.api.get('/api/production/dashboard/kpis');
    return response.data as DashboardKpisResponse;
  }

  async uploadProductionQuotes(files: File[]): Promise<ProductionUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await this.api.post('/api/production/quotes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as ProductionUploadResponse;
  }

  async getAllProductionItems(): Promise<ProductionStatusResponse> {
    const response = await this.api.get('/api/production/items/all');
    return response.data as ProductionStatusResponse;
  }

  async getActiveProductionItems(): Promise<ProductionStatusResponse> {
    const response = await this.api.get('/api/production/items/active');
    return response.data as ProductionStatusResponse;
  }

  async getArchivedProductionItems(): Promise<ProductionStatusResponse> {
    const response = await this.api.get('/api/production/items/archive');
    return response.data as ProductionStatusResponse;
  }

  async updateProductionItem(
    itemId: number,
    payload: ProductionUpdatePayload,
  ): Promise<ProductionItem> {
    const response = await this.api.put(`/api/production/items/${itemId}`, payload);
    return response.data.item as ProductionItem;
  }

  async deleteProductionQuote(quoteId: number): Promise<ProductionDeleteResponse> {
    const response = await this.api.delete(`/api/production/quotes/${quoteId}`);
    return response.data as ProductionDeleteResponse;
  }

  async getProductionDailyPlan(itemId: number): Promise<DailyProductionPlanResponse> {
    const response = await this.api.get(`/api/production/items/${itemId}/daily-plan`);
    return response.data as DailyProductionPlanResponse;
  }

  async saveProductionDailyPlan(
    itemId: number,
    plan: DailyProductionPlanEntry[],
  ): Promise<DailyProductionPlanResponse> {
    const response = await this.api.put(`/api/production/items/${itemId}/daily-plan`, { plan });
    return response.data as DailyProductionPlanResponse;
  }

  async getProductionSchedule(): Promise<DailyScheduleResponse> {
    const response = await this.api.get('/api/production/dashboard/schedule');
    return response.data as DailyScheduleResponse;
  }

  // Mock data generator for development
  generateMockFinancialData(): FinancialData {
    return {
      accounts: [
        { code: '4110', name: 'Ingresos por Ventas', annual_total: 1000000 },
        { code: '4120', name: 'Otros Ingresos', annual_total: 50000 },
        { code: '6110', name: 'Costo de Mercancías', annual_total: -600000 },
        { code: '5110', name: 'Gastos de Administración', annual_total: -200000 },
        { code: '5120', name: 'Gastos de Ventas', annual_total: -100000 },
        { code: '5310', name: 'Gastos Financieros', annual_total: -25000 },
        { code: '5410', name: 'Impuestos', annual_total: -37500 },
      ],
      period: '2024',
      company: 'Empresa Demo',
      currency: 'COP',
    };
  }

  // Predictive analysis methods (future implementation)
  async runWhatIfAnalysis(baseData: FinancialData, scenarios: any[]): Promise<any> {
    // TODO: Implement when backend supports it
    throw new Error('What-if analysis not yet implemented');
  }

  async getPredictiveInsights(historicalData: FinancialData[]): Promise<any> {
    // TODO: Implement when backend supports it
    throw new Error('Predictive insights not yet implemented');
  }
}

// Singleton instance
export const financialAPI = new FinancialAPIService();

// Default export for convenience
export default financialAPI;
