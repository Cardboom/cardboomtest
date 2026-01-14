// Shared rate limiting utilities for edge functions
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowSeconds: number;
}

// Default rate limits by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - strict limits
  'auth/login': { endpoint: 'auth/login', limit: 5, windowSeconds: 60 },
  'auth/signup': { endpoint: 'auth/signup', limit: 3, windowSeconds: 60 },
  'auth/reset-password': { endpoint: 'auth/reset-password', limit: 3, windowSeconds: 300 },
  'auth/verify-otp': { endpoint: 'auth/verify-otp', limit: 5, windowSeconds: 300 },
  
  // Image upload - per-user throttle
  'upload/image': { endpoint: 'upload/image', limit: 20, windowSeconds: 60 },
  'upload/grading': { endpoint: 'upload/grading', limit: 10, windowSeconds: 300 },
  
  // Search/listing - protect from scraping
  'api/search': { endpoint: 'api/search', limit: 60, windowSeconds: 60 },
  'api/listings': { endpoint: 'api/listings', limit: 100, windowSeconds: 60 },
  'api/prices': { endpoint: 'api/prices', limit: 120, windowSeconds: 60 },
  
  // Grading submission
  'grading/submit': { endpoint: 'grading/submit', limit: 5, windowSeconds: 60 },
  
  // Payments - very strict
  'payment/init': { endpoint: 'payment/init', limit: 10, windowSeconds: 60 },
  'payment/callback': { endpoint: 'payment/callback', limit: 20, windowSeconds: 60 },
  
  // Default for unlisted endpoints
  'default': { endpoint: 'default', limit: 100, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Check rate limit using database function
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  identifierType: 'ip' | 'user' | 'email',
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
  
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_endpoint: config.endpoint,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        currentCount: 0,
        limit: config.limit,
        remaining: config.limit,
        resetAt: new Date(Date.now() + config.windowSeconds * 1000),
      };
    }

    const result = data[0];
    const resetAt = new Date(result.reset_at);
    const retryAfterSeconds = result.is_limited 
      ? Math.ceil((resetAt.getTime() - Date.now()) / 1000)
      : undefined;

    return {
      allowed: !result.is_limited,
      currentCount: result.current_count,
      limit: config.limit,
      remaining: result.remaining,
      resetAt,
      retryAfterSeconds,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open
    return {
      allowed: true,
      currentCount: 0,
      limit: config.limit,
      remaining: config.limit,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (result.retryAfterSeconds) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`,
      retry_after: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Extract client IP from request
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
