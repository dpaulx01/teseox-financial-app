// Centralized helper to resolve the API base URL across the frontend.
// Handles dev vs production and respects build-time overrides.
const resolveApiBaseUrl = (): string => {
  const env = (import.meta as any)?.env ?? {};
  const envBaseUrl = env?.VITE_API_BASE_URL;
  const isDevelopment = env?.DEV;

  if (envBaseUrl !== undefined) {
    return envBaseUrl;
  }

  if (isDevelopment) {
    return 'http://localhost:8001';
  }

  // Auto-detect API URL in production based on frontend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('run.app')) {
    return 'https://teseox-api-jrmpkqareq-uc.a.run.app';
  }

  return '';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
