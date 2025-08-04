from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum


class MessageRole(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class Message:
    role: MessageRole
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Memory:
    content: str
    embedding: Optional[List[float]] = None
    timestamp: datetime = field(default_factory=datetime.now)
    importance: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "importance": self.importance,
            "metadata": self.metadata
        }


@dataclass
class Tool:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Optional[Any] = None
    
    def to_api_format(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": self.parameters,
                "required": list(self.parameters.keys())
            }
        }


@dataclass
class ReasoningResult:
    summary: str
    steps: List[str] = field(default_factory=list)
    confidence: float = 0.0
    suggested_actions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ThoughtProcess:
    prompt: str
    context: Dict[str, Any]
    timestamp: datetime
    memories: List[Memory] = field(default_factory=list)
    available_tools: List[Tool] = field(default_factory=list)
    reasoning: Optional[ReasoningResult] = None
    response: Optional[Message] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "prompt": self.prompt,
            "context": self.context,
            "timestamp": self.timestamp.isoformat(),
            "memories": [m.to_dict() for m in self.memories],
            "reasoning": self.reasoning.__dict__ if self.reasoning else None,
            "response": self.response.__dict__ if self.response else None
        }


@dataclass
class Conversation:
    id: str
    messages: List[Message] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def add_message(self, message: Message):
        self.messages.append(message)
        self.updated_at = datetime.now()