-- Fix handle_new_user to copy phone and national_id from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_type, phone, national_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data ->> 'account_type')::account_type, 'buyer'),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'phone'), ''),
    NULLIF(TRIM(new.raw_user_meta_data ->> 'national_id'), '')
  );
  RETURN new;
END;
$$;

-- Also backfill existing users who have phone/national_id in auth metadata but not in profiles
-- This fixes users like eatyuksel@gmail.com who signed up before the fix
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      au.id,
      au.raw_user_meta_data ->> 'phone' as meta_phone,
      au.raw_user_meta_data ->> 'national_id' as meta_national_id
    FROM auth.users au
    JOIN public.profiles p ON p.id = au.id
    WHERE 
      (p.phone IS NULL OR p.phone = '') 
      AND au.raw_user_meta_data ->> 'phone' IS NOT NULL
      AND TRIM(au.raw_user_meta_data ->> 'phone') != ''
  LOOP
    UPDATE public.profiles 
    SET 
      phone = NULLIF(TRIM(r.meta_phone), ''),
      national_id = COALESCE(
        NULLIF(TRIM(r.meta_national_id), ''),
        national_id
      )
    WHERE id = r.id;
  END LOOP;
END $$;