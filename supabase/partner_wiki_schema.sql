-- ==========================================
-- Companion Wiki & Romance Capsule Schema
-- ==========================================

-- 1. Partner Preferences Table
create table if not exists public.partner_preferences (
  id uuid references public.profiles(id) on delete cascade primary key,
  clothing_sizes jsonb not null default '{}'::jsonb,
  diet_preferences jsonb not null default '{}'::jsonb,
  mbti varchar(20),
  how_to_soothe text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.partner_preferences enable row level security;

-- Policies for partner_preferences
create policy "Allow authenticated users full access to partner_preferences" 
  on public.partner_preferences
  for all using (auth.role() = 'authenticated');


-- 2. Partner Records Table (for advantages/compliments and wishlists)
create table if not exists public.partner_records (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid references public.profiles(id) on delete cascade not null,
  type varchar(20) not null check (type in ('advantage', 'wish')),
  content text not null,
  is_secret boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.partner_records enable row level security;

-- Policies for partner_records
create policy "Allow authenticated users full access to partner_records" 
  on public.partner_records
  for all using (auth.role() = 'authenticated');


-- 3. Add Tables to Realtime Publication
alter publication supabase_realtime add table public.partner_preferences;
alter publication supabase_realtime add table public.partner_records;
