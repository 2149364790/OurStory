-- 1. 创建回忆卡片点赞反应表
create table if not exists public.task_reactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'heart' (超级心动), 'hug' (贴贴抱抱), 'star' (期待下次), 'thumbsup' (Ta超棒)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, user_id, type)
);

alter table public.task_reactions enable row level security;

create policy "Allow authenticated users full access to task_reactions" on public.task_reactions
  for all using (auth.role() = 'authenticated');

-- 2. 创建回忆卡片留言表
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_comments enable row level security;

create policy "Allow authenticated users full access to task_comments" on public.task_comments
  for all using (auth.role() = 'authenticated');

-- 3. 将新表加入 Supabase 实时同步复制中
alter publication supabase_realtime add table public.task_reactions;
alter publication supabase_realtime add table public.task_comments;
