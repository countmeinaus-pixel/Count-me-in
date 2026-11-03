create table if not exists public.activity_checkin_codes (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table if not exists public.activity_meetup_confirmations (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (activity_id, user_id),
  check (user_id <> partner_id)
);

create index if not exists idx_activity_meetup_confirmations_user
on public.activity_meetup_confirmations(user_id, confirmed_at desc);

alter table public.activity_checkin_codes enable row level security;
alter table public.activity_meetup_confirmations enable row level security;

drop policy if exists "Users can view their own activity check-in codes"
on public.activity_checkin_codes;
create policy "Users can view their own activity check-in codes"
on public.activity_checkin_codes for select
using (user_id = auth.uid());

drop policy if exists "Users can view their own meetup confirmations"
on public.activity_meetup_confirmations;
create policy "Users can view their own meetup confirmations"
on public.activity_meetup_confirmations for select
using (user_id = auth.uid());

revoke all on public.activity_checkin_codes from anon, authenticated;
grant select on public.activity_checkin_codes to authenticated;
revoke all on public.activity_meetup_confirmations from anon, authenticated;
grant select on public.activity_meetup_confirmations to authenticated;

create or replace function public.sync_activity_checkin_codes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  activity_host_id uuid;
begin
  if new.status <> 'accepted'
    or (tg_op = 'UPDATE' and old.status = 'accepted') then
    return new;
  end if;

  select host_id into activity_host_id
  from public.activities
  where id = new.activity_id;

  if activity_host_id is null then
    raise exception 'The activity for this check-in could not be found.';
  end if;

  insert into public.activity_checkin_codes (activity_id, user_id)
  values (new.activity_id, activity_host_id), (new.activity_id, new.user_id)
  on conflict (activity_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.sync_activity_checkin_codes() from public, anon, authenticated;
drop trigger if exists sync_activity_checkin_codes on public.activity_join_requests;
create trigger sync_activity_checkin_codes
after insert or update of status on public.activity_join_requests
for each row execute function public.sync_activity_checkin_codes();

insert into public.activity_checkin_codes (activity_id, user_id)
select activity_id, user_id
from (
  select a.id as activity_id, a.host_id as user_id
  from public.activities a
  where exists (
    select 1
    from public.activity_join_requests r
    where r.activity_id = a.id and r.status = 'accepted'
  )
  union
  select activity_id, user_id
  from public.activity_join_requests
  where status = 'accepted'
) accepted_members
on conflict (activity_id, user_id) do nothing;

create or replace function public.get_activity_checkin_code(target_activity_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  activity_host_id uuid;
  checkin_code uuid;
begin
  if viewer_id is null then
    raise exception 'Sign in before checking in to an activity.';
  end if;

  select host_id into activity_host_id
  from public.activities
  where id = target_activity_id;

  if activity_host_id is null then
    raise exception 'This activity could not be found.';
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

  insert into public.activity_checkin_codes (activity_id, user_id)
  values (target_activity_id, viewer_id)
  on conflict (activity_id, user_id) do nothing;

  select code into checkin_code
  from public.activity_checkin_codes
  where activity_id = target_activity_id and user_id = viewer_id;

  return checkin_code;
end;
$$;

revoke all on function public.get_activity_checkin_code(uuid) from public, anon;
grant execute on function public.get_activity_checkin_code(uuid) to authenticated;

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
  existing_partner_id uuid;
  confirmed_time timestamptz := now();
begin
  if viewer_id is null then
    raise exception 'Sign in before confirming a meetup.';
  end if;

  select host_id, starts_at
  into activity_host_id, activity_start
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;

  if (activity_start at time zone 'Australia/Adelaide')::date
    <> (now() at time zone 'Australia/Adelaide')::date then
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
