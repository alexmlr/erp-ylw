-- Drop the existing foreign key to auth.users
ALTER TABLE public.requisitions
  DROP CONSTRAINT IF EXISTS requisitions_requester_id_fkey;

-- Add new foreign key to public.profiles
ALTER TABLE public.requisitions
  ADD CONSTRAINT requisitions_requester_id_fkey
  FOREIGN KEY (requester_id)
  REFERENCES public.profiles(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
