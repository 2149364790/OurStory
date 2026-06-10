-- 为 profiles 表增加 gender 字段（王子/公主角色选择）
-- 值只能为 'prince' 或 'princess'，允许 NULL（表示尚未选择）

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text
CHECK (gender IN ('prince', 'princess'));
