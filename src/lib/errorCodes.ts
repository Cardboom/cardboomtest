// Centralized Error Codes for CardBoom
// Standardized error handling with user-friendly messages

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_EXPIRED'
  | 'AUTH_REQUIRED'
  | 'INSUFFICIENT_BALANCE'
  | 'DUPLICATE_REQUEST'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'MAINTENANCE'
  | 'PAYMENT_FAILED'
  | 'GRADING_FAILED'
  | 'UPLOAD_FAILED'
  | 'LISTING_UNAVAILABLE'
  | 'WALLET_LOCKED'
  | 'UNKNOWN';

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
  recoverable: boolean;
}

const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string; recoverable: boolean }> = {
  NETWORK_ERROR: {
    message: 'Network request failed',
    userMessage: 'Connection issue. Please check your internet and try again.',
    recoverable: true,
  },
  AUTH_EXPIRED: {
    message: 'Authentication token expired',
    userMessage: 'Your session has expired. Please sign in again.',
    recoverable: true,
  },
  AUTH_REQUIRED: {
    message: 'Authentication required',
    userMessage: 'Please sign in to continue.',
    recoverable: true,
  },
  INSUFFICIENT_BALANCE: {
    message: 'Insufficient wallet balance',
    userMessage: 'Not enough funds in your wallet. Please add funds to continue.',
    recoverable: true,
  },
  DUPLICATE_REQUEST: {
    message: 'Duplicate request detected',
    userMessage: 'This action was already processed. No duplicate charge was made.',
    recoverable: false,
  },
  VALIDATION_FAILED: {
    message: 'Validation failed',
    userMessage: 'Please check your input and try again.',
    recoverable: true,
  },
  RATE_LIMITED: {
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment and try again.',
    recoverable: true,
  },
  NOT_FOUND: {
    message: 'Resource not found',
    userMessage: 'The requested item could not be found.',
    recoverable: false,
  },
  PERMISSION_DENIED: {
    message: 'Permission denied',
    userMessage: 'You don\'t have permission to perform this action.',
    recoverable: false,
  },
  SERVER_ERROR: {
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again later.',
    recoverable: true,
  },
  TIMEOUT: {
    message: 'Request timeout',
    userMessage: 'The request took too long. Please try again.',
    recoverable: true,
  },
  MAINTENANCE: {
    message: 'System under maintenance',
    userMessage: 'We\'re performing maintenance. Please try again shortly.',
    recoverable: true,
  },
  PAYMENT_FAILED: {
    message: 'Payment processing failed',
    userMessage: 'Payment could not be processed. Please try again or use a different payment method.',
    recoverable: true,
  },
  GRADING_FAILED: {
    message: 'Grading request failed',
    userMessage: 'Could not process grading request. Your wallet was not charged.',
    recoverable: true,
  },
  UPLOAD_FAILED: {
    message: 'File upload failed',
    userMessage: 'Upload failed. Please check file size/format and try again.',
    recoverable: true,
  },
  LISTING_UNAVAILABLE: {
    message: 'Listing no longer available',
    userMessage: 'This listing is no longer available or was already purchased.',
    recoverable: false,
  },
  WALLET_LOCKED: {
    message: 'Wallet temporarily locked',
    userMessage: 'Your wallet is temporarily locked. Please contact support.',
    recoverable: false,
  },
  UNKNOWN: {
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    recoverable: true,
  },
};

// Generate a correlation ID for tracing
export function generateCorrelationId(): string {
  return `cb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a standardized AppError
export function createAppError(
  code: ErrorCode,
  details?: Record<string, unknown>,
  correlationId?: string
): AppError {
  const errorDef = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
  return {
    code,
    message: errorDef.message,
    userMessage: errorDef.userMessage,
    details,
    correlationId: correlationId || generateCorrelationId(),
    timestamp: new Date().toISOString(),
    recoverable: errorDef.recoverable,
  };
}

// Parse unknown errors into AppError
export function parseError(error: unknown, correlationId?: string): AppError {
  const cid = correlationId || generateCorrelationId();

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to send')) {
      return createAppError('NETWORK_ERROR', { originalMessage: error.message }, cid);
    }

    // Auth errors
    if (message.includes('jwt') || message.includes('token') || message.includes('expired') || message.includes('unauthorized')) {
      return createAppError('AUTH_EXPIRED', { originalMessage: error.message }, cid);
    }

    // Balance errors
    if (message.includes('insufficient') || message.includes('balance')) {
      return createAppError('INSUFFICIENT_BALANCE', { originalMessage: error.message }, cid);
    }

    // Rate limit
    if (message.includes('rate') || message.includes('too many')) {
      return createAppError('RATE_LIMITED', { originalMessage: error.message }, cid);
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out')) {
      return createAppError('TIMEOUT', { originalMessage: error.message }, cid);
    }

    // Validation
    if (message.includes('validation') || message.includes('invalid')) {
      return createAppError('VALIDATION_FAILED', { originalMessage: error.message }, cid);
    }

    return createAppError('UNKNOWN', { originalMessage: error.message, stack: error.stack }, cid);
  }

  // Handle Supabase error objects
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    
    if (errObj.code === 'PGRST116' || errObj.code === '404') {
      return createAppError('NOT_FOUND', errObj, cid);
    }
    
    if (errObj.code === '401' || errObj.code === 'PGRST301') {
      return createAppError('AUTH_REQUIRED', errObj, cid);
    }
    
    if (errObj.code === '403') {
      return createAppError('PERMISSION_DENIED', errObj, cid);
    }
    
    if (errObj.code === '429') {
      return createAppError('RATE_LIMITED', errObj, cid);
    }

    return createAppError('UNKNOWN', errObj, cid);
  }

  return createAppError('UNKNOWN', { raw: String(error) }, cid);
}

// Log error with context
export function logAppError(error: AppError, context?: Record<string, unknown>): void {
  const logEntry = {
    ...error,
    context,
    sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('cb_session_id') : null,
  };

  // In production, this would send to a logging service
  console.error(`[CardBoom Error] ${error.code}:`, logEntry);
}
