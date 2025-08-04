import asyncio
import importlib
import inspect
import os
from typing import Dict, Any, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor
import json

from ..core.interfaces import Tool
from ..core.config import ToolConfig
from .base import BaseTool


class ToolManager:
    """
    Manages and orchestrates tools available to the brain
    """
    
    def __init__(self, config: ToolConfig):
        self.config = config
        self.tools: Dict[str, Tool] = {}
        self.tool_instances: Dict[str, BaseTool] = {}
        self.executor = ThreadPoolExecutor(max_workers=config.max_parallel_tools)
        
        self._load_builtin_tools()
        self._load_custom_tools()
    
    def _load_builtin_tools(self):
        """Load built-in tools"""
        builtin_tools = {
            "web_search": {
                "description": "Search the web for information",
                "parameters": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {"type": "integer", "description": "Number of results", "default": 5}
                }
            },
            "calculator": {
                "description": "Perform mathematical calculations",
                "parameters": {
                    "expression": {"type": "string", "description": "Mathematical expression to evaluate"}
                }
            },
            "file_reader": {
                "description": "Read contents of a file",
                "parameters": {
                    "path": {"type": "string", "description": "File path"},
                    "encoding": {"type": "string", "description": "File encoding", "default": "utf-8"}
                }
            },
            "file_writer": {
                "description": "Write contents to a file",
                "parameters": {
                    "path": {"type": "string", "description": "File path"},
                    "content": {"type": "string", "description": "Content to write"},
                    "mode": {"type": "string", "description": "Write mode", "default": "w"}
                }
            },
            "code_executor": {
                "description": "Execute Python code safely",
                "parameters": {
                    "code": {"type": "string", "description": "Python code to execute"},
                    "timeout": {"type": "integer", "description": "Execution timeout in seconds", "default": 10}
                }
            },
            "api_caller": {
                "description": "Make HTTP API calls",
                "parameters": {
                    "url": {"type": "string", "description": "API endpoint URL"},
                    "method": {"type": "string", "description": "HTTP method", "default": "GET"},
                    "headers": {"type": "object", "description": "Request headers", "default": {}},
                    "data": {"type": "object", "description": "Request data", "default": {}}
                }
            }
        }
        
        for tool_name, tool_info in builtin_tools.items():
            if not self.config.enabled_tools or tool_name in self.config.enabled_tools:
                self.tools[tool_name] = Tool(
                    name=tool_name,
                    description=tool_info["description"],
                    parameters=tool_info["parameters"]
                )
    
    def _load_custom_tools(self):
        """Load custom tools from the configured path"""
        if not os.path.exists(self.config.custom_tools_path):
            os.makedirs(self.config.custom_tools_path, exist_ok=True)
            return
        
        for filename in os.listdir(self.config.custom_tools_path):
            if filename.endswith('.py') and not filename.startswith('_'):
                module_name = filename[:-3]
                try:
                    spec = importlib.util.spec_from_file_location(
                        module_name,
                        os.path.join(self.config.custom_tools_path, filename)
                    )
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find tool classes in the module
                    for name, obj in inspect.getmembers(module):
                        if (inspect.isclass(obj) and 
                            issubclass(obj, BaseTool) and 
                            obj != BaseTool):
                            tool_instance = obj()
                            self.register_tool(tool_instance)
                
                except Exception as e:
                    print(f"Error loading custom tool {filename}: {e}")
    
    def register_tool(self, tool_instance: BaseTool):
        """Register a tool instance"""
        tool = Tool(
            name=tool_instance.name,
            description=tool_instance.description,
            parameters=tool_instance.get_parameters(),
            handler=tool_instance
        )
        self.tools[tool_instance.name] = tool
        self.tool_instances[tool_instance.name] = tool_instance
    
    async def get_relevant_tools(self, prompt: str) -> List[Tool]:
        """Get tools relevant to the given prompt"""
        relevant_tools = []
        prompt_lower = prompt.lower()
        
        # Simple keyword matching for now
        tool_keywords = {
            "web_search": ["search", "find", "google", "web", "internet"],
            "calculator": ["calculate", "math", "compute", "solve", "equation"],
            "file_reader": ["read", "open", "load", "file"],
            "file_writer": ["write", "save", "create", "output"],
            "code_executor": ["run", "execute", "code", "python", "script"],
            "api_caller": ["api", "request", "http", "fetch", "call"]
        }
        
        for tool_name, keywords in tool_keywords.items():
            if tool_name in self.tools:
                if any(keyword in prompt_lower for keyword in keywords):
                    relevant_tools.append(self.tools[tool_name])
        
        return relevant_tools
    
    async def execute(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a tool with given parameters"""
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        tool = self.tools[tool_name]
        
        # Validate parameters
        self._validate_parameters(tool, parameters)
        
        # Execute based on tool type
        if tool_name in self.tool_instances:
            # Custom tool with handler
            return await self.tool_instances[tool_name].execute(**parameters)
        else:
            # Built-in tool
            return await self._execute_builtin(tool_name, parameters)
    
    def _validate_parameters(self, tool: Tool, parameters: Dict[str, Any]):
        """Validate tool parameters"""
        for param_name, param_info in tool.parameters.items():
            if param_name not in parameters and "default" not in param_info:
                raise ValueError(f"Missing required parameter: {param_name}")
            
            # Add default values
            if param_name not in parameters and "default" in param_info:
                parameters[param_name] = param_info["default"]
    
    async def _execute_builtin(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute built-in tools"""
        if tool_name == "calculator":
            return await self._execute_calculator(parameters["expression"])
        elif tool_name == "file_reader":
            return await self._execute_file_reader(parameters["path"], parameters.get("encoding", "utf-8"))
        elif tool_name == "file_writer":
            return await self._execute_file_writer(
                parameters["path"], 
                parameters["content"], 
                parameters.get("mode", "w")
            )
        elif tool_name == "web_search":
            return await self._execute_web_search(parameters["query"], parameters.get("num_results", 5))
        elif tool_name == "code_executor":
            return await self._execute_code(parameters["code"], parameters.get("timeout", 10))
        elif tool_name == "api_caller":
            return await self._execute_api_call(
                parameters["url"],
                parameters.get("method", "GET"),
                parameters.get("headers", {}),
                parameters.get("data", {})
            )
        else:
            raise ValueError(f"Unknown built-in tool: {tool_name}")
    
    async def _execute_calculator(self, expression: str) -> float:
        """Execute mathematical calculations"""
        try:
            # Safe evaluation of mathematical expressions
            import ast
            import operator
            
            ops = {
                ast.Add: operator.add,
                ast.Sub: operator.sub,
                ast.Mult: operator.mul,
                ast.Div: operator.truediv,
                ast.Pow: operator.pow,
                ast.USub: operator.neg
            }
            
            def eval_expr(node):
                if isinstance(node, ast.Num):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    return ops[type(node.op)](eval_expr(node.left), eval_expr(node.right))
                elif isinstance(node, ast.UnaryOp):
                    return ops[type(node.op)](eval_expr(node.operand))
                else:
                    raise TypeError(node)
            
            node = ast.parse(expression, mode='eval')
            return eval_expr(node.body)
        except Exception as e:
            raise ValueError(f"Failed to evaluate expression: {e}")
    
    async def _execute_file_reader(self, path: str, encoding: str) -> str:
        """Read file contents"""
        try:
            with open(path, 'r', encoding=encoding) as f:
                return f.read()
        except Exception as e:
            raise IOError(f"Failed to read file: {e}")
    
    async def _execute_file_writer(self, path: str, content: str, mode: str) -> bool:
        """Write file contents"""
        try:
            with open(path, mode) as f:
                f.write(content)
            return True
        except Exception as e:
            raise IOError(f"Failed to write file: {e}")
    
    async def _execute_web_search(self, query: str, num_results: int) -> List[Dict[str, str]]:
        """Execute web search (placeholder)"""
        # This would integrate with a real search API
        return [
            {"title": f"Result {i+1} for: {query}", "url": f"https://example.com/{i}", "snippet": "..."}
            for i in range(num_results)
        ]
    
    async def _execute_code(self, code: str, timeout: int) -> Any:
        """Execute Python code safely"""
        # This would use a sandboxed execution environment
        return {"status": "success", "output": "Code execution not implemented in this version"}
    
    async def _execute_api_call(self, url: str, method: str, headers: Dict, data: Dict) -> Dict:
        """Make API calls"""
        # This would use aiohttp or requests
        return {"status": "success", "response": "API calling not implemented in this version"}
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """List all available tools"""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
            for tool in self.tools.values()
        ]