-- ========================================================
-- Add Table for Promise & Communication Day Daily Logs
-- ========================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL, -- 'unhappy' (摩擦委屈), 'agenda' (下期议题), 'reflection' (自我反思)
  content text NOT NULL, -- 详细记录内容
  reflection_action text, -- 针对 'reflection' 分类：改正与反思的具体行动
  is_private boolean DEFAULT false NOT NULL, -- 沟通日前是否对伴侣隐藏 (避免平时文字即时冲突)
  status text DEFAULT 'pending' NOT NULL, -- 'pending' (待沟通), 'discussed' (已沟通)
  review_id uuid REFERENCES public.monthly_reviews(id) ON DELETE SET NULL, -- 关联的沟通日会话记录
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 启用 Row Level Security (RLS)
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- 允许认证用户对所有数据进行读写
CREATE POLICY "Allow authenticated users full access to communication_logs" 
  ON public.communication_logs FOR ALL USING (auth.role() = 'authenticated');

-- 将该表添加到 Supabase Realtime 复制通道以支持实时更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
