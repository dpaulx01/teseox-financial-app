import os
import sys
from pathlib import Path

# Ruta base del proyecto (ajusta según la carpeta en public_html)
PROJECT_ROOT = Path(__file__).resolve().parent

# Añadir el proyecto al PYTHONPATH
sys.path.insert(0, str(PROJECT_ROOT))

# Variables de entorno mínimas
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("SITEGROUND", "true")

# Cargar variables desde .env si está disponible
try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None

if load_dotenv:
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path)

# Importar la app FastAPI y convertirla a WSGI para Passenger
try:
    from a2wsgi import ASGIMiddleware
    from api_server_rbac import app as fastapi_app

    # Passenger espera un objeto WSGI llamado 'application'
    # FastAPI es ASGI nativo, usamos a2wsgi para convertir a WSGI
    application = ASGIMiddleware(fastapi_app)
except Exception as exc:  # pragma: no cover - logging en producción
    # Registrar el error en stdout para Passenger
    sys.stderr.write(f"Error al iniciar la aplicación: {exc}\n")
    import traceback
    traceback.print_exc(file=sys.stderr)
    raise

