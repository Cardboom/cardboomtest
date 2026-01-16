import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCardboomPoints } from './useCardboomPoints';
import { toast } from 'sonner';

export interface BoomPackType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_gems: number;
  cards_count: number;
  category: string;
  rarity_distribution: Record<string, number>;
  is_active: boolean;
  is_featured: boolean;
  stock_limit: number | null;
  stock_sold: number;
  available_from: string | null;
  available_until: string | null;
}

export interface BoomPack {
  id: string;
  user_id: string;
  pack_type_id: string;
  status: 'sealed' | 'opening' | 'opened';
  purchased_at: string;
  opened_at: string | null;
  gems_spent: number;
  bonus_gems_awarded: number;
  pack_type?: BoomPackType;
}

export interface BoomPackCard {
  id: string;
  boom_pack_id: string;
  user_id: string;
  card_name: string;
  card_image_url: string | null;
  rarity: string;
  utility_value_gems: number;
  origin_tag: string;
  cooldown_until: string;
  can_list_after: string;
  is_shipped: boolean;
  is_in_vault: boolean;
}

const COOLDOWN_DAYS = 7;

export const useBoomPacks = (userId?: string) => {
  const [packTypes, setPackTypes] = useState<BoomPackType[]>([]);
  const [userPacks, setUserPacks] = useState<BoomPack[]>([]);
  const [userCards, setUserCards] = useState<BoomPackCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [opening, setOpening] = useState(false);
  const { balance, refetch: refetchGems } = useCardboomPoints(userId);

  const fetchPackTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('boom_pack_types')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('price_gems', { ascending: true });

      if (error) throw error;
      setPackTypes((data || []) as BoomPackType[]);
    } catch (error) {
      console.error('Error fetching pack types:', error);
    }
  }, []);

  const fetchUserPacks = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('boom_packs')
        .select('*, pack_type:boom_pack_types(*)')
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      
      const formattedPacks = (data || []).map((pack: any) => ({
        ...pack,
        pack_type: pack.pack_type as BoomPackType
      }));
      
      setUserPacks(formattedPacks as BoomPack[]);
    } catch (error) {
      console.error('Error fetching user packs:', error);
    }
  }, [userId]);

  const fetchUserCards = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('boom_pack_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserCards((data || []) as BoomPackCard[]);
    } catch (error) {
      console.error('Error fetching user cards:', error);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPackTypes(),
        fetchUserPacks(),
        fetchUserCards()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchPackTypes, fetchUserPacks, fetchUserCards]);

  const purchasePack = async (packTypeId: string): Promise<BoomPack | null> => {
    if (!userId) {
      toast.error('Please sign in to purchase packs');
      return null;
    }

    const packType = packTypes.find(p => p.id === packTypeId);
    if (!packType) {
      toast.error('Pack type not found');
      return null;
    }

    if (balance < packType.price_gems) {
      toast.error('Insufficient Gems. Please top up your balance.');
      return null;
    }

    setPurchasing(true);
    try {
      // Deduct gems from user balance
      const { error: gemsError } = await supabase
        .from('cardboom_points')
        .update({ 
          balance: balance - packType.price_gems,
          total_spent: supabase.rpc ? packType.price_gems : packType.price_gems
        })
        .eq('user_id', userId);

      if (gemsError) throw gemsError;

      // Record gems history
      await supabase
        .from('cardboom_points_history')
        .insert({
          user_id: userId,
          amount: packType.price_gems,
          transaction_type: 'spend',
          source: 'boom_pack_purchase',
          description: `Purchased ${packType.name}`
        });

      // Create the pack
      const { data: newPack, error: packError } = await supabase
        .from('boom_packs')
        .insert({
          user_id: userId,
          pack_type_id: packTypeId,
          status: 'sealed',
          gems_spent: packType.price_gems
        })
        .select('*, pack_type:boom_pack_types(*)')
        .single();

      if (packError) throw packError;

      // Audit log
      await supabase
        .from('boom_pack_audit_log')
        .insert({
          user_id: userId,
          event_type: 'pack_purchase',
          pack_id: newPack.id,
          pack_type_id: packTypeId,
          gems_amount: packType.price_gems,
          details: { pack_name: packType.name }
        });

      // Update stock
      await supabase
        .from('boom_pack_types')
        .update({ stock_sold: packType.stock_sold + 1 })
        .eq('id', packTypeId);

      toast.success(`${packType.name} purchased!`);
      refetchGems();
      fetchUserPacks();

      return {
        ...newPack,
        pack_type: newPack.pack_type as BoomPackType
      } as BoomPack;
    } catch (error) {
      console.error('Error purchasing pack:', error);
      toast.error('Failed to purchase pack');
      return null;
    } finally {
      setPurchasing(false);
    }
  };

  const openPack = async (packId: string): Promise<BoomPackCard[] | null> => {
    if (!userId) return null;

    const pack = userPacks.find(p => p.id === packId);
    if (!pack || pack.status !== 'sealed') {
      toast.error('Pack cannot be opened');
      return null;
    }

    setOpening(true);
    try {
      // Mark pack as opening
      await supabase
        .from('boom_packs')
        .update({ status: 'opening' })
        .eq('id', packId);

      // Get available cards from inventory pool
      const packType = pack.pack_type;
      if (!packType) throw new Error('Pack type not found');

      const { data: availableCards, error: poolError } = await supabase
        .from('boom_pack_inventory_pool')
        .select('*')
        .eq('is_available', true)
        .eq('category', packType.category)
        .limit(50);

      if (poolError) throw poolError;

      // Simulate card allocation based on rarity distribution
      const allocatedCards: BoomPackCard[] = [];
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + COOLDOWN_DAYS);

      const rarities = ['common', 'uncommon', 'rare', 'ultra_rare'];
      const distribution = packType.rarity_distribution as Record<string, number>;

      for (let i = 0; i < packType.cards_count; i++) {
        // Determine rarity based on distribution
        const roll = Math.random() * 100;
        let cumulative = 0;
        let selectedRarity = 'common';
        
        for (const rarity of rarities) {
          cumulative += distribution[rarity] || 0;
          if (roll < cumulative) {
            selectedRarity = rarity;
            break;
          }
        }

        // Find a card from pool or generate placeholder
        const poolCard = availableCards?.find(c => c.rarity === selectedRarity && c.is_available);
        
        const cardData = {
          boom_pack_id: packId,
          user_id: userId,
          card_name: poolCard?.card_name || `${packType.category.charAt(0).toUpperCase() + packType.category.slice(1)} Card #${Math.floor(Math.random() * 1000)}`,
          card_image_url: poolCard?.card_image_url || null,
          rarity: selectedRarity,
          utility_value_gems: poolCard?.utility_value_gems || getDefaultUtilityValue(selectedRarity),
          origin_tag: 'boom_pack',
          cooldown_until: cooldownDate.toISOString(),
          can_list_after: cooldownDate.toISOString()
        };

        const { data: insertedCard, error: cardError } = await supabase
          .from('boom_pack_cards')
          .insert(cardData)
          .select()
          .single();

        if (cardError) throw cardError;
        allocatedCards.push(insertedCard as BoomPackCard);

        // Mark pool card as allocated
        if (poolCard) {
          await supabase
            .from('boom_pack_inventory_pool')
            .update({ 
              is_available: false, 
              allocated_to_pack_id: packId,
              allocated_at: new Date().toISOString()
            })
            .eq('id', poolCard.id);
        }

        // Audit log for card allocation
        await supabase
          .from('boom_pack_audit_log')
          .insert({
            user_id: userId,
            event_type: 'card_allocation',
            pack_id: packId,
            details: { 
              card_name: cardData.card_name, 
              rarity: selectedRarity,
              utility_value: cardData.utility_value_gems
            }
          });
      }

      // Calculate total utility and apply guaranteed value bonus
      const totalUtility = allocatedCards.reduce((sum, card) => sum + card.utility_value_gems, 0);
      let bonusGems = 0;

      if (totalUtility < pack.gems_spent) {
        bonusGems = pack.gems_spent - totalUtility;
        
        // Credit bonus gems
        const { data: currentPoints } = await supabase
          .from('cardboom_points')
          .select('balance, total_earned')
          .eq('user_id', userId)
          .single();

        if (currentPoints) {
          await supabase
            .from('cardboom_points')
            .update({ 
              balance: currentPoints.balance + bonusGems,
              total_earned: currentPoints.total_earned + bonusGems
            })
            .eq('user_id', userId);

          await supabase
            .from('cardboom_points_history')
            .insert({
              user_id: userId,
              amount: bonusGems,
              transaction_type: 'earn',
              source: 'guaranteed_value_bonus',
              reference_id: packId,
              description: `Guaranteed Value Bonus from ${packType.name}`
            });

          // Audit log for bonus
          await supabase
            .from('boom_pack_audit_log')
            .insert({
              user_id: userId,
              event_type: 'guaranteed_value_bonus',
              pack_id: packId,
              gems_amount: bonusGems,
              details: { 
                pack_cost: pack.gems_spent,
                total_utility: totalUtility,
                bonus_awarded: bonusGems
              }
            });
        }
      }

      // Mark pack as opened
      await supabase
        .from('boom_packs')
        .update({ 
          status: 'opened', 
          opened_at: new Date().toISOString(),
          bonus_gems_awarded: bonusGems
        })
        .eq('id', packId);

      // Audit log for pack open
      await supabase
        .from('boom_pack_audit_log')
        .insert({
          user_id: userId,
          event_type: 'pack_open',
          pack_id: packId,
          pack_type_id: packType.id,
          details: { 
            cards_count: allocatedCards.length,
            total_utility: totalUtility,
            bonus_gems: bonusGems
          }
        });

      refetchGems();
      fetchUserPacks();
      fetchUserCards();

      return allocatedCards;
    } catch (error) {
      console.error('Error opening pack:', error);
      toast.error('Failed to open pack');
      return null;
    } finally {
      setOpening(false);
    }
  };

  const getDefaultUtilityValue = (rarity: string): number => {
    switch (rarity) {
      case 'ultra_rare': return 500;
      case 'rare': return 200;
      case 'uncommon': return 100;
      case 'common':
      default: return 50;
    }
  };

  const sealedPacks = userPacks.filter(p => p.status === 'sealed');
  const openedPacks = userPacks.filter(p => p.status === 'opened');

  return {
    packTypes,
    userPacks,
    sealedPacks,
    openedPacks,
    userCards,
    balance,
    loading,
    purchasing,
    opening,
    purchasePack,
    openPack,
    refetch: () => {
      fetchPackTypes();
      fetchUserPacks();
      fetchUserCards();
      refetchGems();
    }
  };
};
