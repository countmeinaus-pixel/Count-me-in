alter table public.profiles
add column if not exists date_of_birth date;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view profile photos" on storage.objects;
drop policy if exists "Users can upload their own profile photos" on storage.objects;
drop policy if exists "Users can update their own profile photos" on storage.objects;
drop policy if exists "Users can delete their own profile photos" on storage.objects;

create policy "Anyone can view profile photos"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own profile photos"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own profile photos"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own profile photos"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
