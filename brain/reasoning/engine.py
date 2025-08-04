import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import re

from ..core.interfaces import Memory, Tool, ReasoningResult


class ReasoningEngine:
    """
    Handles reasoning, analysis, and decision-making processes
    """
    
    def __init__(self):
        self.reasoning_patterns = self._load_reasoning_patterns()
        self.decision_criteria = self._load_decision_criteria()
    
    def _load_reasoning_patterns(self) -> Dict[str, Any]:
        """Load common reasoning patterns"""
        return {
            "question_answering": {
                "triggers": ["what", "why", "how", "when", "where", "who"],
                "approach": "analytical"
            },
            "problem_solving": {
                "triggers": ["solve", "fix", "debug", "issue", "problem", "error"],
                "approach": "systematic"
            },
            "creative_task": {
                "triggers": ["create", "design", "imagine", "generate", "write"],
                "approach": "creative"
            },
            "analysis": {
                "triggers": ["analyze", "evaluate", "compare", "assess", "review"],
                "approach": "comparative"
            },
            "instruction_following": {
                "triggers": ["do", "make", "build", "implement", "execute"],
                "approach": "procedural"
            }
        }
    
    def _load_decision_criteria(self) -> Dict[str, float]:
        """Load decision-making criteria weights"""
        return {
            "relevance": 0.3,
            "feasibility": 0.25,
            "efficiency": 0.2,
            "safety": 0.15,
            "user_preference": 0.1
        }
    
    async def analyze(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        memories: Optional[List[Memory]] = None,
        tools: Optional[List[Tool]] = None
    ) -> ReasoningResult:
        """
        Analyze the prompt and context to determine the best approach
        """
        # Identify task type
        task_type = self._identify_task_type(prompt)
        
        # Analyze complexity
        complexity = self._assess_complexity(prompt, context)
        
        # Generate reasoning steps
        steps = await self._generate_reasoning_steps(
            prompt, task_type, complexity, memories, tools
        )
        
        # Evaluate confidence
        confidence = self._calculate_confidence(steps, memories, tools)
        
        # Suggest actions
        suggested_actions = self._suggest_actions(task_type, tools, complexity)
        
        # Generate summary
        summary = self._generate_summary(task_type, steps, confidence)
        
        return ReasoningResult(
            summary=summary,
            steps=steps,
            confidence=confidence,
            suggested_actions=suggested_actions,
            metadata={
                "task_type": task_type,
                "complexity": complexity,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    def _identify_task_type(self, prompt: str) -> str:
        """Identify the type of task from the prompt"""
        prompt_lower = prompt.lower()
        
        for pattern_name, pattern_info in self.reasoning_patterns.items():
            if any(trigger in prompt_lower for trigger in pattern_info["triggers"]):
                return pattern_name
        
        return "general"
    
    def _assess_complexity(self, prompt: str, context: Optional[Dict[str, Any]]) -> str:
        """Assess task complexity"""
        complexity_score = 0
        
        # Length factor
        if len(prompt) > 200:
            complexity_score += 1
        
        # Multiple requirements
        if len(re.findall(r'[,;]|and|also|then', prompt.lower())) > 2:
            complexity_score += 1
        
        # Technical terms
        technical_terms = ["algorithm", "optimize", "implement", "architecture", "framework"]
        if any(term in prompt.lower() for term in technical_terms):
            complexity_score += 1
        
        # Context complexity
        if context and len(context) > 5:
            complexity_score += 1
        
        if complexity_score >= 3:
            return "high"
        elif complexity_score >= 1:
            return "medium"
        else:
            return "low"
    
    async def _generate_reasoning_steps(
        self,
        prompt: str,
        task_type: str,
        complexity: str,
        memories: Optional[List[Memory]],
        tools: Optional[List[Tool]]
    ) -> List[str]:
        """Generate reasoning steps based on the analysis"""
        steps = []
        
        # Initial understanding
        steps.append(f"Understanding the request: {task_type} task with {complexity} complexity")
        
        # Memory integration
        if memories:
            relevant_memories = [m for m in memories if m.importance > 0.5]
            if relevant_memories:
                steps.append(f"Found {len(relevant_memories)} relevant memories to consider")
        
        # Tool analysis
        if tools:
            steps.append(f"Identified {len(tools)} potentially useful tools")
            for tool in tools[:3]:  # Top 3 tools
                steps.append(f"- {tool.name}: {tool.description}")
        
        # Approach determination
        approach = self.reasoning_patterns.get(task_type, {}).get("approach", "general")
        steps.append(f"Selected {approach} approach for this task")
        
        # Specific reasoning based on task type
        if task_type == "problem_solving":
            steps.extend([
                "1. Identify the core problem",
                "2. Analyze potential causes",
                "3. Generate solution options",
                "4. Evaluate and select best solution"
            ])
        elif task_type == "creative_task":
            steps.extend([
                "1. Understand requirements and constraints",
                "2. Generate creative ideas",
                "3. Refine and develop concepts",
                "4. Present final creation"
            ])
        elif task_type == "analysis":
            steps.extend([
                "1. Gather relevant information",
                "2. Identify key factors",
                "3. Compare and contrast elements",
                "4. Draw conclusions"
            ])
        
        return steps
    
    def _calculate_confidence(
        self,
        steps: List[str],
        memories: Optional[List[Memory]],
        tools: Optional[List[Tool]]
    ) -> float:
        """Calculate confidence in the reasoning approach"""
        confidence = 0.5  # Base confidence
        
        # More steps indicate thorough analysis
        if len(steps) > 5:
            confidence += 0.1
        
        # Having relevant memories increases confidence
        if memories and any(m.importance > 0.7 for m in memories):
            confidence += 0.2
        
        # Having appropriate tools increases confidence
        if tools and len(tools) > 0:
            confidence += 0.1
        
        # Clear reasoning pattern match
        if any("Selected" in step and "approach" in step for step in steps):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _suggest_actions(
        self,
        task_type: str,
        tools: Optional[List[Tool]],
        complexity: str
    ) -> List[str]:
        """Suggest specific actions based on the analysis"""
        actions = []
        
        # General actions based on task type
        if task_type == "problem_solving":
            actions.append("Gather more information about the problem")
            actions.append("Test potential solutions incrementally")
        elif task_type == "creative_task":
            actions.append("Brainstorm multiple alternatives")
            actions.append("Iterate on the most promising ideas")
        elif task_type == "analysis":
            actions.append("Collect comprehensive data")
            actions.append("Create comparative visualizations")
        
        # Tool-specific actions
        if tools:
            for tool in tools[:2]:  # Top 2 tools
                actions.append(f"Use {tool.name} to {tool.description.lower()}")
        
        # Complexity-based actions
        if complexity == "high":
            actions.append("Break down into smaller sub-tasks")
            actions.append("Create checkpoints for progress validation")
        
        return actions
    
    def _generate_summary(
        self,
        task_type: str,
        steps: List[str],
        confidence: float
    ) -> str:
        """Generate a summary of the reasoning process"""
        confidence_level = "high" if confidence > 0.8 else "moderate" if confidence > 0.5 else "low"
        
        summary = f"Identified {task_type.replace('_', ' ')} task. "
        summary += f"Developed {len(steps)} step approach with {confidence_level} confidence. "
        
        if task_type in self.reasoning_patterns:
            approach = self.reasoning_patterns[task_type]["approach"]
            summary += f"Using {approach} reasoning methodology."
        
        return summary
    
    async def evaluate_decision(
        self,
        options: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate multiple options and recommend the best one"""
        scored_options = []
        
        for option in options:
            score = 0
            breakdown = {}
            
            for criterion, weight in self.decision_criteria.items():
                criterion_score = self._evaluate_criterion(option, criterion, context)
                breakdown[criterion] = criterion_score
                score += criterion_score * weight
            
            scored_options.append({
                "option": option,
                "score": score,
                "breakdown": breakdown
            })
        
        # Sort by score
        scored_options.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "recommended": scored_options[0] if scored_options else None,
            "all_options": scored_options,
            "criteria_used": list(self.decision_criteria.keys())
        }
    
    def _evaluate_criterion(
        self,
        option: Dict[str, Any],
        criterion: str,
        context: Dict[str, Any]
    ) -> float:
        """Evaluate an option against a specific criterion"""
        # Simplified scoring - in practice, this would be more sophisticated
        score = 0.5  # Default neutral score
        
        if criterion == "relevance":
            # Check if option addresses the main goal
            if "goal" in context and "addresses" in option:
                score = 0.8 if option["addresses"] == context["goal"] else 0.3
        
        elif criterion == "feasibility":
            # Check resource requirements
            if "resources" in option:
                score = 0.9 if option["resources"] == "low" else 0.5
        
        elif criterion == "efficiency":
            # Check time/computation requirements
            if "time" in option:
                score = 0.9 if option["time"] == "fast" else 0.4
        
        elif criterion == "safety":
            # Check risk level
            if "risk" in option:
                score = 0.1 if option["risk"] == "high" else 0.9
        
        elif criterion == "user_preference":
            # Check against stated preferences
            if "preferences" in context and "matches_preference" in option:
                score = 0.8 if option["matches_preference"] else 0.2
        
        return score