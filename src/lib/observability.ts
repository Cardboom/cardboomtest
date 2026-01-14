/**
 * Client-side observability utilities
 * 
 * Provides structured logging, error tracking, and request correlation
 * for the CardBoom frontend.
 */

import { generateRequestCorrelationId, getSessionId, logCriticalAction } from './correlationId';
import { supabase } from '@/integrations/supabase/client';

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Error categories for classification
export type ErrorCategory = 
  | 'auth'
  | 'payment'
  | 'api'
  | 'ui'
  | 'network'
  | 'validation'
  | 'unknown';

interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
}

// In-memory storage for performance entries
const performanceLog: PerformanceEntry[] = [];
const MAX_PERF_ENTRIES = 100;

/**
 * Track a performance measurement
 */
export function trackPerformance(name: string, duration: number): void {
  performanceLog.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  // Keep only recent entries
  if (performanceLog.length > MAX_PERF_ENTRIES) {
    performanceLog.shift();
  }

  // Log slow operations
  if (duration > 3000) {
    console.warn(`[Performance] Slow operation: ${name} took ${duration}ms`);
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(name?: string): {
  count: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
} {
  const entries = name 
    ? performanceLog.filter(e => e.name === name)
    : performanceLog;

  if (entries.length === 0) {
    return { count: 0, avgDuration: 0, maxDuration: 0, minDuration: 0, p95Duration: 0 };
  }

  const durations = entries.map(e => e.duration).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);

  return {
    count: entries.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    p95Duration: durations[p95Index] || durations[durations.length - 1],
  };
}

/**
 * Report an error with context
 */
export function reportError(
  error: Error | string,
  context: ErrorContext
): string {
  const correlationId = generateRequestCorrelationId();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry = {
    correlation_id: correlationId,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    error: errorMessage,
    stack: errorStack,
    ...context,
  };

  // Console output based on severity
  if (context.severity === 'critical' || context.severity === 'error') {
    console.error(`[${context.category.toUpperCase()}] ${errorMessage}`, logEntry);
  } else if (context.severity === 'warning') {
    console.warn(`[${context.category.toUpperCase()}] ${errorMessage}`, logEntry);
  }

  return correlationId;
}

/**
 * Wrap an async function with error tracking
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context: Omit<ErrorContext, 'severity'>
): Promise<T> {
  const startTime = Date.now();
  const correlationId = generateRequestCorrelationId();

  try {
    const result = await fn();
    trackPerformance(context.action || 'unknown', Date.now() - startTime);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    reportError(error instanceof Error ? error : String(error), {
      ...context,
      severity: 'error',
      metadata: {
        ...context.metadata,
        duration,
        correlationId,
      },
    });

    throw error;
  }
}

/**
 * Create a fetch wrapper with observability
 */
export function createObservableFetch() {
  const originalFetch = window.fetch;

  return async function observableFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const correlationId = generateRequestCorrelationId();
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Add correlation headers
    const headers = new Headers(init?.headers);
    headers.set('x-correlation-id', correlationId);
    headers.set('x-session-id', getSessionId());

    try {
      const response = await originalFetch(input, {
        ...init,
        headers,
      });

      const duration = Date.now() - startTime;
      trackPerformance(`fetch:${new URL(url, window.location.origin).pathname}`, duration);

      // Log slow requests
      if (duration > 5000) {
        console.warn(`[Slow Request] ${url} took ${duration}ms`);
      }

      // Log errors
      if (!response.ok && response.status >= 500) {
        reportError(`HTTP ${response.status}: ${response.statusText}`, {
          category: 'api',
          severity: 'error',
          route: window.location.pathname,
          action: `fetch:${url}`,
          metadata: {
            status: response.status,
            duration,
            correlationId,
          },
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      reportError(error instanceof Error ? error : String(error), {
        category: 'network',
        severity: 'error',
        route: window.location.pathname,
        action: `fetch:${url}`,
        metadata: {
          duration,
          correlationId,
        },
      });

      throw error;
    }
  };
}

/**
 * Health check function
 */
export async function checkHealth(): Promise<{
  database: boolean;
  latency: number;
  timestamp: string;
}> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - startTime;

    return {
      database: !error,
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      database: false,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Feature flag checker
 */
export async function isFeatureEnabled(flagKey: string, userId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('flag_value, rollout_percentage, allowed_user_ids')
      .eq('flag_key', flagKey)
      .single();

    if (error || !data) return false;

    // Check if explicitly disabled
    if (!data.flag_value) return false;

    // Check user allowlist
    if (data.allowed_user_ids && userId) {
      if ((data.allowed_user_ids as string[]).includes(userId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (data.rollout_percentage < 100) {
      // Use consistent hashing based on userId or session
      const identifier = userId || getSessionId();
      const hash = hashCode(identifier + flagKey);
      const bucket = Math.abs(hash) % 100;
      return bucket < data.rollout_percentage;
    }

    return data.flag_value;
  } catch {
    return false;
  }
}

/**
 * Simple hash function for consistent rollout
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Re-export for convenience
export { logCriticalAction, generateRequestCorrelationId, getSessionId };
