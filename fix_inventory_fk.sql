-- Migration to fix the foreign key relationship for inventory_movements

-- 1. Drop the existing foreign key constraint (referencing auth.users)
ALTER TABLE public.inventory_movements 
DROP CONSTRAINT IF EXISTS inventory_movements_user_id_fkey;

-- 2. Add the new foreign key constraint (referencing public.profiles)
-- This enables PostgREST to detect the relationship between inventory_movements and profiles
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT inventory_movements_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id);
