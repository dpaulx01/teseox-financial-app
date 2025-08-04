import os
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum


class ModelProvider(Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    LOCAL = "local"


@dataclass
class ModelConfig:
    provider: ModelProvider
    model_name: str
    api_key: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7
    extra_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryConfig:
    max_short_term_items: int = 100
    max_long_term_items: int = 10000
    embedding_model: Optional[str] = None
    vector_db_path: str = "./brain_memory"
    enable_semantic_search: bool = True


@dataclass
class ToolConfig:
    enabled_tools: List[str] = field(default_factory=list)
    custom_tools_path: str = "./brain/tools/custom"
    max_parallel_tools: int = 5
    timeout_seconds: int = 30


@dataclass
class BrainConfig:
    name: str = "AI Brain"
    version: str = "1.0.0"
    
    primary_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_name="claude-3-opus-20240229",
        api_key=os.getenv("ANTHROPIC_API_KEY")
    ))
    
    fallback_models: List[ModelConfig] = field(default_factory=list)
    
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    tools: ToolConfig = field(default_factory=ToolConfig)
    
    enable_logging: bool = True
    log_level: str = "INFO"
    log_path: str = "./brain_logs"
    
    enable_learning: bool = True
    save_conversations: bool = True
    
    @classmethod
    def from_env(cls) -> 'BrainConfig':
        """Create configuration from environment variables"""
        config = cls()
        
        if os.getenv("BRAIN_MODEL_PROVIDER"):
            config.primary_model.provider = ModelProvider(os.getenv("BRAIN_MODEL_PROVIDER"))
        
        if os.getenv("BRAIN_MODEL_NAME"):
            config.primary_model.model_name = os.getenv("BRAIN_MODEL_NAME")
            
        if os.getenv("BRAIN_MAX_TOKENS"):
            config.primary_model.max_tokens = int(os.getenv("BRAIN_MAX_TOKENS"))
            
        return config