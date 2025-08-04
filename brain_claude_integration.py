#!/usr/bin/env python3
"""
Enhanced Claude Integration using the Brain System

This replaces your original claude_request.py with a more powerful, 
modular brain-based approach.
"""

import os
import asyncio
from brain import Brain, BrainConfig
from brain.core.config import ModelProvider, ModelConfig


async def main():
    # Check for API key
    api_key = os.getenv('ANTHROPIC_API_KEY')
    
    if not api_key:
        print("❌ Error: No se encontró la API key.")
        print("Por favor, ejecuta: export ANTHROPIC_API_KEY='tu_clave_aqui'")
        return
    
    try:
        print("🧠 Inicializando Brain System...")
        
        # Configure the brain
        config = BrainConfig(
            name="Claude Brain Assistant",
            primary_model=ModelConfig(
                provider=ModelProvider.ANTHROPIC,
                model_name="claude-3-haiku-20240307",  # Start with Haiku
                api_key=api_key,
                max_tokens=1024,
                temperature=0.7
            ),
            enable_learning=True,
            enable_logging=True
        )
        
        # Initialize brain
        brain = Brain(config)
        print(f"✅ Brain inicializado: {brain.config.name}")
        
        # Interactive conversation
        print("\n💬 Iniciando conversación interactiva...")
        print("Escribe 'salir' para terminar, 'estado' para ver estadísticas")
        print("-" * 50)
        
        while True:
            try:
                user_input = input("\n🤔 Tu pregunta: ").strip()
                
                if user_input.lower() in ['salir', 'exit', 'quit']:
                    break
                elif user_input.lower() == 'estado':
                    # Show brain statistics
                    memory_stats = brain.memory.get_summary()
                    print(f"\n📊 Estadísticas del Brain:")
                    print(f"   💾 Memorias: {memory_stats['total_memories']} total")
                    print(f"   🛠️  Herramientas: {len(brain.tools.list_tools())} disponibles")
                    
                    if brain.learning:
                        learning_stats = brain.learning.get_learning_stats()
                        print(f"   📚 Aprendizaje: {learning_stats['total_feedback_entries']} interacciones")
                    continue
                
                if not user_input:
                    continue
                
                print("\n🤖 Pensando...")
                
                # Use the brain to think and respond
                thought_process = await brain.think(user_input)
                
                print(f"\n💡 Razonamiento: {thought_process.reasoning.summary if thought_process.reasoning else 'Análisis directo'}")
                
                if thought_process.available_tools:
                    print(f"🛠️  Herramientas consideradas: {', '.join(tool.name for tool in thought_process.available_tools[:3])}")
                
                print(f"\n🎯 Respuesta:")
                print(thought_process.response.content if thought_process.response else "No se pudo generar respuesta")
                
                # Optional feedback collection
                feedback = input("\n💬 ¿Fue útil esta respuesta? (buena/mala/enter para continuar): ").strip()
                if feedback:
                    await brain.learn(feedback)
                    print("📚 Gracias por el feedback - el brain ha aprendido de esta interacción")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\n❌ Error durante la conversación: {e}")
        
        print("\n💾 Guardando estado del brain...")
        await brain.save_state("./brain_session_backup.json")
        print("✅ Sesión guardada exitosamente")
        
    except Exception as e:
        print(f"\n❌ Ocurrió un error: {e}")
        print("Verifica que tengas instaladas las dependencias: pip install -r requirements.txt")


def simple_test():
    """Simple test without full conversation"""
    print("🧪 Prueba simple del Brain System")
    
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("⚠️  API key no configurada - solo mostrando estructura")
        brain = Brain()
        print(f"✅ Brain creado: {brain.config.name}")
        print(f"🛠️  Herramientas disponibles: {len(brain.tools.list_tools())}")
        return
    
    # Run a simple async test
    asyncio.run(simple_async_test(api_key))


async def simple_async_test(api_key: str):
    """Simple async test"""
    brain = Brain(BrainConfig(
        primary_model=ModelConfig(
            provider=ModelProvider.ANTHROPIC,
            model_name="claude-3-haiku-20240307",
            api_key=api_key
        )
    ))
    
    result = await brain.think("¿Cuál es la capital de España?")
    print(f"🎯 Respuesta: {result.response.content if result.response else 'Sin respuesta'}")


if __name__ == "__main__":
    print("🧠 Brain-Enhanced Claude Integration")
    print("=" * 50)
    
    # Check if we should run interactive mode
    mode = input("Selecciona modo:\n1. Interactivo (completo)\n2. Prueba simple\nOpción (1/2): ").strip()
    
    if mode == "2":
        simple_test()
    else:
        asyncio.run(main())
    
    print("\n✨ ¡Gracias por usar el Brain System!")