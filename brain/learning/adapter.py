from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import os

from ..core.interfaces import ThoughtProcess, Memory


class LearningAdapter:
    """
    Handles learning and adaptation from user interactions
    """
    
    def __init__(self, learning_path: str = "./brain_learning"):
        self.learning_path = learning_path
        self.feedback_history = []
        self.patterns = {}
        self.preferences = {}
        
        os.makedirs(learning_path, exist_ok=True)
        self._load_learning_data()
    
    def _load_learning_data(self):
        """Load existing learning data"""
        feedback_file = os.path.join(self.learning_path, "feedback_history.json")
        patterns_file = os.path.join(self.learning_path, "patterns.json")
        preferences_file = os.path.join(self.learning_path, "preferences.json")
        
        try:
            if os.path.exists(feedback_file):
                with open(feedback_file, 'r') as f:
                    self.feedback_history = json.load(f)
            
            if os.path.exists(patterns_file):
                with open(patterns_file, 'r') as f:
                    self.patterns = json.load(f)
            
            if os.path.exists(preferences_file):
                with open(preferences_file, 'r') as f:
                    self.preferences = json.load(f)
        
        except Exception as e:
            print(f"Error loading learning data: {e}")
    
    async def process_feedback(
        self, 
        feedback: str, 
        thought_process: ThoughtProcess,
        feedback_type: str = "general"
    ):
        """Process user feedback and update learning"""
        feedback_entry = {
            "feedback": feedback,
            "feedback_type": feedback_type,
            "timestamp": datetime.now().isoformat(),
            "original_prompt": thought_process.prompt,
            "response": thought_process.response.content if thought_process.response else None,
            "reasoning": thought_process.reasoning.summary if thought_process.reasoning else None
        }
        
        self.feedback_history.append(feedback_entry)
        
        # Analyze feedback sentiment
        sentiment = self._analyze_sentiment(feedback)
        feedback_entry["sentiment"] = sentiment
        
        # Update patterns based on feedback
        await self._update_patterns(feedback_entry, thought_process)
        
        # Update preferences
        await self._update_preferences(feedback_entry, thought_process)
        
        # Save learning data
        await self._save_learning_data()
    
    def _analyze_sentiment(self, feedback: str) -> str:
        """Simple sentiment analysis of feedback"""
        positive_words = ["good", "great", "excellent", "perfect", "correct", "helpful", "useful"]
        negative_words = ["bad", "wrong", "incorrect", "terrible", "useless", "unhelpful"]
        
        feedback_lower = feedback.lower()
        
        positive_count = sum(1 for word in positive_words if word in feedback_lower)
        negative_count = sum(1 for word in negative_words if word in feedback_lower)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    async def _update_patterns(self, feedback_entry: Dict, thought_process: ThoughtProcess):
        """Update learned patterns based on feedback"""
        prompt_pattern = self._extract_pattern(thought_process.prompt)
        
        if prompt_pattern not in self.patterns:
            self.patterns[prompt_pattern] = {
                "successful_approaches": [],
                "failed_approaches": [],
                "total_interactions": 0,
                "positive_feedback_count": 0
            }
        
        pattern_data = self.patterns[prompt_pattern]
        pattern_data["total_interactions"] += 1
        
        if feedback_entry["sentiment"] == "positive":
            pattern_data["positive_feedback_count"] += 1
            
            # Record successful approach
            if thought_process.reasoning:
                approach = {
                    "reasoning_type": thought_process.reasoning.metadata.get("task_type", "unknown"),
                    "tools_used": [tool.name for tool in thought_process.available_tools],
                    "confidence": thought_process.reasoning.confidence
                }
                pattern_data["successful_approaches"].append(approach)
        
        elif feedback_entry["sentiment"] == "negative":
            # Record failed approach
            if thought_process.reasoning:
                approach = {
                    "reasoning_type": thought_process.reasoning.metadata.get("task_type", "unknown"),
                    "tools_used": [tool.name for tool in thought_process.available_tools],
                    "confidence": thought_process.reasoning.confidence
                }
                pattern_data["failed_approaches"].append(approach)
    
    async def _update_preferences(self, feedback_entry: Dict, thought_process: ThoughtProcess):
        """Update user preferences based on feedback"""
        if feedback_entry["sentiment"] == "positive":
            # Learn from positive feedback
            if thought_process.response and len(thought_process.response.content) < 100:
                self.preferences["response_length"] = self.preferences.get("response_length", "short")
            elif thought_process.response and len(thought_process.response.content) > 500:
                self.preferences["response_length"] = "detailed"
            
            # Tool usage preferences
            if thought_process.available_tools:
                for tool in thought_process.available_tools:
                    tool_name = tool.name
                    if tool_name not in self.preferences.get("preferred_tools", []):
                        self.preferences.setdefault("preferred_tools", []).append(tool_name)
    
    def _extract_pattern(self, prompt: str) -> str:
        """Extract a pattern from the prompt for categorization"""
        # Simple pattern extraction based on keywords
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ["what", "explain", "describe"]):
            return "question_answering"
        elif any(word in prompt_lower for word in ["create", "make", "generate", "write"]):
            return "creative_task"
        elif any(word in prompt_lower for word in ["fix", "solve", "debug", "error"]):
            return "problem_solving"
        elif any(word in prompt_lower for word in ["analyze", "compare", "evaluate"]):
            return "analysis"
        else:
            return "general"
    
    def get_recommendations(self, prompt: str) -> Dict[str, Any]:
        """Get recommendations based on learned patterns"""
        pattern = self._extract_pattern(prompt)
        
        recommendations = {
            "suggested_approach": "default",
            "confidence": 0.5,
            "preferred_tools": [],
            "response_style": "balanced"
        }
        
        if pattern in self.patterns:
            pattern_data = self.patterns[pattern]
            
            # Calculate success rate
            success_rate = (pattern_data["positive_feedback_count"] / 
                          max(pattern_data["total_interactions"], 1))
            
            recommendations["confidence"] = success_rate
            
            # Find most successful approach
            if pattern_data["successful_approaches"]:
                most_common_approach = max(
                    set(a["reasoning_type"] for a in pattern_data["successful_approaches"]),
                    key=lambda x: sum(1 for a in pattern_data["successful_approaches"] 
                                    if a["reasoning_type"] == x)
                )
                recommendations["suggested_approach"] = most_common_approach
                
                # Get preferred tools for this approach
                successful_tools = []
                for approach in pattern_data["successful_approaches"]:
                    if approach["reasoning_type"] == most_common_approach:
                        successful_tools.extend(approach["tools_used"])
                
                if successful_tools:
                    recommendations["preferred_tools"] = list(set(successful_tools))
        
        # Apply general preferences
        if "response_length" in self.preferences:
            recommendations["response_style"] = self.preferences["response_length"]
        
        if "preferred_tools" in self.preferences:
            recommendations["preferred_tools"].extend(self.preferences["preferred_tools"])
            recommendations["preferred_tools"] = list(set(recommendations["preferred_tools"]))
        
        return recommendations
    
    async def _save_learning_data(self):
        """Save learning data to disk"""
        try:
            # Save feedback history
            with open(os.path.join(self.learning_path, "feedback_history.json"), 'w') as f:
                json.dump(self.feedback_history[-1000:], f, indent=2)  # Keep last 1000 entries
            
            # Save patterns
            with open(os.path.join(self.learning_path, "patterns.json"), 'w') as f:
                json.dump(self.patterns, f, indent=2)
            
            # Save preferences
            with open(os.path.join(self.learning_path, "preferences.json"), 'w') as f:
                json.dump(self.preferences, f, indent=2)
        
        except Exception as e:
            print(f"Error saving learning data: {e}")
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get statistics about the learning progress"""
        return {
            "total_feedback_entries": len(self.feedback_history),
            "learned_patterns": len(self.patterns),
            "stored_preferences": len(self.preferences),
            "recent_feedback_sentiment": {
                "positive": sum(1 for f in self.feedback_history[-50:] 
                              if f.get("sentiment") == "positive"),
                "negative": sum(1 for f in self.feedback_history[-50:] 
                              if f.get("sentiment") == "negative"),
                "neutral": sum(1 for f in self.feedback_history[-50:] 
                             if f.get("sentiment") == "neutral")
            }
        }