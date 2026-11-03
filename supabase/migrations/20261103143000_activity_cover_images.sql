insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-covers', 'activity-covers', true, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view activity covers" on storage.objects;
drop policy if exists "Users can upload their own activity covers" on storage.objects;
drop policy if exists "Users can delete their own activity covers" on storage.objects;

create policy "Anyone can view activity covers"
on storage.objects for select
using (bucket_id = 'activity-covers');

create policy "Users can upload their own activity covers"
on storage.objects for insert
with check (
  bucket_id = 'activity-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own activity covers"
on storage.objects for delete
using (
  bucket_id = 'activity-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);
