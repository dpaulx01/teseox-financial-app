# ===================================
# STAGE 1: Build Frontend (React + Vite)
# ===================================
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies like vite)
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build frontend for production
RUN npm run build

# ===================================
# STAGE 2: Setup Python Backend
# ===================================
FROM python:3.11-slim AS backend-builder

WORKDIR /app

# Install system dependencies for MySQL and compilation
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ===================================
# STAGE 3: Final Production Image
# ===================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /frontend/dist ./dist

# Copy backend application code
COPY api_server_rbac.py ./
COPY config.py ./
COPY routes ./routes
COPY database ./database
COPY auth ./auth
COPY brain ./brain

# Create necessary directories
RUN mkdir -p logs uploads && \
    chmod 755 logs uploads

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
CMD uvicorn api_server_rbac:app --host 0.0.0.0 --port ${PORT} --workers 1
