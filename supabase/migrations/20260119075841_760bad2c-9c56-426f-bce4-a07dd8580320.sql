-- Add grading pricing settings to platform_settings
INSERT INTO platform_settings (key, value) VALUES 
  ('grading_price_standard', '18'),
  ('grading_price_express', '35'),
  ('grading_price_priority', '75'),
  ('grading_days_standard_min', '20'),
  ('grading_days_standard_max', '25'),
  ('grading_days_express_min', '7'),
  ('grading_days_express_max', '10'),
  ('grading_days_priority_min', '2'),
  ('grading_days_priority_max', '3'),
  ('grading_referral_commission_rate', '0.10'),
  ('grading_creator_revenue_share', '0.15')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();