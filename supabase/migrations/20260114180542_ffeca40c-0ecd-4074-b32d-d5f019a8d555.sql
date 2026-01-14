-- Add starter bounty flag to bounties table
ALTER TABLE public.bounties ADD COLUMN IF NOT EXISTS is_starter_bounty boolean DEFAULT false;

-- Insert the 10 starter bounties (permanent, no expiry for starters)
INSERT INTO public.bounties (
  title, description, bounty_type, target_count, reward_gems, 
  is_starter_bounty, is_active, period_type, max_claims,
  starts_at, ends_at
) VALUES 
  ('List Your First Card', 'Create your first marketplace listing', 'listing', 1, 20, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Refer a Friend', 'Invite a friend to join CardBoom', 'referral', 1, 50, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('List 3 Cards', 'Create 3 marketplace listings', 'listing', 3, 100, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Grade Your First Card', 'Submit a card for professional grading', 'grading', 1, 250, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Grade 4 Cards', 'Submit 4 cards for grading total', 'grading', 4, 1000, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Refer 3 Friends', 'Invite 3 friends to CardBoom', 'referral', 3, 100, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('List 10 Cards', 'Create 10 marketplace listings total', 'listing', 10, 250, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Top Up $20', 'Add $20 or more to your wallet', 'topup', 2000, 50, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Top Up $100', 'Add $100 or more to your wallet', 'topup', 10000, 200, true, true, 'lifetime', null, now(), now() + interval '100 years'),
  ('Grade 50 Cards', 'Submit 50 cards for grading - become a power grader!', 'grading', 50, 10000, true, true, 'lifetime', null, now(), now() + interval '100 years')
ON CONFLICT DO NOTHING;

-- Create function to assign starter bounties to new users
CREATE OR REPLACE FUNCTION public.assign_starter_bounties()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert bounty_progress for all starter bounties for the new user
  INSERT INTO public.bounty_progress (user_id, bounty_id, current_count, is_completed, reward_claimed)
  SELECT NEW.id, b.id, 0, false, false
  FROM public.bounties b
  WHERE b.is_starter_bounty = true AND b.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign starter bounties on new profile creation
DROP TRIGGER IF EXISTS on_profile_created_assign_bounties ON public.profiles;
CREATE TRIGGER on_profile_created_assign_bounties
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_starter_bounties();