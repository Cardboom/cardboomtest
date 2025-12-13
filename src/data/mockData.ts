import { Collectible, MarketStats, PricePoint } from '@/types/collectible';
import lebronRookie from '@/assets/cards/lebron-rookie.jpg';
import charizard1st from '@/assets/cards/charizard-1st.jpg';
import mahomesPrizm from '@/assets/cards/mahomes-prizm.jpg';
import kawsCompanion from '@/assets/cards/kaws-companion.jpg';
import jordanFleer from '@/assets/cards/jordan-fleer.jpg';
import blackLotus from '@/assets/cards/black-lotus.jpg';
import bradyContenders from '@/assets/cards/brady-contenders.jpg';
import bearbrickKaws from '@/assets/cards/bearbrick-kaws.jpg';
import lukaPrizm from '@/assets/cards/luka-prizm.jpg';
import pikachuIllustrator from '@/assets/cards/pikachu-illustrator.jpg';
import chaseOptic from '@/assets/cards/chase-optic.jpg';
import mewtwoRainbow from '@/assets/cards/mewtwo-rainbow.jpg';
import valorantVp from '@/assets/cards/valorant-vp.jpg';
import pubgUc from '@/assets/cards/pubg-uc.jpg';
import yugiohBlueEyes from '@/assets/cards/yugioh-blue-eyes.jpg';
import yugiohDarkMagician from '@/assets/cards/yugioh-dark-magician.jpg';
import onepieceLuffy from '@/assets/cards/onepiece-luffy.jpg';
import onepieceShanks from '@/assets/cards/onepiece-shanks.jpg';
import lorcanaElsa from '@/assets/cards/lorcana-elsa.jpg';
import lorcanaMickey from '@/assets/cards/lorcana-mickey.jpg';

// Prices are fetched from database via useLivePrices hook
// These are default values that get overwritten by live data
export const mockCollectibles: Collectible[] = [
  // NBA Cards
  {
    id: '1',
    priceId: 'nba-lebron-2003',
    name: 'LeBron James Rookie PSA 10',
    category: 'nba',
    image: lebronRookie,
    price: 245000, // Default - overwritten by database
    previousPrice: 232000,
    priceChange: 5.2,
    rarity: 'grail',
    seller: 'EliteCards',
    condition: 'PSA 10 Gem Mint',
    year: 2003,
    brand: 'Topps Chrome',
    trending: true,
  },
  {
    id: '5',
    priceId: 'nba-jordan-fleer',
    name: 'Michael Jordan Fleer Rookie',
    category: 'nba',
    image: jordanFleer,
    price: 89000,
    previousPrice: 82100,
    priceChange: 8.4,
    rarity: 'grail',
    seller: 'HoopsHistory',
    condition: 'PSA 9',
    year: 1986,
    brand: 'Fleer',
    trending: true,
  },
  {
    id: '9',
    priceId: 'nba-luka-prizm',
    name: 'Luka Doncic Prizm Silver',
    category: 'nba',
    image: lukaPrizm,
    price: 12500,
    previousPrice: 12770,
    priceChange: -2.1,
    rarity: 'legendary',
    seller: 'ModernHoops',
    condition: 'PSA 10',
    year: 2018,
    brand: 'Panini Prizm',
    trending: true,
  },
  // Football Cards
  {
    id: '3',
    priceId: 'football-mahomes-prizm',
    name: 'Patrick Mahomes Prizm Silver',
    category: 'football',
    image: mahomesPrizm,
    price: 15000,
    previousPrice: 14400,
    priceChange: 4.2,
    rarity: 'legendary',
    seller: 'GridironGreats',
    condition: 'PSA 10',
    year: 2017,
    brand: 'Panini Prizm',
    trending: true,
  },
  {
    id: '7',
    priceId: 'football-brady-rookie',
    name: 'Tom Brady Contenders Auto',
    category: 'football',
    image: bradyContenders,
    price: 85000, // Updated to match database
    previousPrice: 80000,
    priceChange: 3.5,
    rarity: 'grail',
    seller: 'NFLElite',
    condition: 'PSA 10',
    year: 2000,
    brand: 'Playoff Contenders',
    trending: true,
  },
  {
    id: '11',
    priceId: 'football-chase-auto',
    name: "Ja'Marr Chase Optic Auto",
    category: 'football',
    image: chaseOptic,
    price: 4500, // Updated to match database
    previousPrice: 4200,
    priceChange: 7.1,
    rarity: 'legendary',
    seller: 'BengalsVault',
    condition: 'PSA 10',
    year: 2021,
    brand: 'Donruss Optic',
    trending: true,
  },
  // Pokémon TCG
  {
    id: '2',
    priceId: 'tcg-charizard-1st',
    name: 'Charizard 1st Edition Holo',
    category: 'pokemon',
    image: charizard1st,
    price: 420000,
    previousPrice: 400000,
    priceChange: 5.0,
    rarity: 'grail',
    seller: 'PokéVault',
    condition: 'BGS 9.5',
    year: 1999,
    brand: 'Pokémon Base Set',
    trending: true,
  },
  {
    id: '10',
    priceId: 'tcg-pikachu-illustrator',
    name: 'Pikachu Illustrator Promo',
    category: 'pokemon',
    image: pikachuIllustrator,
    price: 2500000,
    previousPrice: 2456000,
    priceChange: 1.8,
    rarity: 'grail',
    seller: 'RareFinds',
    condition: 'CGC 8',
    year: 1998,
    brand: 'Pokémon',
    trending: true,
  },
  {
    id: '12',
    priceId: 'tcg-psa10-mewtwo',
    name: 'Mewtwo GX Rainbow PSA 10',
    category: 'pokemon',
    image: mewtwoRainbow,
    price: 28000,
    previousPrice: 27000,
    priceChange: -0.8,
    rarity: 'legendary',
    seller: 'PokéElite',
    condition: 'PSA 10',
    year: 2019,
    brand: 'Pokémon',
    trending: false,
  },
  // Magic: The Gathering
  {
    id: '6',
    priceId: 'tcg-black-lotus',
    name: 'Black Lotus Alpha MTG',
    category: 'mtg',
    image: blackLotus,
    price: 185000,
    previousPrice: 175000,
    priceChange: 6.5,
    rarity: 'grail',
    seller: 'MTGLegends',
    condition: 'BGS 8.5',
    year: 1993,
    brand: 'Magic: The Gathering',
    trending: true,
  },
  // Yu-Gi-Oh!
  {
    id: '14',
    priceId: 'yugioh-blue-eyes',
    name: 'Blue-Eyes White Dragon LOB',
    category: 'yugioh',
    image: yugiohBlueEyes,
    price: 35000, // Updated to match database
    previousPrice: 33000,
    priceChange: 3.5,
    rarity: 'legendary',
    seller: 'DuelistPro',
    condition: 'PSA 10',
    year: 2002,
    brand: 'Yu-Gi-Oh! LOB',
    trending: true,
  },
  {
    id: '15',
    priceId: 'yugioh-dark-magician',
    name: 'Dark Magician SDY 1st Ed',
    category: 'yugioh',
    image: yugiohDarkMagician,
    price: 18000, // Updated to match database
    previousPrice: 17000,
    priceChange: 4.2,
    rarity: 'legendary',
    seller: 'DuelistPro',
    condition: 'PSA 9',
    year: 2002,
    brand: 'Yu-Gi-Oh! Starter Deck',
    trending: false,
  },
  // One Piece TCG
  {
    id: '16',
    priceId: 'onepiece-luffy-alt',
    name: 'Monkey D. Luffy Alt Art',
    category: 'onepiece',
    image: onepieceLuffy,
    price: 850, // Updated to match database
    previousPrice: 650,
    priceChange: 15.2,
    rarity: 'legendary',
    seller: 'GrandLineCards',
    condition: 'PSA 10',
    year: 2023,
    brand: 'One Piece TCG',
    trending: true,
  },
  {
    id: '17',
    priceId: 'onepiece-shanks-manga',
    name: 'Shanks Manga Art SP',
    category: 'onepiece',
    image: onepieceShanks,
    price: 425, // Updated to match database
    previousPrice: 380,
    priceChange: 8.5,
    rarity: 'legendary',
    seller: 'GrandLineCards',
    condition: 'PSA 10',
    year: 2024,
    brand: 'One Piece TCG',
    trending: true,
  },
  // Disney Lorcana
  {
    id: '18',
    priceId: 'lorcana-elsa-enchanted',
    name: 'Elsa Spirit of Winter Enchanted',
    category: 'lorcana',
    image: lorcanaElsa,
    price: 450, // Updated to match database
    previousPrice: 480,
    priceChange: -5.2,
    rarity: 'legendary',
    seller: 'LorcanaVault',
    condition: 'Gem Mint',
    year: 2023,
    brand: 'Disney Lorcana',
    trending: true,
  },
  {
    id: '19',
    priceId: 'lorcana-mickey-enchanted',
    name: 'Mickey Mouse Enchanted',
    category: 'lorcana',
    image: lorcanaMickey,
    price: 320, // Updated to match database
    previousPrice: 290,
    priceChange: 6.8,
    rarity: 'legendary',
    seller: 'LorcanaVault',
    condition: 'PSA 10',
    year: 2024,
    brand: 'Disney Lorcana',
    trending: false,
  },
  // Figures
  {
    id: '4',
    priceId: 'figure-kaws-companion',
    name: 'KAWS Companion Black',
    category: 'figures',
    image: kawsCompanion,
    price: 45000,
    previousPrice: 42000,
    priceChange: 7.2,
    rarity: 'legendary',
    seller: 'ArtCollect',
    condition: 'Sealed',
    year: 2020,
    brand: 'KAWS',
    trending: true,
  },
  {
    id: '8',
    priceId: 'figure-bearbrick-1000',
    name: 'Be@rbrick 1000% Kaws',
    category: 'figures',
    image: bearbrickKaws,
    price: 28000, // Updated to match database
    previousPrice: 26000,
    priceChange: 5.8,
    rarity: 'legendary',
    seller: 'ArtToys',
    condition: 'New',
    year: 2024,
    brand: 'Medicom',
    trending: true,
  },
  // Game Points - Valorant
  {
    id: '24',
    priceId: 'valorant-1000vp',
    name: 'Valorant 1000 VP',
    category: 'gamepoints',
    image: valorantVp,
    price: 10.20,
    previousPrice: 10.20,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'Valorant',
    trending: false,
  },
  {
    id: '25',
    priceId: 'valorant-2050vp',
    name: 'Valorant 2050 VP',
    category: 'gamepoints',
    image: valorantVp,
    price: 20.40,
    previousPrice: 20.40,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'Valorant',
    trending: false,
  },
  {
    id: '26',
    priceId: 'valorant-5350vp',
    name: 'Valorant 5350 VP',
    category: 'gamepoints',
    image: valorantVp,
    price: 51.00,
    previousPrice: 51.00,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'Valorant',
    trending: false,
  },
  // Game Points - PUBG UC
  {
    id: '27',
    priceId: 'pubg-600uc',
    name: 'PUBG 600 UC',
    category: 'gamepoints',
    image: pubgUc,
    price: 10.20,
    previousPrice: 10.20,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'PUBG Mobile',
    trending: false,
  },
  {
    id: '28',
    priceId: 'pubg-1500uc',
    name: 'PUBG 1500 UC',
    category: 'gamepoints',
    image: pubgUc,
    price: 25.50,
    previousPrice: 25.50,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'PUBG Mobile',
    trending: false,
  },
  {
    id: '29',
    priceId: 'pubg-3850uc',
    name: 'PUBG 3850 UC',
    category: 'gamepoints',
    image: pubgUc,
    price: 51.00,
    previousPrice: 51.00,
    priceChange: 0,
    rarity: 'common',
    seller: 'Cardboom',
    condition: 'Digital Code',
    year: 2024,
    brand: 'PUBG Mobile',
    trending: false,
  },
];

// Categories for filtering
export const categories = [
  { id: 'all', name: 'All', icon: '🎯' },
  { id: 'pokemon', name: 'Pokémon', icon: '⚡' },
  { id: 'yugioh', name: 'Yu-Gi-Oh!', icon: '🎴' },
  { id: 'onepiece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'lorcana', name: 'Lorcana', icon: '✨' },
  { id: 'mtg', name: 'MTG', icon: '🧙' },
  { id: 'nba', name: 'NBA', icon: '🏀' },
  { id: 'football', name: 'Football', icon: '🏈' },
  { id: 'figures', name: 'Figures', icon: '🎨' },
  { id: 'gamepoints', name: 'Game Points', icon: '🎮' },
];

// XP/Level calculations
export const getLevelFromXP = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getXPForLevel = (level: number): number => {
  return Math.pow(level - 1, 2) * 100;
};

// Historical price data generator
export const generatePriceHistory = (basePrice: number, days: number = 30): PricePoint[] => {
  const history: PricePoint[] = [];
  let currentPrice = basePrice * 0.9;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.45) * 0.03;
    currentPrice = currentPrice * (1 + change);
    
    history.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(currentPrice),
    });
  }
  
  return history;
};

export const mockMarketStats: MarketStats = {
  totalVolume: 2450000000,
  dailyVolume: 45600000,
  activeListings: 125000,
  activeTraders: 89000,
};
