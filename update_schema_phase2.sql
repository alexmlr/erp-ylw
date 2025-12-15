-- Add permissions column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;

-- Add check constraint for roles (Optional but good for integrity)
-- Note: If you have existing data that violates this, update it first.
ALTER TABLE public.profiles 
ADD CONSTRAINT check_role_valid 
CHECK (role IN ('admin', 'manager', 'administrative', 'commercial', 'user'));

-- Policy updates (if needed) - ensuring admins/managers can update permissions
-- (Existing policies might already cover this if RLS allows 'update' for 'auth.uid() = id', but we need admins to update OTHERS)

-- Create a policy for Admins/Managers to update ANY profile
CREATE POLICY "Admins and Managers can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'manager')
    )
  );

-- Create a policy for Admins/Managers to select ANY profile (if not already public)
-- (Our existing policy "Public profiles are viewable by everyone" covers SELECT)
