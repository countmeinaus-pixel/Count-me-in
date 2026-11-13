-- Fix for SQL 20/21: saving a member's profile failed with
-- "malformed array literal" (Postgres read 'username' as an array, not a word).
-- The list of changes is now built with array_append. Nothing else changes.
-- Safe to run more than once.

create or replace function public.admin_update_profile(
  target_user_id uuid,
  new_first_name text,
  new_date_of_birth date,
  new_suburb text,
  new_bio text,
  remove_photo boolean default false,
  note text default '',
  new_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  old_row public.profiles%rowtype;
  new_age integer;
  changes text[] := array[]::text[];
begin
  if not public.has_admin_role() then
    raise exception 'Only admins can edit member profiles.';
  end if;

  select * into old_row from public.profiles where id = target_user_id for update;
  if not found then
    raise exception 'This member no longer exists.';
  end if;

  new_first_name := trim(coalesce(new_first_name, ''));
  new_suburb := trim(coalesce(new_suburb, ''));
  new_bio := trim(coalesce(new_bio, ''));
  new_photo_url := nullif(trim(coalesce(new_photo_url, '')), '');
  if char_length(new_first_name) not between 1 and 40 then
    raise exception 'Username must be between 1 and 40 characters.';
  end if;
  if char_length(new_suburb) not between 1 and 100 then
    raise exception 'Location must be between 1 and 100 characters.';
  end if;
  if char_length(new_bio) > 150 then
    raise exception 'Bio can be at most 150 characters.';
  end if;
  new_age := extract(year from age(current_date, new_date_of_birth))::integer;
  if new_date_of_birth is null or new_age < 18 or new_age > 99 then
    raise exception 'Enter a valid date of birth (18 or older).';
  end if;
  -- A new photo must be one uploaded into this member's own folder.
  if new_photo_url is not null
    and position('/storage/v1/object/public/avatars/' || target_user_id::text || '/' in new_photo_url) = 0 then
    raise exception 'That photo does not belong to this member.';
  end if;

  if new_first_name is distinct from old_row.first_name then changes := array_append(changes, 'username'); end if;
  if new_date_of_birth is distinct from old_row.date_of_birth then changes := array_append(changes, 'date of birth'); end if;
  if new_suburb is distinct from old_row.suburb then changes := array_append(changes, 'location'); end if;
  if new_bio is distinct from coalesce(old_row.bio, '') then changes := array_append(changes, 'bio'); end if;
  if new_photo_url is not null then
    changes := array_append(changes, 'new photo');
  elsif remove_photo and old_row.photo_url is not null then
    changes := array_append(changes, 'photo removed');
  end if;

  if array_length(changes, 1) is null then
    return;
  end if;

  update public.profiles
  set first_name = new_first_name,
      date_of_birth = new_date_of_birth,
      age = new_age,
      suburb = new_suburb,
      bio = new_bio,
      photo_url = case
        when new_photo_url is not null then new_photo_url
        when remove_photo then null
        else photo_url
      end,
      updated_at = now()
  where id = target_user_id;

  insert into public.notifications (user_id, actor_id, type, body, message)
  values (
    target_user_id,
    auth.uid(),
    'profile_updated',
    left('An admin updated your profile: ' || array_to_string(changes, ', ') || '.', 500),
    left(trim(coalesce(note, '')), 280)
  );
end;
$$;

revoke all on function public.admin_update_profile(uuid, text, date, text, text, boolean, text, text) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, date, text, text, boolean, text, text) to authenticated;
