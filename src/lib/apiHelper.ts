export const N8N_BASE_URL = "https://151.145.89.228.sslip.io/webhook";

/**
 * Builds the API URL. In production on Vercel, it routes through the /api/n8n proxy to enable edge caching.
 * @param path The webhook path (e.g., "Doch-1", "load-guards")
 * @param params Query parameters
 */
export function getApiUrl(path: string, params: Record<string, string> = {}): string {
  // In development, we use the direct n8n URL unless VITE_USE_VERCEL_PROXY is set
  const useProxy = import.meta.env.PROD || import.meta.env.VITE_USE_VERCEL_PROXY === 'true';
  
  if (useProxy) {
    const searchParams = new URLSearchParams({
      path,
      ...params
    });
    
    // Check if the user is a commander (or has editing rights)
    // By adding bypass=true, Vercel will not cache this request.
    const isCommander = localStorage.getItem("is_commander") === "true";
    if (isCommander) {
      searchParams.append('bypass', 'true');
    }
    
    return `/api/n8n?${searchParams.toString()}`;
  } else {
    const searchParams = new URLSearchParams(params);
    const qs = searchParams.toString();
    return `${N8N_BASE_URL}/${path}${qs ? `?${qs}` : ''}`;
  }
}
