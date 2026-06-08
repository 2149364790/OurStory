-- Fix: Allow any authenticated user to update the is_read field on interactions
-- This resolves the issue where the recipient cannot mark a sender's interaction as read

-- Drop the existing blanket policy
DROP POLICY IF EXISTS "Allow authenticated users full access to interactions" ON public.interactions;

-- Recreate with explicit WITH CHECK to allow updates by any authenticated user
CREATE POLICY "Allow authenticated users full access to interactions"
  ON public.interactions
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
