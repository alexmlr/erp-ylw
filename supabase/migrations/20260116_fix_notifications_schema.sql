-- Fix Notifications Table Schema to match Code

-- 1. Rename 'content' to 'message'
ALTER TABLE public.notifications RENAME COLUMN content TO message;

-- 2. Rename 'read' to 'is_read'
ALTER TABLE public.notifications RENAME COLUMN read TO is_read;

-- 3. Add 'type' column
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system';

-- 4. Add 'updated_at' if missing
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
