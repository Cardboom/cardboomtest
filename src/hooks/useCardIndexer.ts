import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReviewedCardData } from '@/components/card-scan/CardReviewModal';
import { formatCardDisplayName } from '@/lib/cardNameUtils';

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
  currency?: 'USD' | 'EUR' | 'TRY';
  condition: string;
  description?: string;
  manualTitle?: string; // User's manual title override
  allowsVault?: boolean;
  allowsTrade?: boolean;
  allowsShipping?: boolean;
  isOpenToOffers?: boolean;
  certificationEnabled?: boolean;
  certificationTier?: 'standard' | 'express';
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
   * Build full SEO-friendly display name from card data
   */
  const buildDisplayName = useCallback((cardData: ReviewedCardData): string => {
    return formatCardDisplayName({
      name: cardData.cardNameEnglish || cardData.cardName,
      variant: null, // Extracted from rarity if special
      setCode: cardData.setCode,
      cardNumber: cardData.cardNumber,
      rarity: cardData.rarity,
    });
  }, []);

  /**
   * Trigger auto-fetch of external price for a market item
   */
  const fetchExternalPrice = useCallback(async (marketItemId: string, cardData: ReviewedCardData) => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-fetch-price', {
        body: {
          marketItemId,
          cardData: {
            name: cardData.cardNameEnglish || cardData.cardName,
            variant: null,
            setCode: cardData.setCode,
            cardNumber: cardData.cardNumber,
            rarity: cardData.rarity,
            category: cardData.category,
            setName: cardData.setName,
          },
        },
      });
      
      if (error) {
        console.warn('Auto-fetch price failed:', error);
        return null;
      }
      
      if (data?.success) {
        console.log(`Auto-fetched price: $${data.price} from ${data.source}`);
        return data;
      }
      
      return null;
    } catch (err) {
      console.warn('Auto-fetch price error:', err);
      return null;
    }
  }, []);

  /**
   * Upsert a canonical card record in market_items using cvi_key
   */
  const upsertMarketItem = useCallback(async ({ cardData, imageUrl, currentPrice }: UpsertMarketItemParams) => {
    try {
      // Build SEO-friendly full display name
      const displayName = buildDisplayName(cardData);
      
      // If we have a cvi_key, try to find existing record
      if (cardData.cviKey) {
        const { data: existing } = await supabase
          .from('market_items')
          .select('id, verified_price, data_source')
          .eq('cvi_key', cardData.cviKey)
          .single();

        if (existing) {
          // Update existing record
          const { data, error } = await supabase
            .from('market_items')
            .update({
              name: displayName,
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
          
          // Auto-fetch external price if not already verified
          if (!existing.verified_price && !existing.data_source?.includes('pricecharting')) {
            fetchExternalPrice(existing.id, cardData);
          }
          
          return data;
        }
      }

      // Create new record with full display name
      const { data, error } = await supabase
        .from('market_items')
        .insert({
          name: displayName,
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
          price_status: 'pending',
          data_source: 'cardboom',
          ...(imageUrl && { image_url: imageUrl }),
        })
        .select()
        .single();

      if (error) throw error;
      
      // Auto-fetch external price for new items (fire and forget)
      if (data?.id) {
        fetchExternalPrice(data.id, cardData);
      }
      
      return data;
    } catch (error) {
      console.error('Error upserting market item:', error);
      throw error;
    }
  }, [buildDisplayName, fetchExternalPrice]);

  /**
   * Create a listing linked to a market item
   */
  const createListing = useCallback(async ({
    userId,
    cardData,
    imageUrl,
    price,
    currency = 'USD',
    condition,
    description,
    allowsVault = true,
    allowsTrade = true,
    allowsShipping = true,
    isOpenToOffers = false,
    certificationEnabled = false,
    certificationTier = 'standard',
    manualTitle,
  }: CreateListingParams) => {
    try {
      // First, upsert the market item
      const marketItem = await upsertMarketItem({
        cardData,
        imageUrl,
        currentPrice: price,
      });

      // Build SEO-friendly full display name for listing title
      // Use manual title if provided, otherwise build from card data
      const displayName = manualTitle?.trim() || buildDisplayName(cardData);
      
      // Create the listing with currency
      const listingData: Record<string, unknown> = {
        seller_id: userId,
        title: displayName,
        description,
        category: cardData.category,
        condition,
        price: isOpenToOffers && !price ? 0 : price, // Allow 0 price for offers-only listings
        currency, // Store the listing currency
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
        is_open_to_offers: isOpenToOffers,
        status: 'active',
        certification_status: certificationEnabled ? 'pending' : 'none',
      };

      const { data: listing, error } = await supabase
        .from('listings')
        .insert(listingData as any)
        .select()
        .single();

      if (error) throw error;

      // If certification is enabled, create a grading order linked to this listing
      let gradingOrder = null;
      if (certificationEnabled && listing) {
        const tierPrices = { standard: 10, express: 15 };
        const gradingPrice = tierPrices[certificationTier] || 10;

        const { data: order, error: gradingError } = await supabase
          .from('grading_orders')
          .insert({
            user_id: userId,
            category: cardData.category,
            front_image_url: imageUrl,
            back_image_url: imageUrl, // Use same image if no back provided
            price_usd: gradingPrice,
            price_cents: gradingPrice * 100,
            status: 'queued',
            card_name: cardData.cardNameEnglish || cardData.cardName,
            set_name: cardData.setName,
            set_code: cardData.setCode,
            card_number: cardData.cardNumber,
            rarity: cardData.rarity,
            language: cardData.language,
            cvi_key: cardData.cviKey,
            market_item_id: marketItem.id,
            listing_created_id: listing.id,
            speed_tier: certificationTier,
          } as any)
          .select()
          .single();

        if (!gradingError && order) {
          gradingOrder = order;
          // Update listing with grading order reference
          await supabase
            .from('listings')
            .update({ grading_order_id: order.id })
            .eq('id', listing.id);
        }
      }

      // Send notification for listing creation
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            type: 'order_update',
            title: 'Listing Created! 🎉',
            body: `Your listing "${cardData.cardNameEnglish || cardData.cardName}" is now live on the marketplace.`,
            data: { listing_id: listing.id },
          },
        });
      } catch (notifError) {
        console.error('Failed to send listing notification:', notifError);
      }

      return { listing, marketItem, gradingOrder };
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
