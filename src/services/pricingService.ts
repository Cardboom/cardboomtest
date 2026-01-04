/**
 * Unified Pricing Service - Single Source of Truth
 * 
 * Implements stale-while-revalidate caching strategy with:
 * - Client-side cache with TTL
 * - Background refresh
 * - Fallback logic for failed fetches
 * - Price validation and safeguards
 * - Centralized error reporting
 */

import { supabase } from '@/integrations/supabase/client';
import { errorReporter } from './errorReporter';

export interface PriceData {
  price: number;
  change24h: number;
  change7d?: number;
  change30d?: number;
  source: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  lastKnownGood?: number;
  cacheStatus: 'fresh' | 'stale' | 'miss';
  requestDuration?: number;
}

export interface MarketItemPrice {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  liquidity: 'high' | 'medium' | 'low' | null;
  source: string;
  updatedAt: string;
  confidence: 'high' | 'medium' | 'low';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Cache configuration
const CACHE_TTL = {
  FRESH: 5 * 60 * 1000,      // 5 minutes - data is fresh
  STALE: 30 * 60 * 1000,     // 30 minutes - data is stale but usable
  MAX: 24 * 60 * 60 * 1000,  // 24 hours - max cache lifetime
};

// In-memory cache
const priceCache = new Map<string, CacheEntry<PriceData>>();
const marketItemCache = new Map<string, CacheEntry<MarketItemPrice>>();
const allItemsCache: CacheEntry<MarketItemPrice[]> | null = null;

// Subscribers for real-time updates
const subscribers = new Set<(prices: Map<string, PriceData>) => void>();

/**
 * Validate price data before saving/using
 */
function validatePrice(price: number | null | undefined, currentPrice?: number): number | null {
  if (price === null || price === undefined) return null;
  if (typeof price !== 'number') return null;
  if (isNaN(price)) return null;
  if (price <= 0) return null;
  if (price === Infinity || price === -Infinity) return null;
  
  // Sanity check: price shouldn't change by more than 90% in a single update
  if (currentPrice && currentPrice > 0) {
    const changeRatio = Math.abs((price - currentPrice) / currentPrice);
    if (changeRatio > 0.9) {
      errorReporter.logWarning('pricing', `Suspicious price change detected: ${currentPrice} -> ${price}`);
      return null; // Reject suspicious price
    }
  }
  
  return price;
}

/**
 * Validate and normalize market item from database
 */
function normalizeMarketItem(item: any): MarketItemPrice {
  return {
    id: item.id,
    name: item.name || 'Unknown',
    category: item.category || 'unknown',
    currentPrice: validatePrice(item.current_price) || 0,
    change24h: validatePrice(item.change_24h) || null,
    change7d: validatePrice(item.change_7d) || null,
    change30d: validatePrice(item.change_30d) || null,
    liquidity: item.liquidity || null,
    source: item.data_source || 'database',
    updatedAt: item.updated_at || new Date().toISOString(),
    confidence: calculateConfidence(item),
  };
}

/**
 * Calculate confidence level based on data quality
 */
function calculateConfidence(item: any): 'high' | 'medium' | 'low' {
  let score = 0;
  
  // Has valid price
  if (item.current_price && item.current_price > 0) score += 2;
  
  // Has recent sales
  if (item.sales_count_30d && item.sales_count_30d >= 5) score += 2;
  else if (item.sales_count_30d && item.sales_count_30d >= 1) score += 1;
  
  // Has external data source
  if (item.data_source && item.data_source !== 'internal') score += 1;
  
  // Recently updated (within 24h)
  if (item.updated_at) {
    const age = Date.now() - new Date(item.updated_at).getTime();
    if (age < 24 * 60 * 60 * 1000) score += 1;
  }
  
  // Has liquidity data
  if (item.liquidity && item.liquidity !== 'low') score += 1;
  
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * Get cache status for an item
 */
function getCacheStatus(entry: CacheEntry<any> | undefined): 'fresh' | 'stale' | 'miss' {
  if (!entry) return 'miss';
  
  const age = Date.now() - entry.timestamp;
  if (age <= CACHE_TTL.FRESH) return 'fresh';
  if (age <= CACHE_TTL.STALE) return 'stale';
  return 'miss';
}

/**
 * Get a single market item's price with caching
 */
export async function getMarketItemPrice(
  itemId: string,
  options: { forceRefresh?: boolean } = {}
): Promise<MarketItemPrice | null> {
  const startTime = Date.now();
  const cached = marketItemCache.get(itemId);
  const cacheStatus = getCacheStatus(cached);
  
  // Return fresh cache immediately
  if (!options.forceRefresh && cacheStatus === 'fresh' && cached) {
    return { ...cached.data, confidence: cached.data.confidence };
  }
  
  // Return stale cache while refreshing in background
  if (!options.forceRefresh && cacheStatus === 'stale' && cached) {
    // Background refresh
    fetchAndCacheItem(itemId).catch(err => 
      errorReporter.logError('pricing', 'Background refresh failed', err)
    );
    return { ...cached.data, confidence: 'medium' };
  }
  
  // Cache miss - fetch fresh data
  return fetchAndCacheItem(itemId);
}

/**
 * Fetch item from database and cache it
 */
async function fetchAndCacheItem(itemId: string): Promise<MarketItemPrice | null> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('market_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();
    
    if (error) {
      errorReporter.logError('pricing', `Failed to fetch item ${itemId}`, error);
      
      // Return last known good value if available
      const cached = marketItemCache.get(itemId);
      if (cached) {
        return { ...cached.data, confidence: 'low' };
      }
      return null;
    }
    
    if (!data) return null;
    
    const normalized = normalizeMarketItem(data);
    
    // Cache the result
    marketItemCache.set(itemId, {
      data: normalized,
      timestamp: Date.now(),
      ttl: CACHE_TTL.FRESH,
    });
    
    return normalized;
  } catch (err) {
    errorReporter.logError('pricing', `Exception fetching item ${itemId}`, err);
    
    // Return last known good
    const cached = marketItemCache.get(itemId);
    if (cached) {
      return { ...cached.data, confidence: 'low' };
    }
    return null;
  }
}

/**
 * Get all market items with caching and pagination support
 */
export async function getAllMarketItems(
  options: {
    category?: string;
    limit?: number;
    forceRefresh?: boolean;
    trending?: boolean;
  } = {}
): Promise<MarketItemPrice[]> {
  const { category, limit = 100, forceRefresh = false, trending } = options;
  const cacheKey = `all-${category || 'all'}-${trending ? 'trending' : 'all'}-${limit}`;
  
  try {
    // Maximize price coverage - fetch all items with price > 0
    let query = supabase
      .from('market_items')
      .select('*')
      .gt('current_price', 0)
      .order('is_trending', { ascending: false })
      .order('current_price', { ascending: false })
      .limit(limit);
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (trending) {
      query = query.eq('is_trending', true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      errorReporter.logError('pricing', 'Failed to fetch all items', error);
      return [];
    }
    
    const items = (data || []).map(normalizeMarketItem);
    
    // Cache individual items
    items.forEach(item => {
      marketItemCache.set(item.id, {
        data: item,
        timestamp: Date.now(),
        ttl: CACHE_TTL.FRESH,
      });
    });
    
    return items;
  } catch (err) {
    errorReporter.logError('pricing', 'Exception fetching all items', err);
    return [];
  }
}

/**
 * Get price history for an item
 */
export async function getPriceHistory(
  productId: string,
  options: { days?: number; itemName?: string; category?: string } = {}
): Promise<{ date: string; price: number }[]> {
  const { days = 30, itemName, category } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  try {
    // Strategy 1: Exact match on productId
    let { data } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('product_id', productId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });
    
    // Strategy 2: Partial match if no exact match
    if (!data?.length && productId.includes('-')) {
      const { data: partialData } = await supabase
        .from('price_history')
        .select('price, recorded_at')
        .ilike('product_id', `%${productId}%`)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(200);
      data = partialData;
    }
    
    // Strategy 3: Search by item name
    if (!data?.length && itemName) {
      const searchTerm = itemName.split(' ')[0].toLowerCase();
      const { data: nameData } = await supabase
        .from('price_history')
        .select('price, recorded_at')
        .ilike('product_id', `%${searchTerm}%`)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(200);
      data = nameData;
    }
    
    if (!data?.length) return [];
    
    // Aggregate by date (average prices per day)
    const byDate = new Map<string, number[]>();
    data.forEach(item => {
      const date = new Date(item.recorded_at).toISOString().split('T')[0];
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(item.price);
    });
    
    return Array.from(byDate.entries()).map(([date, prices]) => ({
      date,
      price: prices.reduce((a, b) => a + b, 0) / prices.length,
    }));
  } catch (err) {
    errorReporter.logError('pricing', `Failed to fetch price history for ${productId}`, err);
    return [];
  }
}

/**
 * Manually invalidate cache for an item
 */
export function invalidateCache(itemId?: string): void {
  if (itemId) {
    marketItemCache.delete(itemId);
    priceCache.delete(itemId);
  } else {
    marketItemCache.clear();
    priceCache.clear();
  }
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  marketItemsCached: number;
  pricesCached: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  let oldest: number | null = null;
  let newest: number | null = null;
  
  marketItemCache.forEach((entry) => {
    if (oldest === null || entry.timestamp < oldest) oldest = entry.timestamp;
    if (newest === null || entry.timestamp > newest) newest = entry.timestamp;
  });
  
  return {
    marketItemsCached: marketItemCache.size,
    pricesCached: priceCache.size,
    oldestEntry: oldest,
    newestEntry: newest,
  };
}

/**
 * Subscribe to price updates
 */
export function subscribeToPriceUpdates(
  callback: (prices: Map<string, PriceData>) => void
): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Notify all subscribers of price update
 */
function notifySubscribers(): void {
  const allPrices = new Map<string, PriceData>();
  priceCache.forEach((entry, key) => {
    allPrices.set(key, entry.data);
  });
  subscribers.forEach(cb => cb(allPrices));
}

// Export singleton
export const pricingService = {
  getMarketItemPrice,
  getAllMarketItems,
  getPriceHistory,
  invalidateCache,
  getCacheStats,
  subscribeToPriceUpdates,
  validatePrice,
};

export default pricingService;
