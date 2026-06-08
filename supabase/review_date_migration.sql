-- Migration to support collaborative monthly review date negotiation
ALTER TABLE public.monthly_reviews 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'negotiating',
  ADD COLUMN IF NOT EXISTS proposed_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_proposer_id uuid references auth.users(id) on delete set null;

-- Update existing completed monthly reviews to 'agreed' status
UPDATE public.monthly_reviews
SET status = 'agreed'
WHERE user_a_submitted = true OR user_b_submitted = true;
