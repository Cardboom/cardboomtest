export interface Collectible {
  id: string;
  name: string;
  category: 'nba' | 'football' | 'tcg' | 'figures';
  image: string;
  price: number;
  previousPrice: number;
  priceChange: number;
  rarity: 'common' | 'rare' | 'legendary' | 'grail';
  seller: string;
  condition: string;
  year: number;
  brand: string;
  trending: boolean;
}

export interface MarketStats {
  totalVolume: number;
  dailyVolume: number;
  activeListings: number;
  activeTraders: number;
}

export interface PricePoint {
  date: string;
  price: number;
}
