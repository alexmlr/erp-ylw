-- Add permissions column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Update RLS policies if necessary (usually not needed for just adding a column if generic policies exist, but good practice)
-- Existing policies on profiles usually allow update for self or admin.
