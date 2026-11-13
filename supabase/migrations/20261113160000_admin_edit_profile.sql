-- Admins can fix a member's profile to help with issues (username, date of
-- birth, suburb, bio, remove the photo). Only through these functions, only for
-- admins, and the member always gets a notification saying what was changed.
-- Safe to run more than once.

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted',
    'activity_approved', 'activity_rejected', 'sport_suggested',
    'role_changed', 'profile_updated'
  ));

-- The profile as the member filled it in (including date of birth), for the admin form.
create or replace function public.admin_get_profile(target_user_id uuid)
returns table (
  id uuid,
  email text,
  first_name text,
  date_of_birth date,
  suburb text,
  bio text,
  photo_url text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.has_admin_role() then
    raise exception 'Only admins can edit member profiles.';
  end if;
  return query
  select p.id, p.email, p.first_name, p.date_of_birth, p.suburb, coalesce(p.bio, ''), p.photo_url
  from public.profiles p
  where p.id = target_user_id;
end;
$$;

create or replace function public.admin_update_profile(
  target_user_id uuid,
  new_first_name text,
  new_date_of_birth date,
  new_suburb text,
  new_bio text,
  remove_photo boolean default false,
  note text default ''
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

  if new_first_name is distinct from old_row.first_name then changes := changes || 'username'; end if;
  if new_date_of_birth is distinct from old_row.date_of_birth then changes := changes || 'date of birth'; end if;
  if new_suburb is distinct from old_row.suburb then changes := changes || 'location'; end if;
  if new_bio is distinct from coalesce(old_row.bio, '') then changes := changes || 'bio'; end if;
  if remove_photo and old_row.photo_url is not null then changes := changes || 'photo removed'; end if;

  if array_length(changes, 1) is null then
    return;
  end if;

  update public.profiles
  set first_name = new_first_name,
      date_of_birth = new_date_of_birth,
      age = new_age,
      suburb = new_suburb,
      bio = new_bio,
      photo_url = case when remove_photo then null else photo_url end,
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

revoke all on function public.admin_get_profile(uuid) from public, anon;
grant execute on function public.admin_get_profile(uuid) to authenticated;
revoke all on function public.admin_update_profile(uuid, text, date, text, text, boolean, text) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, date, text, text, boolean, text) to authenticated;
