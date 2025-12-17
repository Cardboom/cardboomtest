/**
 * Centralized Error Reporting Service
 * 
 * Captures and reports errors with context:
 * - Failed price fetches
 * - Image load failures
 * - API timeouts
 * - Parsing/validation errors
 */

export type ErrorCategory = 
  | 'pricing'
  | 'image'
  | 'api'
  | 'validation'
  | 'network'
  | 'auth'
  | 'database'
  | 'unknown';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorLogEntry {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  error?: any;
  context?: Record<string, any>;
  timestamp: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

// Store last N errors in memory for debugging
const MAX_ERROR_LOG_SIZE = 100;
const errorLog: ErrorLogEntry[] = [];

// Subscribers for real-time error monitoring
const subscribers = new Set<(entry: ErrorLogEntry) => void>();

// Session ID for tracking
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an error with full context
 */
function logError(
  category: ErrorCategory,
  message: string,
  error?: any,
  context?: Record<string, any>
): string {
  const entry: ErrorLogEntry = {
    id: generateErrorId(),
    category,
    severity: 'error',
    message,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    sessionId,
  };
  
  // Add to log
  errorLog.unshift(entry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.pop();
  }
  
  // Console output with formatting
  console.error(
    `[${category.toUpperCase()}] ${message}`,
    error || '',
    context ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''
  );
  
  // Notify subscribers
  subscribers.forEach(cb => cb(entry));
  
  return entry.id;
}

/**
 * Log a warning
 */
function logWarning(
  category: ErrorCategory,
  message: string,
  context?: Record<string, any>
): string {
  const entry: ErrorLogEntry = {
    id: generateErrorId(),
    category,
    severity: 'warning',
    message,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    sessionId,
  };
  
  errorLog.unshift(entry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.pop();
  }
  
  console.warn(
    `[${category.toUpperCase()}] ${message}`,
    context ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''
  );
  
  subscribers.forEach(cb => cb(entry));
  
  return entry.id;
}

/**
 * Log an info message
 */
function logInfo(
  category: ErrorCategory,
  message: string,
  context?: Record<string, any>
): string {
  const entry: ErrorLogEntry = {
    id: generateErrorId(),
    category,
    severity: 'info',
    message,
    context,
    timestamp: new Date().toISOString(),
    sessionId,
  };
  
  errorLog.unshift(entry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.pop();
  }
  
  console.info(
    `[${category.toUpperCase()}] ${message}`,
    context ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''
  );
  
  subscribers.forEach(cb => cb(entry));
  
  return entry.id;
}

/**
 * Log a failed image load
 */
function logImageError(
  imageUrl: string,
  itemId?: string,
  itemName?: string
): void {
  logError('image', `Image failed to load: ${imageUrl}`, undefined, {
    imageUrl,
    itemId,
    itemName,
  });
}

/**
 * Log an API timeout
 */
function logApiTimeout(
  endpoint: string,
  duration: number,
  context?: Record<string, any>
): void {
  logError('api', `API timeout after ${duration}ms: ${endpoint}`, undefined, {
    endpoint,
    duration,
    ...context,
  });
}

/**
 * Log a price fetch failure
 */
function logPriceFetchError(
  itemId: string,
  source: string,
  error: any
): void {
  logError('pricing', `Failed to fetch price for ${itemId} from ${source}`, error, {
    itemId,
    source,
  });
}

/**
 * Get all logged errors
 */
function getErrorLog(options?: {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  limit?: number;
}): ErrorLogEntry[] {
  let filtered = [...errorLog];
  
  if (options?.category) {
    filtered = filtered.filter(e => e.category === options.category);
  }
  
  if (options?.severity) {
    filtered = filtered.filter(e => e.severity === options.severity);
  }
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Clear error log
 */
function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Subscribe to new errors
 */
function subscribe(callback: (entry: ErrorLogEntry) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Get error statistics
 */
function getStats(): {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  last24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let last24h = 0;
  
  errorLog.forEach(entry => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
    
    if (new Date(entry.timestamp).getTime() > oneDayAgo) {
      last24h++;
    }
  });
  
  return {
    total: errorLog.length,
    byCategory: byCategory as Record<ErrorCategory, number>,
    bySeverity: bySeverity as Record<ErrorSeverity, number>,
    last24h,
  };
}

/**
 * Get session ID
 */
function getSessionId(): string {
  return sessionId;
}

export const errorReporter = {
  logError,
  logWarning,
  logInfo,
  logImageError,
  logApiTimeout,
  logPriceFetchError,
  getErrorLog,
  clearErrorLog,
  subscribe,
  getStats,
  getSessionId,
};

export default errorReporter;
