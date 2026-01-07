// Idempotency key management for critical operations
// Prevents duplicate charges and duplicate operations on retry

const IDEMPOTENCY_STORAGE_KEY = 'cb_idempotency_keys';
const KEY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyEntry {
  key: string;
  action: string;
  createdAt: number;
  result?: 'pending' | 'success' | 'failed';
  response?: unknown;
}

// Generate a unique idempotency key for an action
export function generateIdempotencyKey(action: string, userId: string, ...params: string[]): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const paramHash = params.join('-');
  return `${action}_${userId}_${paramHash}_${timestamp}_${random}`;
}

// Get all stored idempotency entries
function getStoredEntries(): IdempotencyEntry[] {
  try {
    const stored = localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (!stored) return [];
    const entries: IdempotencyEntry[] = JSON.parse(stored);
    // Filter out expired entries
    const now = Date.now();
    return entries.filter(e => now - e.createdAt < KEY_EXPIRY_MS);
  } catch {
    return [];
  }
}

// Save entries to storage
function saveEntries(entries: IdempotencyEntry[]): void {
  try {
    localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable
    console.warn('Failed to save idempotency entries');
  }
}

// Create and store a new idempotency key
export function createIdempotencyKey(action: string, userId: string, ...params: string[]): string {
  const key = generateIdempotencyKey(action, userId, ...params);
  const entries = getStoredEntries();
  
  entries.push({
    key,
    action,
    createdAt: Date.now(),
    result: 'pending',
  });
  
  saveEntries(entries);
  return key;
}

// Check if an idempotency key was already used successfully
export function checkIdempotencyKey(key: string): { used: boolean; response?: unknown } {
  const entries = getStoredEntries();
  const entry = entries.find(e => e.key === key);
  
  if (!entry) {
    return { used: false };
  }
  
  if (entry.result === 'success') {
    return { used: true, response: entry.response };
  }
  
  // Key exists but wasn't successful - allow retry
  return { used: false };
}

// Mark an idempotency key as successfully used
export function markIdempotencySuccess(key: string, response?: unknown): void {
  const entries = getStoredEntries();
  const entryIndex = entries.findIndex(e => e.key === key);
  
  if (entryIndex >= 0) {
    entries[entryIndex].result = 'success';
    entries[entryIndex].response = response;
    saveEntries(entries);
  }
}

// Mark an idempotency key as failed (allows retry)
export function markIdempotencyFailed(key: string): void {
  const entries = getStoredEntries();
  const entryIndex = entries.findIndex(e => e.key === key);
  
  if (entryIndex >= 0) {
    entries[entryIndex].result = 'failed';
    saveEntries(entries);
  }
}

// Clear old idempotency keys
export function cleanupIdempotencyKeys(): void {
  const entries = getStoredEntries(); // This already filters expired
  saveEntries(entries);
}

// Get or create idempotency key for a specific action
// Useful for retry scenarios where we want to reuse the same key
export function getOrCreateIdempotencyKey(
  action: string, 
  userId: string, 
  referenceId: string
): string {
  const entries = getStoredEntries();
  
  // Look for existing pending key for this action + reference
  const existing = entries.find(
    e => e.action === action && 
         e.key.includes(userId) && 
         e.key.includes(referenceId) &&
         e.result === 'pending'
  );
  
  if (existing) {
    return existing.key;
  }
  
  return createIdempotencyKey(action, userId, referenceId);
}

// Idempotent action wrapper
export async function withIdempotency<T>(
  key: string,
  action: () => Promise<T>
): Promise<{ result: T; wasIdempotent: boolean }> {
  // Check if already successfully processed
  const check = checkIdempotencyKey(key);
  if (check.used) {
    return { result: check.response as T, wasIdempotent: true };
  }
  
  try {
    const result = await action();
    markIdempotencySuccess(key, result);
    return { result, wasIdempotent: false };
  } catch (error) {
    markIdempotencyFailed(key);
    throw error;
  }
}
