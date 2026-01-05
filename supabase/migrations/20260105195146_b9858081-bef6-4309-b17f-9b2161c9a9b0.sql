-- Create table to store grading feedback for model improvement
CREATE TABLE public.grading_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grading_order_id UUID REFERENCES public.grading_orders(id) ON DELETE CASCADE,
  cbgi_score NUMERIC(4,1),
  actual_grade VARCHAR(20) NOT NULL,
  grading_company VARCHAR(50) DEFAULT 'PSA',
  feedback_notes TEXT,
  submitted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view feedback (for transparency)
CREATE POLICY "Authenticated users can view feedback"
ON public.grading_feedback
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can submit feedback for their own orders
CREATE POLICY "Users can submit feedback for their orders"
ON public.grading_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grading_orders WHERE id = grading_order_id AND user_id = auth.uid()
  )
);

-- Create index for analysis queries
CREATE INDEX idx_grading_feedback_cbgi ON public.grading_feedback(cbgi_score);
CREATE INDEX idx_grading_feedback_actual ON public.grading_feedback(actual_grade);