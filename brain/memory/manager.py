import asyncio
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
from collections import deque
import pickle

from ..core.interfaces import Memory, ThoughtProcess
from ..core.config import MemoryConfig
from ..utils.embeddings import EmbeddingGenerator


class MemoryManager:
    """
    Manages short-term and long-term memory with semantic search capabilities
    """
    
    def __init__(self, config: MemoryConfig):
        self.config = config
        self.short_term_memory = deque(maxlen=config.max_short_term_items)
        self.long_term_memory = []
        self.embeddings = EmbeddingGenerator(config.embedding_model)
        self.is_initialized = False
        
        os.makedirs(config.vector_db_path, exist_ok=True)
        self._load_memories()
    
    def _load_memories(self):
        """Load memories from disk"""
        memory_file = os.path.join(self.config.vector_db_path, "memories.pkl")
        if os.path.exists(memory_file):
            try:
                with open(memory_file, 'rb') as f:
                    data = pickle.load(f)
                    self.long_term_memory = data.get('long_term', [])
                    self.is_initialized = True
            except Exception as e:
                print(f"Error loading memories: {e}")
    
    async def store(self, thought_process: ThoughtProcess):
        """Store a thought process in memory"""
        # Create memory from thought process
        content = f"Q: {thought_process.prompt}\nA: {thought_process.response.content if thought_process.response else 'No response'}"
        
        memory = Memory(
            content=content,
            importance=self._calculate_importance(thought_process),
            metadata={
                "prompt": thought_process.prompt,
                "response": thought_process.response.content if thought_process.response else None,
                "reasoning": thought_process.reasoning.summary if thought_process.reasoning else None,
                "context": thought_process.context
            }
        )
        
        # Generate embedding if enabled
        if self.config.enable_semantic_search:
            memory.embedding = await self.embeddings.generate(content)
        
        # Add to short-term memory
        self.short_term_memory.append(memory)
        
        # Consider promoting to long-term memory
        if memory.importance > 0.7:
            await self._promote_to_long_term(memory)
    
    def _calculate_importance(self, thought_process: ThoughtProcess) -> float:
        """Calculate importance score for a memory"""
        score = 0.5  # Base score
        
        # Increase for complex reasoning
        if thought_process.reasoning and len(thought_process.reasoning.steps) > 3:
            score += 0.2
        
        # Increase for tool usage
        if thought_process.available_tools:
            score += 0.1
        
        # Increase based on response length
        if thought_process.response and len(thought_process.response.content) > 500:
            score += 0.1
        
        return min(score, 1.0)
    
    async def _promote_to_long_term(self, memory: Memory):
        """Promote memory to long-term storage"""
        if len(self.long_term_memory) >= self.config.max_long_term_items:
            # Remove least important memory
            self.long_term_memory.sort(key=lambda m: m.importance)
            self.long_term_memory.pop(0)
        
        self.long_term_memory.append(memory)
        await self._save_memories()
    
    async def retrieve_relevant(self, query: str, limit: int = 5) -> List[Memory]:
        """Retrieve memories relevant to the query"""
        if not self.is_initialized:
            return []
        
        all_memories = list(self.short_term_memory) + self.long_term_memory
        
        if self.config.enable_semantic_search and self.embeddings.is_available():
            # Semantic search
            query_embedding = await self.embeddings.generate(query)
            scored_memories = []
            
            for memory in all_memories:
                if memory.embedding:
                    similarity = self._cosine_similarity(query_embedding, memory.embedding)
                    scored_memories.append((similarity, memory))
            
            # Sort by similarity and return top matches
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            return [m[1] for m in scored_memories[:limit]]
        else:
            # Fallback to keyword search
            relevant = []
            query_lower = query.lower()
            
            for memory in all_memories:
                if any(word in memory.content.lower() for word in query_lower.split()):
                    relevant.append(memory)
            
            # Sort by recency and importance
            relevant.sort(key=lambda m: (m.importance, m.timestamp), reverse=True)
            return relevant[:limit]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        a = np.array(vec1)
        b = np.array(vec2)
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    async def forget_old_memories(self, days: int = 30):
        """Forget memories older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Filter long-term memories
        self.long_term_memory = [
            m for m in self.long_term_memory 
            if m.timestamp > cutoff_date or m.importance > 0.8
        ]
        
        await self._save_memories()
    
    async def _save_memories(self):
        """Save memories to disk"""
        memory_file = os.path.join(self.config.vector_db_path, "memories.pkl")
        data = {
            'long_term': self.long_term_memory,
            'saved_at': datetime.now().isoformat()
        }
        
        with open(memory_file, 'wb') as f:
            pickle.dump(data, f)
    
    async def export_state(self) -> Dict[str, Any]:
        """Export memory state"""
        return {
            'short_term': [m.to_dict() for m in self.short_term_memory],
            'long_term': [m.to_dict() for m in self.long_term_memory],
            'config': self.config.__dict__
        }
    
    async def import_state(self, state: Dict[str, Any]):
        """Import memory state"""
        # Implementation for importing memory state
        pass
    
    def clear_short_term(self):
        """Clear short-term memory"""
        self.short_term_memory.clear()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get memory statistics"""
        return {
            'short_term_count': len(self.short_term_memory),
            'long_term_count': len(self.long_term_memory),
            'total_memories': len(self.short_term_memory) + len(self.long_term_memory),
            'oldest_memory': min(self.long_term_memory, key=lambda m: m.timestamp).timestamp if self.long_term_memory else None,
            'newest_memory': max(list(self.short_term_memory) + self.long_term_memory, key=lambda m: m.timestamp).timestamp if (self.short_term_memory or self.long_term_memory) else None
        }