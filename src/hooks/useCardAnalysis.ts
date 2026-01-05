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

// Three-tier detection status model
export type CardDetectionStatus = 
  | 'detected_confirmed'      // High confidence match (≥0.75) with index match
  | 'detected_needs_confirmation'  // Card detected but needs user confirmation
  | 'not_detected';           // No card-like object detected

export interface CardAnalysis {
  detected: boolean;
  detectionStatus: CardDetectionStatus;
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
  // Fields that need confirmation (confidence < 0.75)
  needsConfirmation: {
    cardName: boolean;
    setName: boolean;
    category: boolean;
    cardNumber: boolean;
  };
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

      // Determine detection status based on confidence and match
      // New logic: if we got any response back, we detected something (image was valid)
      const hasIndexMatch = !!data.matchedMarketItem;
      const highConfidence = data.confidence >= 0.75;
      const hasOcrText = data.ocrText && data.ocrText.length > 0;
      const hasCardName = !!data.cardName;
      
      // An image was uploaded and processed - check what we found
      // detected=true from backend means the image contained card-like content
      const cardWasDetected = data.detected === true;
      
      let detectionStatus: CardDetectionStatus;
      if (highConfidence && hasIndexMatch) {
        // High confidence with index match = confirmed
        detectionStatus = 'detected_confirmed';
      } else if (cardWasDetected || hasOcrText || hasCardName) {
        // Card detected but needs confirmation (low confidence OR no index match)
        detectionStatus = 'detected_needs_confirmation';
      } else {
        // No card-like content detected at all
        detectionStatus = 'not_detected';
      }

      // Determine which fields need confirmation (confidence < 0.5 for that field)
      const needsConfirmation = {
        cardName: !data.cardName || data.confidence < 0.5,
        setName: !data.setName || data.confidence < 0.6,
        category: !data.category || data.confidence < 0.5,
        cardNumber: !data.cardNumber || data.confidence < 0.5,
      };

      const enrichedAnalysis: CardAnalysis = {
        ...data,
        detectionStatus,
        needsConfirmation,
        // Card is detected if we got any card-like content
        detected: cardWasDetected || hasOcrText || hasCardName,
      };

      setAnalysis(enrichedAnalysis);

      // Show appropriate toast based on detection status
      if (detectionStatus === 'detected_confirmed') {
        toast.success(`Card identified: ${data.cardName}`);
      } else if (detectionStatus === 'detected_needs_confirmation') {
        toast.info('Card detected — please confirm the details');
      } else {
        toast.warning('No card detected. Please upload a clear card image.');
      }

      return enrichedAnalysis;

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
