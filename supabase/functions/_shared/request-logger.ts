// Shared request logging utilities for edge functions
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RequestLogEntry {
  correlation_id?: string;
  request_id?: string;
  session_id?: string;
  user_id?: string;
  endpoint: string;
  method: string;
  status_code?: number;
  latency_ms?: number;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  request_body?: Record<string, unknown>;
  response_body?: Record<string, unknown>;
}

/**
 * Log a request to the database
 */
export async function logRequest(
  supabase: SupabaseClient,
  entry: RequestLogEntry
): Promise<void> {
  try {
    // Don't log internal health checks or too frequent operations
    const skipEndpoints = ['health-monitor', 'observability-alerts'];
    if (skipEndpoints.some(e => entry.endpoint.includes(e))) {
      return;
    }

    // Sanitize request/response bodies - remove sensitive data
    const sanitizedRequestBody = sanitizeBody(entry.request_body);
    const sanitizedResponseBody = sanitizeBody(entry.response_body);

    await supabase.from('request_logs').insert({
      ...entry,
      request_body: sanitizedRequestBody,
      response_body: sanitizedResponseBody,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log request:', error);
  }
}

/**
 * Remove sensitive fields from request/response bodies
 */
function sanitizeBody(body?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!body) return undefined;

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
    'national_id',
    'otp',
    'otp_code',
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Also check nested objects
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}

/**
 * Extract correlation ID from request headers or generate one
 */
export function getCorrelationId(req: Request): string {
  return (
    req.headers.get('x-correlation-id') ||
    `srv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
  );
}

/**
 * Extract session ID from request headers
 */
export function getSessionId(req: Request): string | undefined {
  return req.headers.get('x-session-id') || undefined;
}

/**
 * Extract request ID from headers or generate one
 */
export function getRequestId(req: Request): string {
  return (
    req.headers.get('x-request-id') ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * Create a request context object for logging
 */
export function createRequestContext(req: Request, endpoint: string): {
  correlationId: string;
  requestId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress: string;
  method: string;
  endpoint: string;
  startTime: number;
} {
  return {
    correlationId: getCorrelationId(req),
    requestId: getRequestId(req),
    sessionId: getSessionId(req),
    userAgent: getUserAgent(req),
    ipAddress: req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown',
    method: req.method,
    endpoint,
    startTime: Date.now(),
  };
}

/**
 * Complete and log a request
 */
export async function completeRequest(
  supabase: SupabaseClient,
  context: ReturnType<typeof createRequestContext>,
  statusCode: number,
  userId?: string,
  errorMessage?: string,
  requestBody?: Record<string, unknown>,
  responseBody?: Record<string, unknown>
): Promise<void> {
  const latencyMs = Date.now() - context.startTime;

  await logRequest(supabase, {
    correlation_id: context.correlationId,
    request_id: context.requestId,
    session_id: context.sessionId,
    user_id: userId,
    endpoint: context.endpoint,
    method: context.method,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    request_body: requestBody,
    response_body: responseBody,
  });
}
