-- Notifications, leaving an activity ("Can't make it") and answering invitations.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_id uuid references public.activities(id) on delete cascade,
  type text not null check (type in ('participant_left', 'invite', 'invite_accepted', 'invite_declined')),
  body text not null check (char_length(body) between 1 and 500),
  message text not null default '' check (char_length(message) <= 280),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
on public.notifications for select
using (user_id = auth.uid());

-- Rows are only written by the security definer functions below.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

-- Marks one notification read, or all of them when no id is given.
create or replace function public.mark_notifications_read(target_notification_id uuid default null)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (target_notification_id is null or id = target_notification_id);
$$;

revoke all on function public.mark_notifications_read(uuid) from public, anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

-- Can't make it: an accepted participant leaves before the activity starts.
create or replace function public.leave_activity(
  target_activity_id uuid,
  leave_message text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  activity_row public.activities%rowtype;
  viewer_name text;
  chat_thread_id uuid;
  trimmed_message text := left(trim(coalesce(leave_message, '')), 280);
begin
  if viewer_id is null then
    raise exception 'Sign in before leaving an activity.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;
  if activity_row.host_id = viewer_id then
    raise exception 'Hosts cannot leave their own activity.';
  end if;
  if activity_row.starts_at <= now() then
    raise exception 'This activity has already started.';
  end if;

  update public.activity_join_requests
  set status = 'cancelled',
      updated_at = now()
  where activity_id = target_activity_id
    and user_id = viewer_id
    and status = 'accepted';

  if not found then
    raise exception 'You are not going to this activity.';
  end if;

  select first_name into viewer_name
  from public.profiles
  where id = viewer_id;

  select id into chat_thread_id
  from public.activity_chat_threads
  where activity_id = target_activity_id;

  if chat_thread_id is not null then
    update public.activity_chat_members
    set status = 'removed'
    where thread_id = chat_thread_id and user_id = viewer_id;

    insert into public.activity_chat_messages (thread_id, sender_id, body, message_type)
    values (
      chat_thread_id,
      viewer_id,
      coalesce(viewer_name, 'A member') || ' can''t make it anymore.',
      'system'
    );
  end if;

  insert into public.notifications (user_id, actor_id, activity_id, type, body, message)
  values (
    activity_row.host_id,
    viewer_id,
    target_activity_id,
    'participant_left',
    coalesce(viewer_name, 'A member') || ' can''t make it to ' || activity_row.title || '.',
    trimmed_message
  );
end;
$$;

revoke all on function public.leave_activity(uuid, text) from public, anon;
grant execute on function public.leave_activity(uuid, text) to authenticated;

-- A new invitation notifies the invitee.
create or replace function public.notify_activity_invite()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  inviter_name text;
  activity_title text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select first_name into inviter_name from public.profiles where id = new.invited_by;
  select title into activity_title from public.activities where id = new.activity_id;

  insert into public.notifications (user_id, actor_id, activity_id, type, body)
  values (
    new.invitee_id,
    new.invited_by,
    new.activity_id,
    'invite',
    coalesce(inviter_name, 'Someone') || ' invited you to ' || coalesce(activity_title, 'an activity') || '.'
  );

  return new;
end;
$$;

revoke all on function public.notify_activity_invite() from public, anon, authenticated;
drop trigger if exists notify_activity_invite on public.activity_invites;
create trigger notify_activity_invite
after insert on public.activity_invites
for each row execute function public.notify_activity_invite();

-- Count me in / Not this time on an invitation.
create or replace function public.respond_to_activity_invite(
  target_activity_id uuid,
  response text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  invite_row public.activity_invites%rowtype;
  activity_row public.activities%rowtype;
  viewer_name text;
  accepted_count integer;
begin
  if viewer_id is null then
    raise exception 'Sign in before answering an invitation.';
  end if;
  if response is null or response not in ('accepted', 'declined') then
    raise exception 'Choose Count me in or Not this time.';
  end if;

  select *
  into activity_row
  from public.activities
  where id = target_activity_id
  for update;

  if not found then
    raise exception 'This activity could not be found.';
  end if;

  select *
  into invite_row
  from public.activity_invites
  where activity_id = target_activity_id
    and invitee_id = viewer_id
  for update;

  if not found or invite_row.status <> 'pending' then
    raise exception 'This invitation is no longer open.';
  end if;

  if response = 'accepted' then
    if activity_row.starts_at <= now() then
      raise exception 'This activity has already started.';
    end if;
    if public.is_blocked_from_current_user(activity_row.host_id) then
      raise exception 'You cannot join this activity.';
    end if;

    select count(*)
    into accepted_count
    from public.activity_join_requests
    where activity_id = target_activity_id
      and status = 'accepted'
      and user_id <> viewer_id;

    if accepted_count >= activity_row.spots_total then
      raise exception 'This activity is full.';
    end if;

    -- The host invited this member, so the spot is confirmed straight away.
    insert into public.activity_join_requests (activity_id, user_id, request_message, status)
    values (target_activity_id, viewer_id, '', 'accepted')
    on conflict (activity_id, user_id) do update
    set status = 'accepted',
        updated_at = now();
  end if;

  update public.activity_invites
  set status = response
  where activity_id = target_activity_id
    and invitee_id = viewer_id;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = viewer_id
    and activity_id = target_activity_id
    and type = 'invite';

  select first_name into viewer_name from public.profiles where id = viewer_id;

  insert into public.notifications (user_id, actor_id, activity_id, type, body)
  values (
    invite_row.invited_by,
    viewer_id,
    target_activity_id,
    case when response = 'accepted' then 'invite_accepted' else 'invite_declined' end,
    coalesce(viewer_name, 'A member')
      || case when response = 'accepted' then ' is in for ' else ' can''t make ' end
      || activity_row.title || '.'
  );

  return response;
end;
$$;

revoke all on function public.respond_to_activity_invite(uuid, text) from public, anon;
grant execute on function public.respond_to_activity_invite(uuid, text) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
