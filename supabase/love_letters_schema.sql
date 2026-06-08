-- SQL Migration to support Romantic Love Letters in Whispers
CREATE TABLE IF NOT EXISTS public.love_letters (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  images text[] default '{}' not null,
  theme text default 'vintage' not null, -- 'vintage', 'sunset', 'starry', 'cherry'
  unlock_at timestamp with time zone, -- NULL means open immediately
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.love_letters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated users full access to love_letters" 
ON public.love_letters FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime Replication
ALTER publication supabase_realtime ADD TABLE public.love_letters;
