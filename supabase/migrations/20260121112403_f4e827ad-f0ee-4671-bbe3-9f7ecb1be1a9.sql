-- Add lite_credit_claimed column to track free grading for Lite subscribers
ALTER TABLE public.grading_credits 
ADD COLUMN IF NOT EXISTS lite_credit_claimed boolean DEFAULT false;

-- Add monthly_credits_tier column to track which tier's monthly credits they last received
ALTER TABLE public.grading_credits 
ADD COLUMN IF NOT EXISTS monthly_credits_tier text DEFAULT null;

-- Add comment to document the grading credit structure
COMMENT ON TABLE public.grading_credits IS 'Tracks AI pre-grading credits per user:
- signup_credit_claimed: First free grading on signup (1 credit)
- lite_credit_claimed: Free grading when subscribing to Lite (1 credit)  
- first_subscribe_credit_claimed: Free grading for Pro (gives 2 credits)
- Monthly credits: Lite=1, Pro=2, Enterprise=3 per month
';