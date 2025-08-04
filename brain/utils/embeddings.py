import asyncio
from typing import List, Optional
import numpy as np


class EmbeddingGenerator:
    """
    Handles text embedding generation for semantic search
    """
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or "sentence-transformers/all-MiniLM-L6-v2"
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the embedding model"""
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
        except ImportError:
            print("sentence-transformers not installed. Semantic search disabled.")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if embedding model is available"""
        return self.model is not None
    
    async def generate(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for the given text
        """
        if not self.model:
            return None
        
        try:
            # Run in thread pool to avoid blocking
            embedding = await asyncio.to_thread(
                self.model.encode, [text], convert_to_numpy=True
            )
            return embedding[0].tolist()
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    async def generate_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts
        """
        if not self.model:
            return [None] * len(texts)
        
        try:
            embeddings = await asyncio.to_thread(
                self.model.encode, texts, convert_to_numpy=True
            )
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            return [None] * len(texts)
    
    def calculate_similarity(self, emb1: List[float], emb2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        """
        if not emb1 or not emb2:
            return 0.0
        
        a = np.array(emb1)
        b = np.array(emb2)
        
        cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        return float(cos_sim)