// Centralized CORS configuration for all edge functions
// Only allow requests from cardboom.com and lovable preview/published URLs

const ALLOWED_ORIGINS = [
  'https://cardboom.com',
  'https://www.cardboom.com',
  // Lovable preview and published URLs
  'https://id-preview--b56128be-ee17-48af-baa7-915f88c0900b.lovable.app',
  'https://cardboomtest.lovable.app',
  // Lovable project URLs
  'https://b56128be-ee17-48af-baa7-915f88c0900b.lovableproject.com',
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Default to cardboom.com if origin not allowed

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-correlation-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}

// For functions that need to accept any origin (e.g., market-api with API key auth)
export function getPublicCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}
