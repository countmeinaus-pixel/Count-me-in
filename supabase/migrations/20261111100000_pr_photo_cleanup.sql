-- Proof photos are only needed until a personal record is verified.
-- After that the owner or a moderator removes the photo to save storage.

alter table public.personal_records
  alter column photo_url drop not null,
  alter column photo_path drop not null;

-- Clears the photo fields of a verified record and returns the old storage
-- path, so the app can delete the file from the pr-proofs bucket.
create or replace function public.clear_verified_record_photo(target_record_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  record_row public.personal_records%rowtype;
begin
  select * into record_row
  from public.personal_records
  where id = target_record_id
  for update;

  if not found then
    raise exception 'This record could not be found.';
  end if;
  if record_row.user_id <> auth.uid() and not public.has_staff_role() then
    raise exception 'Only the owner or a moderator can remove this photo.';
  end if;
  if record_row.confirm_count < 3 and record_row.staff_verified_at is null then
    raise exception 'The proof photo is kept until the record is verified.';
  end if;

  update public.personal_records
  set photo_url = null,
      photo_path = null
  where id = target_record_id;

  return record_row.photo_path;
end;
$$;

revoke all on function public.clear_verified_record_photo(uuid) from public, anon;
grant execute on function public.clear_verified_record_photo(uuid) to authenticated;
