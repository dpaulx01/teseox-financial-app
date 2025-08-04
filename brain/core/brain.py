import asyncio
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json

from .config import BrainConfig, ModelProvider
from .interfaces import Message, Conversation, ThoughtProcess
from ..memory.manager import MemoryManager
from ..tools.manager import ToolManager
from ..reasoning.engine import ReasoningEngine
from ..utils.logger import setup_logger
from ..learning.adapter import LearningAdapter


class Brain:
    """
    Core Brain class that orchestrates all AI capabilities
    """
    
    def __init__(self, config: Optional[BrainConfig] = None):
        self.config = config or BrainConfig.from_env()
        self.logger = setup_logger(
            "Brain", 
            self.config.log_level,
            self.config.log_path if self.config.enable_logging else None
        )
        
        self.memory = MemoryManager(self.config.memory)
        self.tools = ToolManager(self.config.tools)
        self.reasoning = ReasoningEngine()
        self.learning = LearningAdapter() if self.config.enable_learning else None
        
        self._model_clients = {}
        self._initialize_models()
        
        self.current_conversation: Optional[Conversation] = None
        self.logger.info(f"Brain initialized: {self.config.name} v{self.config.version}")
    
    def _initialize_models(self):
        """Initialize AI model clients"""
        if self.config.primary_model.provider == ModelProvider.ANTHROPIC:
            try:
                import anthropic
                self._model_clients['primary'] = anthropic.Anthropic(
                    api_key=self.config.primary_model.api_key
                )
            except ImportError:
                self.logger.error("Anthropic library not installed")
        
        elif self.config.primary_model.provider == ModelProvider.OPENAI:
            try:
                import openai
                openai.api_key = self.config.primary_model.api_key
                self._model_clients['primary'] = openai
            except ImportError:
                self.logger.error("OpenAI library not installed")
    
    async def think(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> ThoughtProcess:
        """
        Main thinking method - processes input and generates response
        """
        self.logger.info(f"Thinking about: {prompt[:100]}...")
        
        thought_process = ThoughtProcess(
            prompt=prompt,
            context=context or {},
            timestamp=datetime.now()
        )
        
        # Retrieve relevant memories
        if self.memory.is_initialized:
            memories = await self.memory.retrieve_relevant(prompt, limit=5)
            thought_process.memories = memories
        
        # Analyze available tools
        relevant_tools = await self.tools.get_relevant_tools(prompt)
        thought_process.available_tools = relevant_tools
        
        # Reasoning phase
        reasoning_result = await self.reasoning.analyze(
            prompt=prompt,
            context=context,
            memories=thought_process.memories,
            tools=relevant_tools
        )
        thought_process.reasoning = reasoning_result
        
        # Generate response
        response = await self._generate_response(thought_process)
        thought_process.response = response
        
        # Store in memory if enabled
        if self.config.save_conversations:
            await self.memory.store(thought_process)
        
        # Store for learning
        self.last_thought_process = thought_process
        
        return thought_process
    
    async def _generate_response(self, thought_process: ThoughtProcess) -> Message:
        """Generate response using the configured model"""
        try:
            if self.config.primary_model.provider == ModelProvider.ANTHROPIC:
                return await self._generate_anthropic_response(thought_process)
            elif self.config.primary_model.provider == ModelProvider.OPENAI:
                return await self._generate_openai_response(thought_process)
            else:
                raise NotImplementedError(f"Provider {self.config.primary_model.provider} not implemented")
        except Exception as e:
            self.logger.error(f"Error generating response: {e}")
            return Message(
                role="assistant",
                content=f"I encountered an error while processing: {str(e)}",
                timestamp=datetime.now()
            )
    
    async def _generate_anthropic_response(self, thought_process: ThoughtProcess) -> Message:
        """Generate response using Anthropic's Claude"""
        client = self._model_clients.get('primary')
        if not client:
            raise ValueError("Anthropic client not initialized")
        
        messages = self._prepare_messages(thought_process)
        tools = self._prepare_tools(thought_process.available_tools)
        
        response = await asyncio.to_thread(
            client.messages.create,
            model=self.config.primary_model.model_name,
            max_tokens=self.config.primary_model.max_tokens,
            temperature=self.config.primary_model.temperature,
            messages=messages,
            tools=tools if tools else None,
            **self.config.primary_model.extra_params
        )
        
        return Message(
            role="assistant",
            content=response.content[0].text if response.content else "",
            timestamp=datetime.now(),
            metadata={
                "model": self.config.primary_model.model_name,
                "usage": response.usage.__dict__ if hasattr(response, 'usage') else {}
            }
        )
    
    async def _generate_openai_response(self, thought_process: ThoughtProcess) -> Message:
        """Generate response using OpenAI's GPT"""
        # Implementation for OpenAI
        pass
    
    def _prepare_messages(self, thought_process: ThoughtProcess) -> List[Dict[str, str]]:
        """Prepare messages for the AI model"""
        messages = []
        
        # Add system message with context
        system_content = f"You are {self.config.name}. "
        if thought_process.reasoning:
            system_content += f"\n\nReasoning: {thought_process.reasoning.summary}"
        
        messages.append({"role": "system", "content": system_content})
        
        # Add memories as context
        if thought_process.memories:
            memory_context = "\n\nRelevant memories:\n"
            for memory in thought_process.memories[:3]:
                memory_context += f"- {memory.content}\n"
            messages.append({"role": "system", "content": memory_context})
        
        # Add the main prompt
        messages.append({"role": "user", "content": thought_process.prompt})
        
        return messages
    
    def _prepare_tools(self, tools: List[Any]) -> List[Dict[str, Any]]:
        """Prepare tools for the AI model"""
        if not tools:
            return []
        
        tool_definitions = []
        for tool in tools:
            tool_definitions.append(tool.to_api_format())
        
        return tool_definitions
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a tool with given parameters"""
        return await self.tools.execute(tool_name, parameters)
    
    async def learn(self, feedback: str, context: Optional[Dict[str, Any]] = None):
        """Learn from user feedback"""
        if not self.config.enable_learning or not self.learning:
            return
        
        self.logger.info("Learning from feedback")
        
        if hasattr(self, 'last_thought_process') and self.last_thought_process:
            await self.learning.process_feedback(feedback, self.last_thought_process)
            self.logger.info("Feedback processed and stored for learning")
    
    async def save_state(self, path: str):
        """Save brain state to disk"""
        state = {
            "config": self.config.__dict__,
            "memory_state": await self.memory.export_state(),
            "timestamp": datetime.now().isoformat()
        }
        
        with open(path, 'w') as f:
            json.dump(state, f, indent=2)
        
        self.logger.info(f"Brain state saved to {path}")
    
    async def load_state(self, path: str):
        """Load brain state from disk"""
        with open(path, 'r') as f:
            state = json.load(f)
        
        await self.memory.import_state(state.get("memory_state", {}))
        self.logger.info(f"Brain state loaded from {path}")
    
    def __repr__(self):
        return f"<Brain: {self.config.name} v{self.config.version}>"