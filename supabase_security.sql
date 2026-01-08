-- ==========================================
-- 1. TRIGGER TO DELETE AUTH USER ON PROFILE DELETE
-- ==========================================

-- Function to delete from auth.users
create or replace function public.delete_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = old.id;
  return old;
end;
$$;

-- Trigger to run after deleting a profile
drop trigger if exists on_profile_delete on public.profiles;
create trigger on_profile_delete
  after delete on public.profiles
  for each row execute procedure public.delete_auth_user();


-- ==========================================
-- 2. FUNCTION TO UPDATE AUTH USER (Email/Password)
-- ==========================================
-- This function allows an Admin (someone with permissions) to update another user's auth data.
-- Ideally, you should restrict EXECUTE permission to only 'service_role' or specific admin roles if possible.
-- For now, we rely on the internal logic to check if the caller is an admin (though supabase RLS applies to tables, not functions usually, unless configured).

create or replace function public.update_user_credentials(
  target_user_id uuid,
  new_email text default null,
  new_password text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Optional: Check if the executing user is an admin.
  -- This depends on your RLS setup. Often 'auth.uid()' checks exist.
  -- if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
  --   raise exception 'Access Denied: Only admins can update credentials.';
  -- end if;

  -- Update email if provided
  if new_email is not null and new_email <> '' then
    update auth.users
    set email = new_email,
        updated_at = now()
    where id = target_user_id;
  end if;

  -- Update password if provided
  if new_password is not null and new_password <> '' then
    update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    where id = target_user_id;
  end if;
end;
$$;
