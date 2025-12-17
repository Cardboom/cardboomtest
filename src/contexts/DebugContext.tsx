/**
 * Debug Context
 * 
 * Admin-only debug mode that shows:
 * - Data source used
 * - Last updated timestamp
 * - Cache status (hit/miss)
 * - Request duration
 * - Error messages
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { errorReporter, ErrorLogEntry } from '@/services/errorReporter';
import { pricingService } from '@/services/pricingService';

export interface DebugInfo {
  source: string;
  lastUpdated: string | null;
  cacheStatus: 'fresh' | 'stale' | 'miss' | 'unknown';
  requestDuration?: number;
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface DebugContextType {
  isDebugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  canAccessDebug: boolean;
  getDebugInfo: (itemId: string) => DebugInfo | null;
  setDebugInfo: (itemId: string, info: DebugInfo) => void;
  errorLog: ErrorLogEntry[];
  cacheStats: {
    marketItemsCached: number;
    pricesCached: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  };
  refreshCacheStats: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAdminRole();
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugInfoMap, setDebugInfoMap] = useState<Map<string, DebugInfo>>(new Map());
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
  const [cacheStats, setCacheStats] = useState({
    marketItemsCached: 0,
    pricesCached: 0,
    oldestEntry: null as number | null,
    newestEntry: null as number | null,
  });

  // Load debug mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cardboom_debug_mode');
    if (saved === 'true' && isAdmin) {
      setIsDebugMode(true);
    }
  }, [isAdmin]);

  // Subscribe to error log updates
  useEffect(() => {
    if (!isDebugMode) return;

    const unsubscribe = errorReporter.subscribe((entry) => {
      setErrorLog((prev) => [entry, ...prev.slice(0, 99)]);
    });

    // Load initial error log
    setErrorLog(errorReporter.getErrorLog({ limit: 100 }));

    return unsubscribe;
  }, [isDebugMode]);

  // Refresh cache stats periodically
  const refreshCacheStats = useCallback(() => {
    const stats = pricingService.getCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    if (!isDebugMode) return;

    refreshCacheStats();
    const interval = setInterval(refreshCacheStats, 5000);
    return () => clearInterval(interval);
  }, [isDebugMode, refreshCacheStats]);

  const setDebugMode = useCallback((enabled: boolean) => {
    if (enabled && !isAdmin) return; // Only admins can enable
    
    setIsDebugMode(enabled);
    localStorage.setItem('cardboom_debug_mode', enabled ? 'true' : 'false');
    
    if (enabled) {
      setErrorLog(errorReporter.getErrorLog({ limit: 100 }));
      refreshCacheStats();
    }
  }, [isAdmin, refreshCacheStats]);

  const getDebugInfo = useCallback((itemId: string): DebugInfo | null => {
    if (!isDebugMode) return null;
    return debugInfoMap.get(itemId) || null;
  }, [isDebugMode, debugInfoMap]);

  const setDebugInfo = useCallback((itemId: string, info: DebugInfo) => {
    if (!isDebugMode) return;
    setDebugInfoMap((prev) => {
      const next = new Map(prev);
      next.set(itemId, info);
      return next;
    });
  }, [isDebugMode]);

  const value = {
    isDebugMode,
    setDebugMode,
    canAccessDebug: isAdmin,
    getDebugInfo,
    setDebugInfo,
    errorLog,
    cacheStats,
    refreshCacheStats,
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};

/**
 * Debug Overlay Component
 * Shows debug info when hovering over an element
 */
export const DebugOverlay: React.FC<{
  itemId: string;
  children: React.ReactNode;
  className?: string;
}> = ({ itemId, children, className }) => {
  const { isDebugMode, getDebugInfo } = useDebug();
  const [showOverlay, setShowOverlay] = useState(false);
  
  const debugInfo = getDebugInfo(itemId);

  if (!isDebugMode) {
    return <>{children}</>;
  }

  return (
    <div
      className={className}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      style={{ position: 'relative' }}
    >
      {children}
      
      {showOverlay && debugInfo && (
        <div className="absolute top-0 right-0 z-50 p-2 text-xs bg-black/90 text-white rounded shadow-lg max-w-[200px]">
          <div className="font-bold mb-1 text-primary">Debug Info</div>
          <div><span className="text-muted-foreground">Source:</span> {debugInfo.source}</div>
          <div>
            <span className="text-muted-foreground">Cache:</span>{' '}
            <span className={
              debugInfo.cacheStatus === 'fresh' ? 'text-green-400' :
              debugInfo.cacheStatus === 'stale' ? 'text-yellow-400' :
              'text-red-400'
            }>
              {debugInfo.cacheStatus}
            </span>
          </div>
          {debugInfo.lastUpdated && (
            <div>
              <span className="text-muted-foreground">Updated:</span>{' '}
              {new Date(debugInfo.lastUpdated).toLocaleTimeString()}
            </div>
          )}
          {debugInfo.requestDuration && (
            <div><span className="text-muted-foreground">Duration:</span> {debugInfo.requestDuration}ms</div>
          )}
          {debugInfo.confidence && (
            <div>
              <span className="text-muted-foreground">Confidence:</span>{' '}
              <span className={
                debugInfo.confidence === 'high' ? 'text-green-400' :
                debugInfo.confidence === 'medium' ? 'text-yellow-400' :
                'text-red-400'
              }>
                {debugInfo.confidence}
              </span>
            </div>
          )}
          {debugInfo.error && (
            <div className="text-red-400 mt-1 break-words">{debugInfo.error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugContext;
