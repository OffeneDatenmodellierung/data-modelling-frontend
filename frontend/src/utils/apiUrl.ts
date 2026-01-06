/**
 * Utility to get the correct API base URL
 * - If VITE_API_BASE_URL is set and is a full URL, use it
 * - Otherwise, use empty string for relative URLs (proxied by Nginx in Docker)
 * - Fallback to localhost:8081 only for SSR/Node environments
 */

export function getApiBaseUrl(): string {
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If set and is a full URL, use it
  if (envApiBaseUrl && envApiBaseUrl.trim() !== '' && (envApiBaseUrl.startsWith('http://') || envApiBaseUrl.startsWith('https://'))) {
    return envApiBaseUrl;
  }
  
  // In browser, use empty string for relative URLs (proxied by Nginx)
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // Fallback for SSR/Node environments
  return 'http://localhost:8081';
}

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - API endpoint path (e.g., '/api/v1/health')
 * @returns Full URL or relative URL depending on configuration
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === '') {
    // Relative URL - will be proxied by Nginx
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
  // Full URL
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}



