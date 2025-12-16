export type CardGrade = 'raw' | 'psa10' | 'psa9' | 'psa8' | 'psa7' | 'psa6' | 'bgs10' | 'bgs9_5' | 'cgc10';

export interface Collectible {
  id: string;
  priceId: string;
  name: string;
  category: 'nba' | 'football' | 'tcg' | 'figures' | 'pokemon' | 'mtg' | 'yugioh' | 'onepiece' | 'lorcana' | 'digimon' | 'dragonball' | 'starwars' | 'riftbound' | 'gamepoints' | 'coaching';
  image: string;
  price: number;
  previousPrice: number;
  priceChange: number;
  rarity: 'common' | 'rare' | 'legendary' | 'grail';
  seller: string;
  condition: string;
  grade?: CardGrade;
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
