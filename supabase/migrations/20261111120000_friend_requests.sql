-- Friendships: one member sends a request, the other accepts or declines.
-- Accepted friendships are visible to every signed-in member (they show on
-- profiles); pending and declined requests only to the two members.
-- All changes go through the functions below.

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One row per pair of members, whoever asked first.
create unique index if not exists idx_friend_requests_pair
on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists idx_friend_requests_addressee
on public.friend_requests (addressee_id, status);

alter table public.friend_requests enable row level security;

drop policy if exists "Members can view friendships and their own requests" on public.friend_requests;
create policy "Members can view friendships and their own requests"
on public.friend_requests for select
using (
  auth.uid() is not null
  and (status = 'accepted' or requester_id = auth.uid() or addressee_id = auth.uid())
);

revoke all on public.friend_requests from anon, authenticated;
grant select on public.friend_requests to authenticated;

alter table public.notifications
  add column if not exists friend_request_id uuid references public.friend_requests(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted'
  ));

-- Add friend. If the other member already asked you, this accepts it.
create or replace function public.send_friend_request(target_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  existing public.friend_requests%rowtype;
  viewer_name text;
  new_id uuid;
begin
  if viewer_id is null then
    raise exception 'Sign in before adding friends.';
  end if;
  if target_profile_id = viewer_id then
    raise exception 'You cannot add yourself as a friend.';
  end if;
  if public.is_blocked_from_current_user(target_profile_id) then
    raise exception 'You cannot add this member as a friend.';
  end if;

  select * into existing
  from public.friend_requests
  where least(requester_id, addressee_id) = least(viewer_id, target_profile_id)
    and greatest(requester_id, addressee_id) = greatest(viewer_id, target_profile_id)
  for update;

  select first_name into viewer_name from public.profiles where id = viewer_id;

  if found then
    if existing.status = 'accepted' then
      return 'accepted';
    end if;
    if existing.status = 'pending' and existing.addressee_id = viewer_id then
      -- They asked first: accept.
      update public.friend_requests
      set status = 'accepted', responded_at = now()
      where id = existing.id;
      insert into public.notifications (user_id, actor_id, friend_request_id, type, body)
      values (existing.requester_id, viewer_id, existing.id, 'friend_accepted',
        coalesce(viewer_name, 'A member') || ' accepted your friend request.');
      update public.notifications
      set read_at = coalesce(read_at, now())
      where user_id = viewer_id and friend_request_id = existing.id and type = 'friend_request';
      return 'accepted';
    end if;
    if existing.status = 'pending' then
      return 'pending';
    end if;
    -- Declined before: ask again as a new request.
    delete from public.friend_requests where id = existing.id;
  end if;

  insert into public.friend_requests (requester_id, addressee_id)
  values (viewer_id, target_profile_id)
  returning id into new_id;

  insert into public.notifications (user_id, actor_id, friend_request_id, type, body)
  values (target_profile_id, viewer_id, new_id, 'friend_request',
    coalesce(viewer_name, 'A member') || ' wants to be friends.');

  return 'pending';
end;
$$;

-- Accept or decline a request sent to you.
create or replace function public.respond_to_friend_request(target_request_id uuid, accept boolean)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  request_row public.friend_requests%rowtype;
  viewer_name text;
begin
  select * into request_row
  from public.friend_requests
  where id = target_request_id
  for update;

  if not found or request_row.addressee_id <> viewer_id or request_row.status <> 'pending' then
    raise exception 'This friend request is no longer open.';
  end if;

  update public.friend_requests
  set status = case when accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = target_request_id;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = viewer_id and friend_request_id = target_request_id and type = 'friend_request';

  if accept then
    select first_name into viewer_name from public.profiles where id = viewer_id;
    insert into public.notifications (user_id, actor_id, friend_request_id, type, body)
    values (request_row.requester_id, viewer_id, target_request_id, 'friend_accepted',
      coalesce(viewer_name, 'A member') || ' accepted your friend request.');
    return 'accepted';
  end if;
  return 'declined';
end;
$$;

-- Cancel your own pending request, or remove a friend.
create or replace function public.remove_friend(target_profile_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  delete from public.friend_requests
  where least(requester_id, addressee_id) = least(auth.uid(), target_profile_id)
    and greatest(requester_id, addressee_id) = greatest(auth.uid(), target_profile_id)
    and (status = 'accepted' or requester_id = auth.uid());
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
