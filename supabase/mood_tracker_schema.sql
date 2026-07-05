-- 创建心情与日志记录表
create table if not exists public.mood_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null, -- 记录创建人
  log_date date not null,
  
  -- 我的情绪
  my_mood varchar(50) not null,         -- 'happy' | 'neutral' | 'sad' | 'angry' | 'anxious'
  my_score integer not null,            -- 分数 (1-5)
  
  -- 观察到的伴侣情绪
  partner_mood varchar(50) not null,    -- 'happy' | 'neutral' | 'sad' | 'angry' | 'anxious'
  partner_score integer not null,       -- 伴侣情绪分数 (1-5)
  
  -- 心情日志 (苹果备忘录风格)
  diary_title varchar(255),             
  diary_content text,                   
  diary_color varchar(50) default 'vanilla',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, log_date)
);

-- 启用安全策略 (RLS)
alter table public.mood_logs enable row level security;

-- 策略：各自独立完全私密，仅能增删改查自己的数据
create policy "Allow individuals to read own logs"
  on public.mood_logs for select
  using (auth.uid() = user_id);

create policy "Allow individuals to insert own logs"
  on public.mood_logs for insert
  with check (auth.uid() = user_id);

create policy "Allow individuals to update own logs"
  on public.mood_logs for update
  using (auth.uid() = user_id);

create policy "Allow individuals to delete own logs"
  on public.mood_logs for delete
  using (auth.uid() = user_id);

-- 添加实时数据推送监听
alter publication supabase_realtime add table public.mood_logs;
