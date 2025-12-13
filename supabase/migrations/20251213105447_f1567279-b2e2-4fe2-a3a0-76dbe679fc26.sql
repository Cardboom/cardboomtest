-- Add new trending cards including League of Legends Riftbound, more One Piece, and others
INSERT INTO public.market_items (name, category, subcategory, current_price, base_price, change_24h, change_7d, change_30d, is_trending, liquidity, data_source)
VALUES 
  -- League of Legends Riftbound
  ('Jinx - Powder', 'lol-riftbound', 'champion', 85, 85, 12.5, 28.3, 45.0, true, 'high', 'pricecharting'),
  ('Yasuo - Unforgiven', 'lol-riftbound', 'champion', 125, 125, 8.2, 15.6, 32.0, true, 'high', 'pricecharting'),
  ('Ahri - Nine-Tailed Fox', 'lol-riftbound', 'champion', 180, 180, 15.8, 22.4, 55.0, true, 'high', 'pricecharting'),
  ('Teemo - Swift Scout', 'lol-riftbound', 'champion', 45, 45, -3.2, 5.8, 18.0, true, 'medium', 'pricecharting'),
  ('Lux - Lady of Luminosity', 'lol-riftbound', 'champion', 95, 95, 6.7, 12.3, 28.0, true, 'high', 'pricecharting'),
  ('Thresh - Chain Warden', 'lol-riftbound', 'champion', 150, 150, 18.4, 35.2, 62.0, true, 'high', 'pricecharting'),
  ('Miss Fortune - Bounty Hunter', 'lol-riftbound', 'champion', 110, 110, 9.1, 18.7, 38.0, true, 'medium', 'pricecharting'),
  ('Zed - Master of Shadows', 'lol-riftbound', 'champion', 200, 200, 22.3, 42.1, 78.0, true, 'high', 'pricecharting'),
  
  -- More One Piece TCG
  ('Roronoa Zoro - Three Sword', 'one-piece', 'straw-hat', 380, 380, 11.2, 25.6, 48.0, true, 'high', 'pricecharting'),
  ('Nami - Navigator', 'one-piece', 'straw-hat', 220, 220, 7.8, 14.2, 32.0, true, 'medium', 'pricecharting'),
  ('Trafalgar Law - Surgeon', 'one-piece', 'supernova', 520, 520, 18.5, 38.4, 72.0, true, 'high', 'pricecharting'),
  ('Kaido - Dragon Form', 'one-piece', 'yonko', 680, 680, 14.3, 28.9, 55.0, true, 'high', 'pricecharting'),
  
  -- More Lorcana
  ('Stitch - Rock Star', 'lorcana', 'enchanted', 280, 280, 9.2, 18.5, 42.0, true, 'high', 'pricecharting'),
  ('Maui - Demigod', 'lorcana', 'legendary', 180, 180, 6.5, 12.8, 28.0, true, 'medium', 'pricecharting'),
  ('Maleficent - Monstrous Dragon', 'lorcana', 'enchanted', 420, 420, 12.8, 26.4, 58.0, true, 'high', 'pricecharting'),
  
  -- More Pokemon
  ('Mew VMAX Alt Art', 'pokemon', 'modern', 180, 180, 5.2, 12.4, 28.0, true, 'high', 'pricecharting'),
  ('Umbreon VMAX Alt Art', 'pokemon', 'modern', 320, 320, 8.9, 18.6, 42.0, true, 'high', 'pricecharting'),
  ('Moonbreon Promo', 'pokemon', 'promo', 580, 580, 15.4, 32.8, 68.0, true, 'high', 'pricecharting'),
  
  -- More Sports
  ('Victor Wembanyama Prizm', 'sports-nba', 'rookie', 850, 850, 28.5, 58.2, 125.0, true, 'high', 'pricecharting'),
  ('Caitlin Clark Prizm', 'sports-wnba', 'rookie', 420, 420, 35.2, 72.4, 180.0, true, 'high', 'pricecharting'),
  ('Shohei Ohtani Topps Chrome', 'sports-mlb', 'star', 380, 380, 12.4, 24.8, 52.0, true, 'high', 'pricecharting')
ON CONFLICT (id) DO NOTHING;