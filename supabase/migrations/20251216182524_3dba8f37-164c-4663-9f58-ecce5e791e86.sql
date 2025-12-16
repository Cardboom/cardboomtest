-- Create trigger to auto-generate referral codes for new profiles
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Update existing profiles that don't have referral codes
UPDATE public.profiles 
SET referral_code = 'CB-' || UPPER(SUBSTRING(MD5(id::text || created_at::text), 1, 8))
WHERE referral_code IS NULL;