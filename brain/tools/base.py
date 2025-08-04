from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseTool(ABC):
    """
    Base class for all custom tools
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description"""
        pass
    
    @abstractmethod
    def get_parameters(self) -> Dict[str, Any]:
        """
        Get tool parameters schema
        
        Returns:
            Dict with parameter definitions following JSON Schema format
        """
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """
        Execute the tool with given parameters
        
        Args:
            **kwargs: Tool parameters
            
        Returns:
            Tool execution result
        """
        pass
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """
        Validate parameters before execution
        
        Args:
            parameters: Parameters to validate
            
        Returns:
            True if valid, raises ValueError if not
        """
        schema = self.get_parameters()
        
        for param_name, param_info in schema.items():
            if param_name not in parameters and "default" not in param_info:
                raise ValueError(f"Missing required parameter: {param_name}")
            
            # Type validation could be added here
        
        return True