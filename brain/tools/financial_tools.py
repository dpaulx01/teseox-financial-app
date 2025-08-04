"""
Herramientas financieras especializadas para el Brain System
"""

from typing import Dict, Any, List
import json
import datetime
from ..tools.base import BaseTool


class PortfolioAnalyzer(BaseTool):
    """Analizador de portfolios de inversión"""
    
    @property
    def name(self) -> str:
        return "portfolio_analyzer"
    
    @property
    def description(self) -> str:
        return "Analiza portfolios de inversión, calcula riesgos y retornos"
    
    def get_parameters(self) -> Dict[str, Any]:
        return {
            "investments": {
                "type": "array",
                "description": "Lista de inversiones con symbol, amount, price",
                "items": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "amount": {"type": "number"},
                        "current_price": {"type": "number"},
                        "purchase_price": {"type": "number"}
                    }
                }
            },
            "analysis_type": {
                "type": "string",
                "description": "Tipo de análisis: return, risk, diversification",
                "default": "return"
            }
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        investments = kwargs.get("investments", [])
        analysis_type = kwargs.get("analysis_type", "return")
        
        if not investments:
            return {"error": "No investments provided"}
        
        total_value = sum(inv["amount"] * inv["current_price"] for inv in investments)
        total_cost = sum(inv["amount"] * inv["purchase_price"] for inv in investments)
        
        total_return = ((total_value - total_cost) / total_cost) * 100
        
        analysis = {
            "total_portfolio_value": total_value,
            "total_cost": total_cost,
            "total_return_percentage": round(total_return, 2),
            "profit_loss": total_value - total_cost,
            "analysis_date": datetime.datetime.now().isoformat()
        }
        
        if analysis_type == "diversification":
            # Análisis de diversificación
            sectors = {}
            for inv in investments:
                sector = inv.get("sector", "Unknown")
                sectors[sector] = sectors.get(sector, 0) + inv["amount"] * inv["current_price"]
            
            analysis["diversification"] = {
                sector: round((value / total_value) * 100, 2) 
                for sector, value in sectors.items()
            }
        
        return analysis


class RiskCalculator(BaseTool):
    """Calculadora de riesgos financieros"""
    
    @property
    def name(self) -> str:
        return "risk_calculator"
    
    @property
    def description(self) -> str:
        return "Calcula métricas de riesgo financiero (VaR, Sharpe Ratio, etc.)"
    
    def get_parameters(self) -> Dict[str, Any]:
        return {
            "returns": {
                "type": "array",
                "description": "Lista de retornos históricos",
                "items": {"type": "number"}
            },
            "confidence_level": {
                "type": "number",
                "description": "Nivel de confianza para VaR (0.95, 0.99)",
                "default": 0.95
            },
            "risk_free_rate": {
                "type": "number",
                "description": "Tasa libre de riesgo",
                "default": 0.02
            }
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        returns = kwargs.get("returns", [])
        confidence_level = kwargs.get("confidence_level", 0.95)
        risk_free_rate = kwargs.get("risk_free_rate", 0.02)
        
        if not returns or len(returns) < 2:
            return {"error": "Insufficient return data"}
        
        import statistics
        
        mean_return = statistics.mean(returns)
        std_dev = statistics.stdev(returns)
        
        # Value at Risk (simplificado)
        var_multiplier = 1.645 if confidence_level == 0.95 else 2.33  # Para 99%
        var = mean_return - (var_multiplier * std_dev)
        
        # Sharpe Ratio
        sharpe_ratio = (mean_return - risk_free_rate) / std_dev if std_dev > 0 else 0
        
        return {
            "mean_return": round(mean_return * 100, 2),
            "volatility": round(std_dev * 100, 2),
            "value_at_risk": round(var * 100, 2),
            "sharpe_ratio": round(sharpe_ratio, 3),
            "risk_level": "High" if std_dev > 0.2 else "Medium" if std_dev > 0.1 else "Low"
        }


class TransactionAnalyzer(BaseTool):
    """Analizador de transacciones financieras"""
    
    @property
    def name(self) -> str:
        return "transaction_analyzer"
    
    @property
    def description(self) -> str:
        return "Analiza patrones en transacciones, detecta anomalías"
    
    def get_parameters(self) -> Dict[str, Any]:
        return {
            "transactions": {
                "type": "array",
                "description": "Lista de transacciones",
                "items": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number"},
                        "date": {"type": "string"},
                        "category": {"type": "string"},
                        "description": {"type": "string"}
                    }
                }
            },
            "analysis_period": {
                "type": "string",
                "description": "Periodo de análisis: weekly, monthly, yearly",
                "default": "monthly"
            }
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        transactions = kwargs.get("transactions", [])
        analysis_period = kwargs.get("analysis_period", "monthly")
        
        if not transactions:
            return {"error": "No transactions provided"}
        
        # Análisis básico
        total_amount = sum(t["amount"] for t in transactions)
        avg_transaction = total_amount / len(transactions)
        
        # Análisis por categorías
        categories = {}
        for t in transactions:
            cat = t.get("category", "Unknown")
            categories[cat] = categories.get(cat, 0) + t["amount"]
        
        # Detección de anomalías simples
        amounts = [t["amount"] for t in transactions]
        import statistics
        if len(amounts) > 1:
            mean_amount = statistics.mean(amounts)
            std_amount = statistics.stdev(amounts)
            threshold = mean_amount + (2 * std_amount)
            
            anomalies = [
                t for t in transactions 
                if abs(t["amount"]) > threshold
            ]
        else:
            anomalies = []
        
        return {
            "total_transactions": len(transactions),
            "total_amount": round(total_amount, 2),
            "average_transaction": round(avg_transaction, 2),
            "categories_breakdown": {
                cat: round(amount, 2) 
                for cat, amount in categories.items()
            },
            "potential_anomalies": len(anomalies),
            "analysis_date": datetime.datetime.now().isoformat()
        }


class FinancialCalculator(BaseTool):
    """Calculadora financiera avanzada"""
    
    @property
    def name(self) -> str:
        return "financial_calculator"
    
    @property
    def description(self) -> str:
        return "Realiza cálculos financieros: interés compuesto, préstamos, anualidades"
    
    def get_parameters(self) -> Dict[str, Any]:
        return {
            "calculation_type": {
                "type": "string",
                "description": "Tipo: compound_interest, loan_payment, present_value, future_value"
            },
            "principal": {"type": "number", "description": "Monto principal"},
            "rate": {"type": "number", "description": "Tasa de interés anual"},
            "time": {"type": "number", "description": "Tiempo en años"},
            "compounding_frequency": {
                "type": "number", 
                "description": "Frecuencia de capitalización por año",
                "default": 12
            }
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        calc_type = kwargs.get("calculation_type")
        principal = kwargs.get("principal", 0)
        rate = kwargs.get("rate", 0) / 100  # Convertir porcentaje
        time = kwargs.get("time", 0)
        frequency = kwargs.get("compounding_frequency", 12)
        
        if calc_type == "compound_interest":
            # A = P(1 + r/n)^(nt)
            amount = principal * (1 + rate/frequency) ** (frequency * time)
            interest = amount - principal
            
            return {
                "principal": principal,
                "final_amount": round(amount, 2),
                "interest_earned": round(interest, 2),
                "effective_rate": round(((amount/principal) ** (1/time) - 1) * 100, 2)
            }
        
        elif calc_type == "loan_payment":
            # PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
            monthly_rate = rate / 12
            num_payments = time * 12
            
            if monthly_rate > 0:
                payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
                         ((1 + monthly_rate) ** num_payments - 1)
            else:
                payment = principal / num_payments
            
            total_paid = payment * num_payments
            total_interest = total_paid - principal
            
            return {
                "loan_amount": principal,
                "monthly_payment": round(payment, 2),
                "total_paid": round(total_paid, 2),
                "total_interest": round(total_interest, 2),
                "num_payments": int(num_payments)
            }
        
        elif calc_type == "present_value":
            # PV = FV / (1 + r)^t
            present_value = principal / (1 + rate) ** time
            
            return {
                "future_value": principal,
                "present_value": round(present_value, 2),
                "discount_rate": round(rate * 100, 2),
                "time_periods": time
            }
        
        elif calc_type == "future_value":
            # FV = PV * (1 + r)^t
            future_value = principal * (1 + rate) ** time
            
            return {
                "present_value": principal,
                "future_value": round(future_value, 2),
                "growth": round(future_value - principal, 2),
                "growth_rate": round(rate * 100, 2)
            }
        
        return {"error": f"Unknown calculation type: {calc_type}"}