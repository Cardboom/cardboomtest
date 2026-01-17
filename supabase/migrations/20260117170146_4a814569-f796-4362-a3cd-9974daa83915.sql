-- Add boom coin exchange rate setting to platform_settings (value is JSONB)
INSERT INTO platform_settings (key, value)
VALUES ('boom_coin_usd_rate', '"0.001"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '"0.001"'::jsonb, updated_at = now();