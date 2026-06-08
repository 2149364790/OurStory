-- Create Love Wishes Table
create table if not exists public.love_wishes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  image_url text,
  expectation integer default 3 not null,
  claimed_by uuid references auth.users(id) on delete set null,
  status text default 'pending' not null, -- 'pending', 'claimed', 'achieved'
  achieved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.love_wishes enable row level security;

-- Policies
create policy "Allow authenticated users full access to love_wishes" 
  on public.love_wishes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Add to Realtime synchronization
alter publication supabase_realtime add table public.love_wishes;
