import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingData {
  lowestActive: number | null;
  medianSold: number | null;
  trend7d: number | null;
  trendDirection: 'up' | 'down' | 'stable';
  quickSellPrice: number | null;
  maxProfitPrice: number | null;
  priceConfidence: 'high' | 'medium' | 'low';
  salesCount: number;
  listingsCount: number;
}

export interface CardAnalysis {
  detected: boolean;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  estimatedCondition: string | null;
  category: string | null;
  confidence: number;
  ocrText: string[];
  pricing: PricingData | null;
  matchedMarketItem: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
  } | null;
}

export const useCardAnalysis = () => {
  const [analysis, setAnalysis] = useState<CardAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (imageSource: string | File) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      let payload: { imageUrl?: string; imageBase64?: string } = {};

      if (typeof imageSource === 'string') {
        // It's already a URL or base64
        if (imageSource.startsWith('data:')) {
          // Extract base64 from data URL
          payload.imageBase64 = imageSource.split(',')[1];
        } else {
          payload.imageUrl = imageSource;
        }
      } else {
        // It's a File, convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/xxx;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageSource);
        });
        payload.imageBase64 = base64;
      }

      const { data, error: functionError } = await supabase.functions.invoke('analyze-card', {
        body: payload
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data as CardAnalysis);

      if (data.detected && data.cardName) {
        toast.success(`Detected: ${data.cardName}`);
      } else {
        toast.info('Card detected but no exact match found. Enter details manually.');
      }

      return data as CardAnalysis;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze card image';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    error,
    analyzeImage,
    clearAnalysis,
  };
};
