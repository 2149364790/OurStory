-- SQL Migration to support media files in checklist completions
ALTER TABLE public.love_checklist_completions ADD COLUMN IF NOT EXISTS media text[] DEFAULT '{}';
