-- Drop old tables if they exist
drop table if exists public.love_checklist;
drop table if exists public.love_checklist_logs;
drop table if exists public.love_checklist_completions;
drop table if exists public.love_checklist_items;
drop table if exists public.love_checklist_categories;

-- 0. Create love_checklist_categories table (Definitions of categories)
create table if not exists public.love_checklist_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1. Create love_checklist_items table (Definitions of goals)
create table if not exists public.love_checklist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null references public.love_checklist_categories(name) on update cascade on delete cascade,
  icon text not null default '❤️',
  is_preset boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create love_checklist_completions table (Completion status)
create table if not exists public.love_checklist_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.love_checklist_items(id) on delete cascade not null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at date not null default current_date,
  notes text,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create love_checklist_logs table (Activity audit logs for transparency)
create table if not exists public.love_checklist_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references auth.users(id) on delete set null,
  action_type text not null, -- 'create', 'update', 'delete', 'complete', 'uncomplete'
  item_name text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.love_checklist_categories enable row level security;
alter table public.love_checklist_items enable row level security;
alter table public.love_checklist_completions enable row level security;
alter table public.love_checklist_logs enable row level security;

-- RLS policies
create policy "Allow authenticated users full access to checklist_categories" 
on public.love_checklist_categories for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users full access to checklist_items" 
on public.love_checklist_items for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users full access to checklist_completions" 
on public.love_checklist_completions for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users full access to checklist_logs" 
on public.love_checklist_logs for all using (auth.role() = 'authenticated');

-- 5. Enable Realtime Replication
begin;
  -- Add to publication
  alter publication supabase_realtime add table public.love_checklist_categories;
  alter publication supabase_realtime add table public.love_checklist_items;
  alter publication supabase_realtime add table public.love_checklist_completions;
  alter publication supabase_realtime add table public.love_checklist_logs;
commit;
