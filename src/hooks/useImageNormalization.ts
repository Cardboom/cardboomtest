import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TableType = 'market_items' | 'catalog_cards' | 'listings' | 'card_instances' | 'vault_items' | 'swap_listings' | 'boom_pack_cards' | 'grading_orders';
type NormalizedImageType = 'SLAB' | 'RAW';

interface NormalizationResult {
  success: boolean;
  normalizedImageUrl?: string;
  imageType?: NormalizedImageType;
  confidence?: number;
  error?: string;
}

interface BackfillStats {
  [tableName: string]: {
    pending: number;
    done: number;
    failed: number;
    noImage: number;
  };
}

interface BackfillResult {
  success: boolean;
  dryRun: boolean;
  batchSize: number;
  results: Record<string, { processed: number; errors: number }>;
  statsBefore: BackfillStats;
  statsAfter: BackfillStats;
}

/**
 * Hook for managing image normalization
 */
export const useImageNormalization = () => {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillStats | null>(null);

  /**
   * Normalize a single image
   */
  const normalizeImage = useCallback(async (
    imageUrl: string,
    tableType: TableType,
    recordId: string,
    imageField?: 'front' | 'back'
  ): Promise<NormalizationResult> => {
    setIsNormalizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('normalize-card-image', {
        body: {
          imageUrl,
          tableType,
          recordId,
          imageField,
        },
      });

      if (error) {
        console.error('Normalization error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        normalizedImageUrl: data.normalizedImageUrl,
        imageType: data.imageType,
        confidence: data.confidence,
        error: data.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    } finally {
      setIsNormalizing(false);
    }
  }, []);

  /**
   * Get backfill statistics
   */
  const getBackfillStats = useCallback(async (): Promise<BackfillStats | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('backfill-normalized-images', {
        body: { tableType: 'stats' },
      });

      if (error) {
        console.error('Failed to get stats:', error);
        return null;
      }

      return data.stats || data.statsAfter;
    } catch (err) {
      console.error('Stats error:', err);
      return null;
    }
  }, []);

  /**
   * Run backfill job for pending images
   */
  const runBackfill = useCallback(async (
    tableType: TableType | 'all' = 'all',
    batchSize: number = 10,
    dryRun: boolean = false
  ): Promise<BackfillResult | null> => {
    setIsBackfilling(true);
    try {
      toast.info(dryRun ? 'Checking pending images...' : `Starting backfill (batch: ${batchSize})...`);

      const { data, error } = await supabase.functions.invoke('backfill-normalized-images', {
        body: { tableType, batchSize, dryRun },
      });

      if (error) {
        console.error('Backfill error:', error);
        toast.error('Backfill failed: ' + error.message);
        return null;
      }

      setBackfillProgress(data.statsAfter);

      if (dryRun) {
        toast.success(`Found ${Object.values(data.results).reduce((sum: number, r: any) => sum + r.processed, 0)} images to process`);
      } else {
        const totalProcessed = Object.values(data.results).reduce((sum: number, r: any) => sum + r.processed, 0);
        const totalErrors = Object.values(data.results).reduce((sum: number, r: any) => sum + r.errors, 0);
        toast.success(`Processed ${totalProcessed} images (${totalErrors} errors)`);
      }

      return data;
    } catch (err) {
      console.error('Backfill error:', err);
      toast.error('Backfill failed');
      return null;
    } finally {
      setIsBackfilling(false);
    }
  }, []);

  /**
   * Normalize an image on upload (before saving to DB)
   */
  const normalizeOnUpload = useCallback(async (
    imageUrl: string
  ): Promise<{ normalizedUrl: string; imageType: NormalizedImageType } | null> => {
    setIsNormalizing(true);
    try {
      // Use a temporary record ID for upload normalization
      const tempId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('normalize-card-image', {
        body: {
          imageUrl,
          tableType: 'market_items', // Doesn't matter for storage path
          recordId: tempId,
        },
      });

      if (error || !data.success) {
        console.error('Upload normalization failed:', error || data.error);
        // Return original on failure
        return { normalizedUrl: imageUrl, imageType: 'RAW' };
      }

      return {
        normalizedUrl: data.normalizedImageUrl,
        imageType: data.imageType,
      };
    } catch (err) {
      console.error('Upload normalization error:', err);
      return { normalizedUrl: imageUrl, imageType: 'RAW' };
    } finally {
      setIsNormalizing(false);
    }
  }, []);

  return {
    normalizeImage,
    normalizeOnUpload,
    getBackfillStats,
    runBackfill,
    isNormalizing,
    isBackfilling,
    backfillProgress,
  };
};