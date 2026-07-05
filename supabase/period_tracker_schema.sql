-- 生理期记录与观察表初始化脚本
-- 您可在 Supabase 控制台的 SQL Editor 中一键复制并运行：

-- 1. 生理期记录表（由男生为女生记录，或者未来双向扩展）
create table if not exists public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,   -- 被记录的女生 profile_id (公主)
  recorded_by uuid references public.profiles(id) on delete cascade not null, -- 记录人 (王子)
  start_date date not null,                                                 -- 经期开始日期
  end_date date,                                                            -- 经期结束日期 (未结束时为空)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 经期日常身体与情绪观察记录表 (前驱特征)
create table if not exists public.period_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,   -- 对应的女生 profile_id
  recorded_by uuid references public.profiles(id) on delete cascade not null, -- 记录人
  log_date date not null default current_date,                              -- 观察日期
  symptoms text[] not null default '{}'::text[],                            -- 症状标签（如：腰酸、长痘、情绪低落、想吃甜食）
  notes text,                                                               -- 男生的私人备注
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_obs_date unique (user_id, log_date)                      -- 每天只能有一条观察记录
);

-- 启用安全策略 (RLS)
alter table public.period_logs enable row level security;
alter table public.period_observations enable row level security;

-- 允许认证用户对这两个表进行所有操作
create policy "Allow auth users full access to period_logs"
  on public.period_logs for all using (auth.role() = 'authenticated');

create policy "Allow auth users full access to period_observations"
  on public.period_observations for all using (auth.role() = 'authenticated');

-- 注册实时订阅 (Realtime)
alter publication supabase_realtime add table public.period_logs;
alter publication supabase_realtime add table public.period_observations;
