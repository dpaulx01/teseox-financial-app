"""
Brain Module - Centralized AI System
====================================

A modular, extensible AI brain system that provides:
- Memory and context management
- Tool integration and orchestration
- Reasoning and decision-making
- Learning and adaptation
- Multi-model support (Claude, GPT, etc.)
"""

from .core.brain import Brain
from .core.config import BrainConfig

__version__ = "1.0.0"
__all__ = ["Brain", "BrainConfig"]