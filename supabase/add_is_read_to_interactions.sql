-- SQL Migration to support read status for interactions (delayed love cards)
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false not null;
