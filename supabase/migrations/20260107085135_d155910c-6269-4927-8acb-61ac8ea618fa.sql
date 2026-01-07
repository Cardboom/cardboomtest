-- Fix cbgi_score_0_100 column to support decimal grades (now 0-10 scale with decimals)
ALTER TABLE public.grading_orders 
ALTER COLUMN cbgi_score_0_100 TYPE numeric(4,1) USING cbgi_score_0_100::numeric(4,1);