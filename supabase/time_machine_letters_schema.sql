-- SQL Migration to support Love Time Machine Letters (Double-Blind Letters)
CREATE TABLE IF NOT EXISTS public.love_time_machine_letters (
  id uuid primary key default gen_random_uuid(),
  period text not null, -- e.g. '2026-05' or '2026'
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  CONSTRAINT unique_period_user UNIQUE (period, user_id)
);

-- Enable RLS
ALTER TABLE public.love_time_machine_letters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated users full access to time_machine_letters" 
ON public.love_time_machine_letters 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Enable Realtime Replication
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.love_time_machine_letters;
COMMIT;
