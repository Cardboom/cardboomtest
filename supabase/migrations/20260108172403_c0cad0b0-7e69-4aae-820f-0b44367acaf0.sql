-- Add missing column to grading_credits
ALTER TABLE public.grading_credits ADD COLUMN IF NOT EXISTS gifted_by uuid;

-- Create policies if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grading_credits' AND policyname = 'Users can view their own credits') THEN
    CREATE POLICY "Users can view their own credits" ON public.grading_credits FOR SELECT USING (auth.uid() = user_id OR auth.uid() = gifted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grading_credits' AND policyname = 'Authenticated users can gift credits') THEN
    CREATE POLICY "Authenticated users can gift credits" ON public.grading_credits FOR INSERT WITH CHECK (auth.uid() = gifted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grading_credits' AND policyname = 'Users can use their own credits') THEN
    CREATE POLICY "Users can use their own credits" ON public.grading_credits FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;