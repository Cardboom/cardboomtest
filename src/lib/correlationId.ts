// Correlation ID management for request tracing
// Enables end-to-end tracing from client to edge functions

const CORRELATION_HEADER = 'x-correlation-id';
const SESSION_KEY = 'cb_session_id';
const REQUEST_COUNTER_KEY = 'cb_request_counter';

// Get or create session ID (persists across page loads)
export function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Fallback for private browsing mode
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Generate request-specific correlation ID
export function generateRequestCorrelationId(): string {
  const sessionId = getSessionId();
  try {
    let counter = parseInt(sessionStorage.getItem(REQUEST_COUNTER_KEY) || '0', 10);
    counter++;
    sessionStorage.setItem(REQUEST_COUNTER_KEY, counter.toString());
    return `${sessionId}_req${counter}_${Date.now().toString(36)}`;
  } catch {
    // Fallback for private browsing mode
    return `${sessionId}_req${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Create headers with correlation ID
export function getCorrelationHeaders(existingHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...existingHeaders,
    [CORRELATION_HEADER]: generateRequestCorrelationId(),
  };
}

// Log action with correlation context
export function logAction(
  action: string,
  correlationId: string,
  data: Record<string, unknown>
): void {
  const logEntry = {
    event_type: action,
    correlation_id: correlationId,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  // In production, send to analytics/logging service
  // Silent in production - logging handled server-side
  if (import.meta.env.DEV) {
    console.log(`[CardBoom Action] ${action}:`, logEntry);
  }
}

// Critical action logger for important operations
export function logCriticalAction(
  action: 'top_up' | 'purchase' | 'withdraw' | 'grading_purchase' | 'listing_create' | 'listing_cancel',
  correlationId: string,
  userId: string,
  result: 'started' | 'success' | 'failed',
  details: Record<string, unknown>
): void {
  const logEntry = {
    event_type: action,
    user_id: userId,
    correlation_id: correlationId,
    request_id: generateRequestCorrelationId(),
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    result,
    ...details,
  };
  
  // Always log critical actions in dev, only failures in prod
  if (result === 'failed') {
    console.error(`[CardBoom CRITICAL] ${action} FAILED:`, logEntry);
  } else if (import.meta.env.DEV) {
    console.log(`[CardBoom CRITICAL] ${action} ${result}:`, logEntry);
  }
}
