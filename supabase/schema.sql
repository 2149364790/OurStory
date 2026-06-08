-- ==========================================
-- CoupleSpace Database Schema & Policies
-- ==========================================

-- 1. Profiles Table (User Profile)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create access policy for authenticated users
create policy "Allow authenticated users full access to profiles" on public.profiles
  for all using (auth.role() = 'authenticated');

-- Trigger to automatically create a profile on user sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)), 
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Couple Settings Table (Shared configurations)
create table if not exists public.couple_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  anniversary_date date not null default '2025-05-20'::date,
  bg_theme text not null default 'sunset', -- themes: sunset, starry, cherry
  custom_bg_url text,
  together_days_offset integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.couple_config enable row level security;

create policy "Allow authenticated users full access to config" on public.couple_config
  for all using (auth.role() = 'authenticated');

-- Seed the initial singleton configuration row
insert into public.couple_config (id, anniversary_date, bg_theme, together_days_offset)
values ('00000000-0000-0000-0000-000000000000'::uuid, '2025-05-20'::date, 'sunset', 0)
on conflict (id) do nothing;


-- 3. Tasks Table (Check-in milestones and memory timeline)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  media text[], -- array of storage file paths in the 'media' bucket
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null
);

alter table public.tasks enable row level security;

create policy "Allow authenticated users full access to tasks" on public.tasks
  for all using (auth.role() = 'authenticated');


-- 4. Whispers Table (Heart secret dialog box)
create table if not exists public.whispers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text,
  audio_path text, -- storage file path in the 'audio' bucket
  audio_duration integer, -- audio file length in seconds
  parent_id uuid references public.whispers(id) on delete cascade,
  is_resolved boolean not null default false,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.whispers enable row level security;

create policy "Allow authenticated users full access to whispers" on public.whispers
  for all using (auth.role() = 'authenticated');


-- 5. Monthly Reviews Table (Double-blind communication room)
create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  scheduled_date timestamp with time zone not null,
  
  user_a_id uuid references auth.users(id) on delete set null,
  user_b_id uuid references auth.users(id) on delete set null,
  
  user_a_feedback text,
  user_b_feedback text,
  user_a_submitted boolean not null default false,
  user_b_submitted boolean not null default false,
  
  suggestions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.monthly_reviews enable row level security;

create policy "Allow authenticated users full access to monthly_reviews" on public.monthly_reviews
  for all using (auth.role() = 'authenticated');


-- 6. Interactions Table (Real-time hugs, kisses, miss notifications)
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'hug', 'kiss', 'miss', 'pat', 'heart'
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.interactions enable row level security;

create policy "Allow authenticated users full access to interactions" on public.interactions
  for all using (auth.role() = 'authenticated');


-- 7. Realtime Synchronization Settings
-- Setup replication for real-time state changes on the front-end
begin;
  -- Remove existing publications if any, to avoid conflicts
  drop publication if exists supabase_realtime;
  
  -- Create publication
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.whispers;
alter publication supabase_realtime add table public.monthly_reviews;
alter publication supabase_realtime add table public.interactions;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.couple_config;


-- 8. Storage Buckets configuration
-- Insert buckets into storage.buckets table
insert into storage.buckets (id, name, public) 
values 
  ('media', 'media', true), 
  ('audio', 'audio', true), 
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create policies for storage access
create policy "Allow authenticated users to manage media storage"
on storage.objects for all using (
  bucket_id = 'media' and auth.role() = 'authenticated'
) with check (
  bucket_id = 'media' and auth.role() = 'authenticated'
);

create policy "Allow authenticated users to manage audio storage"
on storage.objects for all using (
  bucket_id = 'audio' and auth.role() = 'authenticated'
) with check (
  bucket_id = 'audio' and auth.role() = 'authenticated'
);

create policy "Allow authenticated users to manage avatars storage"
on storage.objects for all using (
  bucket_id = 'avatars' and auth.role() = 'authenticated'
) with check (
  bucket_id = 'avatars' and auth.role() = 'authenticated'
);
