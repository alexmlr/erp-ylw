-- 1. Create Buckets
insert into storage.buckets (id, name, public) 
values 
  ('products', 'products', true),
  ('library', 'library', true)
on conflict (id) do nothing;

-- 2. Policies for 'products' bucket
create policy "Public Access to Products"
on storage.objects for select
using ( bucket_id = 'products' );

create policy "Authenticated Users can Upload Products"
on storage.objects for insert
with check ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Authenticated Users can Update Products"
on storage.objects for update
using ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Authenticated Users can Delete Products"
on storage.objects for delete
using ( bucket_id = 'products' and auth.role() = 'authenticated' );

-- 3. Policies for 'library' bucket
create policy "Public Access to Library"
on storage.objects for select
using ( bucket_id = 'library' );

create policy "Authenticated Users can Upload Library"
on storage.objects for insert
with check ( bucket_id = 'library' and auth.role() = 'authenticated' );

create policy "Authenticated Users can Update Library"
on storage.objects for update
using ( bucket_id = 'library' and auth.role() = 'authenticated' );

create policy "Authenticated Users can Delete Library"
on storage.objects for delete
using ( bucket_id = 'library' and auth.role() = 'authenticated' );
