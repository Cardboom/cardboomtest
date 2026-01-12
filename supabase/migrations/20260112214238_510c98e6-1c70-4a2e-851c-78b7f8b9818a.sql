-- Create grading calibration table for storing computed adjustments
CREATE TABLE public.grading_calibration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Calibration data
  grading_company TEXT NOT NULL, -- PSA, BGS, CGC, SGC
  actual_grade NUMERIC(4,2) NOT NULL, -- The grade from the company
  cbgi_avg_score NUMERIC(4,2) NOT NULL, -- Average CBGI score for this grade
  sample_count INTEGER NOT NULL DEFAULT 1,
  
  -- Computed adjustments
  bias_offset NUMERIC(4,2) DEFAULT 0, -- How much CBGI over/under estimates
  confidence NUMERIC(3,2) DEFAULT 0.5, -- 0-1 confidence based on sample size
  
  -- Example cards for few-shot learning
  example_cards JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(grading_company, actual_grade)
);

-- Add calibration version to track when calibrations are applied
ALTER TABLE public.grading_orders 
ADD COLUMN IF NOT EXISTS calibration_version TEXT DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.grading_calibration ENABLE ROW LEVEL SECURITY;

-- Admin-only read/write
CREATE POLICY "Admins can manage calibration" 
ON public.grading_calibration 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow edge functions to read calibration (service role)
CREATE POLICY "Service role can read calibration" 
ON public.grading_calibration 
FOR SELECT 
USING (true);

-- Create function to recompute calibration from feedback
CREATE OR REPLACE FUNCTION public.recompute_grading_calibration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Process each company/grade combination from feedback
  FOR rec IN (
    SELECT 
      grading_company,
      actual_grade,
      AVG(cbgi_score) as avg_cbgi,
      COUNT(*) as sample_count,
      json_agg(
        json_build_object(
          'cbgi_score', cbgi_score,
          'actual_grade', actual_grade,
          'notes', feedback_notes
        )
        ORDER BY created_at DESC
      ) FILTER (WHERE cbgi_score IS NOT NULL) as examples
    FROM public.grading_feedback
    WHERE cbgi_score IS NOT NULL AND actual_grade IS NOT NULL
    GROUP BY grading_company, actual_grade
  ) LOOP
    -- Upsert calibration record
    INSERT INTO public.grading_calibration (
      grading_company,
      actual_grade,
      cbgi_avg_score,
      sample_count,
      bias_offset,
      confidence,
      example_cards,
      updated_at
    ) VALUES (
      rec.grading_company,
      rec.actual_grade,
      rec.avg_cbgi,
      rec.sample_count,
      rec.avg_cbgi - rec.actual_grade, -- Positive = CBGI overestimates
      LEAST(rec.sample_count::numeric / 10.0, 1.0), -- Max confidence at 10 samples
      rec.examples::jsonb,
      now()
    )
    ON CONFLICT (grading_company, actual_grade) DO UPDATE SET
      cbgi_avg_score = EXCLUDED.cbgi_avg_score,
      sample_count = EXCLUDED.sample_count,
      bias_offset = EXCLUDED.bias_offset,
      confidence = EXCLUDED.confidence,
      example_cards = EXCLUDED.example_cards,
      updated_at = now();
  END LOOP;
END;
$$;

-- Create trigger to auto-recompute after feedback insert
CREATE OR REPLACE FUNCTION public.trigger_recompute_calibration()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recompute_grading_calibration();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER grading_feedback_calibration_trigger
AFTER INSERT ON public.grading_feedback
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_recompute_calibration();

-- Add updated_at trigger
CREATE TRIGGER update_grading_calibration_updated_at
BEFORE UPDATE ON public.grading_calibration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();