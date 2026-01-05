import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReviewedCardData } from '@/components/card-scan/CardReviewModal';

interface UpsertMarketItemParams {
  cardData: ReviewedCardData;
  imageUrl?: string | null;
  currentPrice?: number;
}

interface CreateListingParams {
  userId: string;
  cardData: ReviewedCardData;
  imageUrl: string | null;
  price: number;
  condition: string;
  description?: string;
  allowsVault?: boolean;
  allowsTrade?: boolean;
  allowsShipping?: boolean;
}

interface CreateGradingOrderParams {
  userId: string;
  cardData: ReviewedCardData;
  frontImageUrl: string;
  backImageUrl: string;
  priceUsd?: number;
}

export function useCardIndexer() {
  /**
   * Upsert a canonical card record in market_items using cvi_key
   */
  const upsertMarketItem = useCallback(async ({ cardData, imageUrl, currentPrice }: UpsertMarketItemParams) => {
    try {
      // If we have a cvi_key, try to find existing record
      if (cardData.cviKey) {
        const { data: existing } = await supabase
          .from('market_items')
          .select('id')
          .eq('cvi_key', cardData.cviKey)
          .single();

        if (existing) {
          // Update existing record
          const { data, error } = await supabase
            .from('market_items')
            .update({
              name: cardData.cardNameEnglish || cardData.cardName,
              set_name: cardData.setName,
              set_code: cardData.setCode,
              card_number: cardData.cardNumber,
              rarity: cardData.rarity,
              language: cardData.language,
              ai_confidence: cardData.confidence,
              ai_indexed_at: new Date().toISOString(),
              ...(imageUrl && { image_url: imageUrl }),
              ...(currentPrice && { current_price: currentPrice }),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      }

      // Create new record
      const { data, error } = await supabase
        .from('market_items')
        .insert({
          name: cardData.cardNameEnglish || cardData.cardName,
          category: cardData.category,
          set_name: cardData.setName,
          set_code: cardData.setCode,
          card_number: cardData.cardNumber,
          rarity: cardData.rarity,
          language: cardData.language,
          cvi_key: cardData.cviKey,
          ai_confidence: cardData.confidence,
          ai_indexed_at: new Date().toISOString(),
          current_price: currentPrice || 0,
          base_price: currentPrice || 0,
          ...(imageUrl && { image_url: imageUrl }),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error upserting market item:', error);
      throw error;
    }
  }, []);

  /**
   * Create a listing linked to a market item
   */
  const createListing = useCallback(async ({
    userId,
    cardData,
    imageUrl,
    price,
    condition,
    description,
    allowsVault = true,
    allowsTrade = true,
    allowsShipping = true,
  }: CreateListingParams) => {
    try {
      // First, upsert the market item
      const marketItem = await upsertMarketItem({
        cardData,
        imageUrl,
        currentPrice: price,
      });

      // Create the listing
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          seller_id: userId,
          title: cardData.cardNameEnglish || cardData.cardName,
          description,
          category: cardData.category,
          condition,
          price,
          image_url: imageUrl,
          market_item_id: marketItem.id,
          set_name: cardData.setName,
          set_code: cardData.setCode,
          card_number: cardData.cardNumber,
          rarity: cardData.rarity,
          language: cardData.language,
          cvi_key: cardData.cviKey,
          ai_confidence: cardData.confidence,
          allows_vault: allowsVault,
          allows_trade: allowsTrade,
          allows_shipping: allowsShipping,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return { listing, marketItem };
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }, [upsertMarketItem]);

  /**
   * Create a grading order with card metadata
   */
  const createGradingOrder = useCallback(async ({
    userId,
    cardData,
    frontImageUrl,
    backImageUrl,
    priceUsd = 20,
  }: CreateGradingOrderParams) => {
    try {
      // Upsert market item if we have enough data
      let marketItemId: string | null = null;
      if (cardData.cviKey || (cardData.cardName && cardData.category)) {
        const marketItem = await upsertMarketItem({ cardData });
        marketItemId = marketItem.id;
      }

      // Create grading order with card metadata
      const idempotencyKey = `grading_${userId}_${Date.now()}`;
      
      const orderData: Record<string, unknown> = {
        user_id: userId,
        category: cardData.category,
        front_image_url: frontImageUrl,
        back_image_url: backImageUrl,
        price_usd: priceUsd,
        price_cents: priceUsd * 100,
        idempotency_key: idempotencyKey,
        status: 'draft',
        card_name: cardData.cardNameEnglish || cardData.cardName,
        set_name: cardData.setName,
        set_code: cardData.setCode,
        card_number: cardData.cardNumber,
        rarity: cardData.rarity,
        language: cardData.language,
        cvi_key: cardData.cviKey,
        ai_confidence: cardData.confidence,
      };

      if (marketItemId) {
        orderData.market_item_id = marketItemId;
      }

      const { data: order, error } = await supabase
        .from('grading_orders')
        .insert(orderData as any)
        .select()
        .single();

      if (error) throw error;

      return order;
    } catch (error) {
      console.error('Error creating grading order:', error);
      throw error;
    }
  }, [upsertMarketItem]);

  /**
   * Update an existing listing with reviewed card data
   */
  const updateListingWithCardData = useCallback(async (listingId: string, cardData: ReviewedCardData) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .update({
          title: cardData.cardNameEnglish || cardData.cardName,
          set_name: cardData.setName,
          set_code: cardData.setCode,
          card_number: cardData.cardNumber,
          rarity: cardData.rarity,
          language: cardData.language,
          cvi_key: cardData.cviKey,
          ai_confidence: cardData.confidence,
        })
        .eq('id', listingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
  }, []);

  /**
   * Update an existing grading order with reviewed card data
   */
  const updateGradingOrderWithCardData = useCallback(async (orderId: string, cardData: ReviewedCardData) => {
    try {
      const { data, error } = await supabase
        .from('grading_orders')
        .update({
          card_name: cardData.cardNameEnglish || cardData.cardName,
          set_name: cardData.setName,
          set_code: cardData.setCode,
          card_number: cardData.cardNumber,
          rarity: cardData.rarity,
          language: cardData.language,
          cvi_key: cardData.cviKey,
          ai_confidence: cardData.confidence,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating grading order:', error);
      throw error;
    }
  }, []);

  return {
    upsertMarketItem,
    createListing,
    createGradingOrder,
    updateListingWithCardData,
    updateGradingOrderWithCardData,
  };
}
