-- =====================================================
-- CARDBOOM AUTH TRIGGERS
-- =====================================================
-- 
-- IMPORTANT: These triggers MUST be run manually in the 
-- Supabase SQL Editor because they reference auth.users
-- which is in a protected schema that cannot be accessed
-- via standard migrations.
--
-- Run these AFTER running all other migration files.
-- =====================================================

-- Create trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to auto-create wallet when user signs up
CREATE TRIGGER on_auth_user_created_wallet 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_wallet();
