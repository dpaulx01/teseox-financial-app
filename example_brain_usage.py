#!/usr/bin/env python3
"""
Example usage of the Brain module

This demonstrates how to use the enhanced AI Brain system
"""

import asyncio
import os
from brain import Brain, BrainConfig
from brain.core.config import ModelProvider, ModelConfig, MemoryConfig, ToolConfig


async def main():
    print("🧠 AI Brain System - Example Usage")
    print("=" * 50)
    
    # Create configuration
    config = BrainConfig(
        name="Enhanced AI Assistant",
        version="1.0.0",
        primary_model=ModelConfig(
            provider=ModelProvider.ANTHROPIC,
            model_name="claude-3-haiku-20240307",  # Using Haiku for this example
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            max_tokens=1024,
            temperature=0.7
        ),
        memory=MemoryConfig(
            max_short_term_items=50,
            max_long_term_items=1000,
            enable_semantic_search=False  # Disabled for this example
        ),
        tools=ToolConfig(
            enabled_tools=["calculator", "file_reader", "web_search"],
            max_parallel_tools=3
        ),
        enable_logging=True,
        enable_learning=True
    )
    
    # Initialize brain
    print("🔧 Initializing Brain...")
    brain = Brain(config)
    
    # Example interactions
    test_prompts = [
        "What is 25 * 47?",
        "Explain the concept of machine learning in simple terms",
        "How can I optimize a Python script for better performance?",
        "Create a simple todo list structure in JSON format"
    ]
    
    print("\n💭 Starting Brain interactions...\n")
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"🤔 Query {i}: {prompt}")
        print("-" * 30)
        
        try:
            # Main thinking process
            thought_process = await brain.think(prompt)
            
            print(f"🎯 Reasoning: {thought_process.reasoning.summary if thought_process.reasoning else 'None'}")
            print(f"⚙️  Available Tools: {[tool.name for tool in thought_process.available_tools]}")
            print(f"🎤 Response: {thought_process.response.content if thought_process.response else 'No response generated'}")
            
            # Simulate user feedback (in real usage, this would come from user)
            feedback_examples = ["Great!", "This is helpful", "Could be more detailed", "Perfect explanation"]
            feedback = feedback_examples[i % len(feedback_examples)]
            
            await brain.learn(feedback, {"interaction_id": i})
            print(f"📚 Learned from feedback: {feedback}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n" + "="*50 + "\n")
    
    # Display brain statistics
    print("📊 Brain Statistics:")
    memory_stats = brain.memory.get_summary()
    print(f"   Memory: {memory_stats['total_memories']} total memories")
    print(f"   Tools: {len(brain.tools.list_tools())} available tools")
    
    # Save brain state
    print("\n💾 Saving brain state...")
    await brain.save_state("./brain_state_backup.json")
    print("   State saved successfully!")


def simple_example():
    """Simple synchronous example"""
    print("\n🚀 Simple Example (without async):")
    print("-" * 30)
    
    # Check if API key is available
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  ANTHROPIC_API_KEY not set. Please set it to use the full functionality.")
        print("   Example: export ANTHROPIC_API_KEY='your-api-key-here'")
        return
    
    # Create a basic brain instance
    brain = Brain()
    print(f"   ✅ Brain initialized: {brain.config.name}")
    print(f"   📝 Model: {brain.config.primary_model.model_name}")
    print(f"   🛠️  Tools available: {len(brain.tools.list_tools())}")


if __name__ == "__main__":
    print("🧠 AI Brain System Demonstration\n")
    
    # Simple example first
    simple_example()
    
    # Full async example
    if os.getenv("ANTHROPIC_API_KEY"):
        asyncio.run(main())
    else:
        print("\n📋 To run the full example:")
        print("1. Set your Anthropic API key: export ANTHROPIC_API_KEY='your-key'")
        print("2. Install dependencies: pip install anthropic sentence-transformers")
        print("3. Run this script again")
    
    print("\n✨ Brain system ready for integration!")