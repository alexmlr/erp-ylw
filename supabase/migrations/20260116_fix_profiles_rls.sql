-- Ensure Admins/Managers can update profiles
-- Drop existing restrictive policies if necessary (naming might vary, using comprehensive replacement)

-- Policy: Admin and Manager can update ANY profile
CREATE POLICY "Admins and Managers can update any profile" ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'manager')
        )
    );

-- Policy: Admin and Manager can insert permissions (if insert needed, usually handle by trigger on auth.users)
-- But primarily UPDATE is the key here.

-- Verify if column exists just in case
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions TEXT[] DEFAULT '{}';
    END IF;
END $$;
