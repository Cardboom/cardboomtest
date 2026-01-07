import { useCallback, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseError, logAppError } from '@/lib/errorCodes';

interface OptimisticUpdateOptions<T> {
  queryKey: QueryKey;
  mutationFn: () => Promise<T>;
  optimisticData?: unknown;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateOnSuccess?: boolean;
}

export function useOptimisticUpdate<T>() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async <R>({
    queryKey,
    mutationFn,
    optimisticData,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    invalidateOnSuccess = true,
  }: OptimisticUpdateOptions<R>): Promise<R | null> => {
    setIsLoading(true);
    
    // Get previous data for rollback
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically update the cache
    if (optimisticData !== undefined) {
      queryClient.setQueryData(queryKey, optimisticData);
    }
    
    try {
      const result = await mutationFn();
      
      // Invalidate to get fresh data
      if (invalidateOnSuccess) {
        await queryClient.invalidateQueries({ queryKey });
      }
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      // Rollback on error
      if (previousData !== undefined) {
        queryClient.setQueryData(queryKey, previousData);
      }
      
      const appError = parseError(error);
      logAppError(appError, { queryKey: JSON.stringify(queryKey) });
      
      toast.error(errorMessage || appError.userMessage);
      onError?.(error);
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  return { execute, isLoading };
}

// Hook for invalidating queries with a "last refreshed" timestamp
export function useQueryRefresh() {
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (queryKeys: QueryKey[]) => {
    setIsRefreshing(true);
    try {
      await Promise.all(
        queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
      );
      setLastRefreshed(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, lastRefreshed, isRefreshing };
}
