-- Add email column to support_tickets for guest submissions
ALTER TABLE public.support_tickets 
ADD COLUMN email TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.support_tickets.email IS 'Email address for ticket correspondence, especially for non-logged-in users';