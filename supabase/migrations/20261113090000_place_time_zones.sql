-- Time zones per place: the app now works anywhere in Australia.
-- "Is it the activity day?" (check-in) and the time in the "Activity cancelled"
-- message now use the time zone of the activity's place ("Cottesloe, WA" ->
-- Perth time) instead of always Adelaide time.
-- Keep public.place_time_zone() in step with src/lib/timeZones.ts.
-- Safe to run more than once.

create or replace function public.place_time_zone(place text)
returns text
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select case
    -- Broken Hill is in NSW but runs on South Australian time.
    when trim(coalesce(place, '')) ~* '^broken hill\M' then 'Australia/Adelaide'
    else case upper(substring(trim(coalesce(place, '')) from '(?i)[,\s](NSW|VIC|QLD|SA|WA|TAS|NT|ACT)$'))
      when 'NSW' then 'Australia/Sydney'
      when 'ACT' then 'Australia/Sydney'
      when 'VIC' then 'Australia/Melbourne'
      when 'QLD' then 'Australia/Brisbane'
      when 'WA' then 'Australia/Perth'
      when 'TAS' then 'Australia/Hobart'
      when 'NT' then 'Australia/Darwin'
      -- SA, and older places saved without a state.
      else 'Australia/Adelaide'
    end
  end
$$;

grant execute on function public.place_time_zone(text) to anon, authenticated;

create or replace function public.confirm_activity_meetup(
  target_activity_id uuid,
  scanned_code uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  scanned_user_id uuid;
  activity_host_id uuid;
  activity_start timestamptz;
  activity_zone text;
  existing_partner_id uuid;
  confirmed_time timestamptz := now();
begin
  if viewer_id is null then
    raise exception 'Sign in before confirming a meetup.';
  end if;

  select host_id, starts_at, public.place_time_zone(suburb)
  into activity_host_id, activity_start, activity_zone
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;

  if (activity_start at time zone activity_zone)::date
    <> (now() at time zone activity_zone)::date then
    raise exception 'Check-in is only available on the activity day.';
  end if;

  if viewer_id <> activity_host_id and not exists (
    select 1
    from public.activity_join_requests
    where activity_id = target_activity_id
      and user_id = viewer_id
      and status = 'accepted'
  ) then
    raise exception 'Only the host and accepted participants can check in.';
  end if;

  select user_id into scanned_user_id
  from public.activity_checkin_codes
  where activity_id = target_activity_id
    and code = scanned_code;

  if scanned_user_id is null or scanned_user_id = viewer_id then
    raise exception 'Scan another accepted participant''s code for this activity.';
  end if;

  if scanned_user_id <> activity_host_id and not exists (
    select 1
    from public.activity_join_requests
    where activity_id = target_activity_id
      and user_id = scanned_user_id
      and status = 'accepted'
  ) then
    raise exception 'That check-in code is not for an accepted participant.';
  end if;

  select partner_id into existing_partner_id
  from public.activity_meetup_confirmations
  where activity_id = target_activity_id and user_id = viewer_id;

  if existing_partner_id is not null then
    if existing_partner_id = scanned_user_id
      and exists (
        select 1
        from public.activity_meetup_confirmations
        where activity_id = target_activity_id
          and user_id = scanned_user_id
          and partner_id = viewer_id
      ) then
      return (
        select confirmed_at
        from public.activity_meetup_confirmations
        where activity_id = target_activity_id and user_id = viewer_id
      );
    end if;
    raise exception 'A meetup has already been confirmed for you for this activity.';
  end if;

  if exists (
    select 1
    from public.activity_meetup_confirmations
    where activity_id = target_activity_id and user_id = scanned_user_id
  ) then
    raise exception 'A meetup has already been confirmed for that participant.';
  end if;

  insert into public.activity_meetup_confirmations
    (activity_id, user_id, partner_id, confirmed_at)
  values
    (target_activity_id, viewer_id, scanned_user_id, confirmed_time),
    (target_activity_id, scanned_user_id, viewer_id, confirmed_time);

  return confirmed_time;
end;
$$;

revoke all on function public.confirm_activity_meetup(uuid, uuid) from public, anon;
grant execute on function public.confirm_activity_meetup(uuid, uuid) to authenticated;

create or replace function public.cancel_activity(
  target_activity_id uuid,
  cancel_message text default ''
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  activity_row public.activities%rowtype;
  host_name text;
  notified_count integer := 0;
  trimmed_message text := left(trim(coalesce(cancel_message, '')), 280);
begin
  if viewer_id is null then
    raise exception 'Sign in before cancelling an activity.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;
  if activity_row.host_id <> viewer_id and not public.has_admin_role() then
    raise exception 'Only the host can cancel this activity.';
  end if;
  if activity_row.starts_at <= now() then
    raise exception 'This activity has already started and can no longer be cancelled.';
  end if;

  select first_name into host_name
  from public.profiles
  where id = activity_row.host_id;

  insert into public.notifications (user_id, actor_id, activity_id, type, body, message)
  select
    member.user_id,
    viewer_id,
    target_activity_id,
    'activity_cancelled',
    left(
      coalesce(host_name, 'The host') || ' cancelled ' || activity_row.title || ' ('
        || to_char(activity_row.starts_at at time zone public.place_time_zone(activity_row.suburb), 'Dy DD Mon, HH12:MI AM')
        || ').',
      500
    ),
    trimmed_message
  from (
    select user_id
    from public.activity_join_requests
    where activity_id = target_activity_id
      and status in ('pending', 'accepted')
    union
    select invitee_id
    from public.activity_invites
    where activity_id = target_activity_id
      and status = 'pending'
  ) as member
  where member.user_id <> activity_row.host_id;

  get diagnostics notified_count = row_count;

  -- The chat thread has no foreign key to activities, so remove it here.
  delete from public.activity_chat_threads
  where activity_id = target_activity_id;

  delete from public.activities
  where id = target_activity_id;

  return notified_count;
end;
$$;

revoke all on function public.cancel_activity(uuid, text) from public, anon;
grant execute on function public.cancel_activity(uuid, text) to authenticated;
