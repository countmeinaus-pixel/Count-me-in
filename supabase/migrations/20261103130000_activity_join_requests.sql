create table if not exists public.activity_join_requests (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_message text not null default '' check (char_length(request_message) <= 300),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists idx_activity_join_requests_capacity
on public.activity_join_requests(activity_id, status);
create index if not exists idx_activity_join_requests_user_status
on public.activity_join_requests(user_id, status, created_at desc);

alter table public.activity_join_requests enable row level security;

drop policy if exists "Users can view relevant activity join requests"
on public.activity_join_requests;
create policy "Users can view relevant activity join requests"
on public.activity_join_requests for select
using (
  (
    user_id = auth.uid()
    or status = 'accepted'
    or exists (
      select 1
      from public.activities
      where activities.id = activity_join_requests.activity_id
        and activities.host_id = auth.uid()
    )
  )
  and not public.is_blocked_from_current_user(user_id)
);

create or replace function public.request_to_join_activity(
  target_activity_id uuid,
  request_message text default ''
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  requester uuid := auth.uid();
  activity_row public.activities%rowtype;
  existing_status text;
  accepted_count integer;
  next_status text;
begin
  if requester is null then
    raise exception 'Sign in before requesting to join an activity.';
  end if;

  if char_length(coalesce(request_message, '')) > 300 then
    raise exception 'Your message must be 300 characters or fewer.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;
  if activity_row.host_id = requester then
    raise exception 'You cannot request to join your own activity.';
  end if;
  if activity_row.starts_at <= now() then
    raise exception 'This activity has already started.';
  end if;
  if public.is_blocked_from_current_user(activity_row.host_id) then
    raise exception 'You cannot join this activity.';
  end if;

  select status
  into existing_status
  from public.activity_join_requests
  where activity_id = target_activity_id
    and user_id = requester
  for update;

  if existing_status in ('pending', 'accepted') then
    return existing_status;
  end if;

  select count(*)
  into accepted_count
  from public.activity_join_requests
  where activity_id = target_activity_id
    and status = 'accepted';

  if accepted_count >= activity_row.spots_total then
    raise exception 'This activity is full.';
  end if;

  next_status := case when activity_row.auto_accept then 'accepted' else 'pending' end;

  insert into public.activity_join_requests (
    activity_id,
    user_id,
    request_message,
    status
  )
  values (
    target_activity_id,
    requester,
    coalesce(request_message, ''),
    next_status
  )
  on conflict (activity_id, user_id) do update
  set request_message = excluded.request_message,
      status = excluded.status,
      created_at = now(),
      updated_at = now();

  return next_status;
end;
$$;

create or replace function public.respond_to_activity_join_request(
  target_activity_id uuid,
  target_user_id uuid,
  response text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  activity_row public.activities%rowtype;
  request_row public.activity_join_requests%rowtype;
  accepted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in before managing join requests.';
  end if;
  if response is null or response not in ('accepted', 'declined') then
    raise exception 'Choose accept or decline.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found or activity_row.host_id <> auth.uid() then
    raise exception 'Only the activity host can manage join requests.';
  end if;

  select *
  into request_row
  from public.activity_join_requests
  where activity_id = target_activity_id
    and user_id = target_user_id
  for update;

  if not found or request_row.status <> 'pending' then
    raise exception 'This join request is no longer pending.';
  end if;

  if response = 'accepted' then
    if public.is_blocked_from_current_user(target_user_id) then
      raise exception 'You cannot accept this member.';
    end if;

    select count(*)
    into accepted_count
    from public.activity_join_requests
    where activity_id = target_activity_id
      and status = 'accepted';

    if accepted_count >= activity_row.spots_total then
      raise exception 'This activity is full.';
    end if;
  end if;

  update public.activity_join_requests
  set status = response,
      updated_at = now()
  where activity_id = target_activity_id
    and user_id = target_user_id;

  return response;
end;
$$;

create or replace function public.cancel_activity_join_request(
  target_activity_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before cancelling a join request.';
  end if;

  update public.activity_join_requests
  set status = 'cancelled',
      updated_at = now()
  where activity_id = target_activity_id
    and user_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'There is no pending request to cancel.';
  end if;
end;
$$;

revoke all on public.activity_join_requests from anon, authenticated;
grant select on public.activity_join_requests to authenticated;

revoke all on function public.request_to_join_activity(uuid, text)
from public, anon;
grant execute on function public.request_to_join_activity(uuid, text)
to authenticated;

revoke all on function public.respond_to_activity_join_request(uuid, uuid, text)
from public, anon;
grant execute on function public.respond_to_activity_join_request(uuid, uuid, text)
to authenticated;

revoke all on function public.cancel_activity_join_request(uuid)
from public, anon;
grant execute on function public.cancel_activity_join_request(uuid)
to authenticated;
