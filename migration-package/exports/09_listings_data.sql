-- =====================================================
-- LISTINGS DATA EXPORT
-- Run this in your NEW Supabase SQL Editor
-- =====================================================

INSERT INTO listings (id, seller_id, title, description, category, condition, price, status, allows_trade, allows_shipping, allows_vault, source, external_id, external_price, image_url, created_at, updated_at) VALUES
('245bc50d-7053-4ec6-b8ae-97ce732587ab', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'One Piece Shanks', 'One piece Shanks PSA 9.5', 'tcg', 'Near Mint', 3400.00, 'active', true, true, true, 'user', NULL, NULL, NULL, '2025-12-13 10:01:30.859861+00', '2025-12-13 10:01:30.859861+00'),
('66fbbb94-136c-4a34-82a2-cf8885671652', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Ronaldo', '', 'nba', 'Near Mint', 350.00, 'active', true, true, true, 'user', NULL, NULL, NULL, '2025-12-14 18:08:27.18964+00', '2025-12-14 18:08:27.18964+00'),
('15311809-07b0-4227-8f32-3e15c58e49c9', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Charizard 1st Edition Base Set', 'Market price from PriceCharting. Original price: $3980.42', 'pokemon', 'Near Mint', 3873.76, 'active', true, true, true, 'pricecharting', 'tcg-charizard-1st', 3742.76, NULL, '2025-12-14 19:14:03.665036+00', '2025-12-18 12:11:03.404795+00'),
('613d63e4-deea-4909-8b18-8214d2d68d30', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Blastoise 1st Edition Base Set', 'Market price from PriceCharting. Original price: $600.00', 'pokemon', 'Near Mint', 621.00, 'active', true, true, true, 'pricecharting', 'tcg-blastoise-1st', 600, NULL, '2025-12-14 19:14:07.024659+00', '2025-12-18 12:11:06.277747+00'),
('8bbd6550-0c94-449d-bc9e-d9f885673d89', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Venusaur 1st Edition Base Set', 'Market price from PriceCharting. Original price: $750.00', 'pokemon', 'Near Mint', 794.36, 'active', true, true, true, 'pricecharting', 'tcg-venusaur-1st', 767.5, NULL, '2025-12-14 19:14:07.975103+00', '2025-12-18 12:11:06.704388+00'),
('d313e1c6-4bfe-4c57-91b2-46a53d12007a', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Lugia Neo Genesis 1st Edition', 'Market price from PriceCharting. Original price: $875.20', 'pokemon', 'Near Mint', 932.21, 'active', true, true, true, 'pricecharting', 'tcg-lugia-neo', 900.69, NULL, '2025-12-14 19:14:09.619065+00', '2025-12-18 12:11:07.125425+00'),
('5426aba3-f3ad-45d3-bdf6-f4192106a00f', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Gengar VMAX Alt Art', 'Market price from PriceCharting. Original price: $614.50', 'pokemon', 'Near Mint', 661.88, 'active', true, true, true, 'pricecharting', 'tcg-gengar-vmax', 639.5, NULL, '2025-12-14 19:14:30.481876+00', '2025-12-18 12:11:16.550196+00'),
('322b3a7a-81b1-46b3-8de4-3e4ab7cd6119', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Black Lotus Alpha', 'Market price from PriceCharting. Original price: $19326.00', 'mtg', 'Near Mint', 29666.21, 'active', true, true, true, 'pricecharting', 'tcg-black-lotus', 28663, NULL, '2025-12-14 19:14:30.930509+00', '2025-12-18 12:11:16.999514+00'),
('5a0b0acc-430c-46aa-97aa-7f11c02c496a', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Mox Sapphire Alpha', 'Market price from PriceCharting. Original price: $5650.00', 'mtg', 'Near Mint', 5847.75, 'active', true, true, true, 'pricecharting', 'mtg-mox-sapphire', 5650, NULL, '2025-12-14 19:14:31.807688+00', '2025-12-18 12:11:17.57904+00'),
('b510dfc2-e2d6-42b2-b142-958bb957fe96', '58b26fb2-452c-4b5c-8f84-67d2223f98e6', 'Mox Ruby Alpha', 'Market price from PriceCharting. Original price: $4999.00', 'mtg', 'Near Mint', 5173.96, 'active', true, true, true, 'pricecharting', 'mtg-mox-ruby', 4999, NULL, '2025-12-14 19:14:32.404734+00', '2025-12-18 12:11:18.00021+00')
ON CONFLICT (id) DO NOTHING;

-- Note: This is a sample of listings. Full export may have more rows.
