import logging
import os
from datetime import datetime
from typing import Optional


def setup_logger(name: str, level: str = "INFO", log_path: Optional[str] = None) -> logging.Logger:
    """
    Set up a logger with file and console handlers
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler if path is provided
    if log_path:
        os.makedirs(log_path, exist_ok=True)
        log_file = os.path.join(
            log_path, 
            f"{name}_{datetime.now().strftime('%Y%m%d')}.log"
        )
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger