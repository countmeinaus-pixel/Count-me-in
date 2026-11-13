-- Managing chats.
-- 1. The host (or an admin) can remove a member from an activity: he is no longer
--    going, leaves the group chat and gets a notification.
-- 2. The host can close the group chat (read-only for everyone) and open it again.
-- 3. The host can delete the group chat with all messages. The activity stays.
-- 4. Every member can remove a chat from his own Chats list (chat_hides). A group
--    chat comes back when there is a new message; a private chat is "deleted for
--    you": older messages stay hidden for you, the friend keeps his copy.
-- Safe to run more than once.

alter table public.activity_chat_threads add column if not exists closed_at timestamptz;
alter table public.activity_chat_threads add column if not exists closed_by uuid references public.profiles(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted',
    'activity_approved', 'activity_rejected', 'sport_suggested',
    'role_changed', 'profile_updated', 'staff_message', 'staff_message_reply',
    'staff_message_revoked', 'removed_from_activity'
  ));

-- No new messages in a closed group chat.
drop policy if exists "Accepted members can send chat messages" on public.activity_chat_messages;
create policy "Accepted members can send chat messages"
on public.activity_chat_messages for insert
with check (
  sender_id = auth.uid()
  and message_type = 'message'
  and public.is_activity_chat_member(thread_id)
  and not exists (
    select 1 from public.activity_chat_threads t
    where t.id = thread_id and t.closed_at is not null
  )
);

-- 1. Remove a member from the activity (host or admin).
create or replace function public.remove_activity_member(
  target_activity_id uuid,
  target_user_id uuid,
  reason text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  activity_row public.activities%rowtype;
  member_name text;
  chat_thread_id uuid;
  trimmed_reason text := left(trim(coalesce(reason, '')), 280);
begin
  select * into activity_row from public.activities where id = target_activity_id for update;
  if not found then
    raise exception 'This activity could not be found.';
  end if;
  if activity_row.host_id <> viewer_id and not public.has_admin_role() then
    raise exception 'Only the host can remove members.';
  end if;
  if target_user_id = activity_row.host_id then
    raise exception 'The host cannot be removed.';
  end if;

  update public.activity_join_requests
  set status = 'cancelled', updated_at = now()
  where activity_id = target_activity_id
    and user_id = target_user_id
    and status in ('accepted', 'pending');
  if not found then
    raise exception 'This member is not part of the activity.';
  end if;

  select first_name into member_name from public.profiles where id = target_user_id;

  select id into chat_thread_id from public.activity_chat_threads where activity_id = target_activity_id;
  if chat_thread_id is not null then
    update public.activity_chat_members
    set status = 'removed'
    where thread_id = chat_thread_id and user_id = target_user_id;

    insert into public.activity_chat_messages (thread_id, sender_id, body, message_type)
    values (chat_thread_id, viewer_id, coalesce(member_name, 'A member') || ' was removed by the host.', 'system');
  end if;

  insert into public.notifications (user_id, actor_id, activity_id, type, body, message)
  values (
    target_user_id,
    viewer_id,
    target_activity_id,
    'removed_from_activity',
    'You were removed from ' || activity_row.title || ' by the host.',
    trimmed_reason
  );
end;
$$;

-- 2. Close or reopen the group chat (host or admin).
create or replace function public.set_activity_chat_closed(target_thread_id uuid, closed boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  thread_row public.activity_chat_threads%rowtype;
  host_id uuid;
begin
  select * into thread_row from public.activity_chat_threads where id = target_thread_id for update;
  if not found then
    raise exception 'This chat could not be found.';
  end if;
  select a.host_id into host_id from public.activities a where a.id = thread_row.activity_id;
  if coalesce(host_id, thread_row.organiser_id) <> auth.uid() and not public.has_admin_role() then
    raise exception 'Only the host can close this chat.';
  end if;
  if (thread_row.closed_at is not null) = closed then
    return;
  end if;

  update public.activity_chat_threads
  set closed_at = case when closed then now() else null end,
      closed_by = case when closed then auth.uid() else null end,
      updated_at = now()
  where id = target_thread_id;

  insert into public.activity_chat_messages (thread_id, sender_id, body, message_type)
  values (
    target_thread_id,
    auth.uid(),
    case when closed then 'The host closed this chat.' else 'The host reopened this chat.' end,
    'system'
  );
end;
$$;

-- 3. Delete the group chat and all its messages (host or admin). The activity stays.
create or replace function public.delete_activity_chat(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  thread_row public.activity_chat_threads%rowtype;
  host_id uuid;
begin
  select * into thread_row from public.activity_chat_threads where id = target_thread_id for update;
  if not found then
    raise exception 'This chat could not be found.';
  end if;
  select a.host_id into host_id from public.activities a where a.id = thread_row.activity_id;
  if coalesce(host_id, thread_row.organiser_id) <> auth.uid() and not public.has_admin_role() then
    raise exception 'Only the host can delete this chat.';
  end if;

  delete from public.activity_chat_threads where id = target_thread_id;
end;
$$;

-- 4. Remove a chat from your own list.
create table if not exists public.chat_hides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chat_type text not null check (chat_type in ('activity', 'direct')),
  chat_id uuid not null,
  hidden_at timestamptz not null default now(),
  primary key (user_id, chat_type, chat_id)
);

alter table public.chat_hides enable row level security;

drop policy if exists "Members manage their own hidden chats" on public.chat_hides;
create policy "Members manage their own hidden chats"
on public.chat_hides for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.chat_hides from anon, authenticated;
grant select, insert, update, delete on public.chat_hides to authenticated;

-- When a group chat is created again after it was deleted, everyone going is added.
create or replace function public.sync_activity_group_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  activity_row public.activities%rowtype;
  chat_thread_id uuid;
  member_name text;
begin
  if new.status <> 'accepted'
    or (tg_op = 'UPDATE' and old.status = 'accepted') then
    return new;
  end if;

  select *
  into activity_row
  from public.activities
  where id = new.activity_id;

  if not found then
    raise exception 'The activity for this chat could not be found.';
  end if;

  insert into public.activity_chat_threads (activity_id, title, organiser_id)
  values (activity_row.id, activity_row.title, activity_row.host_id)
  on conflict (activity_id) do update
    set title = excluded.title,
        organiser_id = excluded.organiser_id,
        updated_at = now()
  returning id into chat_thread_id;

  insert into public.activity_chat_members (thread_id, user_id, status)
  values (chat_thread_id, activity_row.host_id, 'accepted')
  on conflict (thread_id, user_id) do update
    set status = 'accepted';

  insert into public.activity_chat_members (thread_id, user_id, status)
  values (chat_thread_id, new.user_id, 'accepted')
  on conflict (thread_id, user_id) do update
    set status = 'accepted';

  -- After the host deleted the chat, a new one starts: bring everyone who is going back in.
  insert into public.activity_chat_members (thread_id, user_id, status)
  select chat_thread_id, r.user_id, 'accepted'
  from public.activity_join_requests r
  where r.activity_id = activity_row.id and r.status = 'accepted'
  on conflict (thread_id, user_id) do nothing;

  if new.user_id <> activity_row.host_id then
    select first_name into member_name
    from public.profiles
    where id = new.user_id;

    insert into public.activity_chat_messages (thread_id, sender_id, body, message_type)
    values (
      chat_thread_id,
      new.user_id,
      coalesce(member_name, 'A member') || ' joined the activity.',
      'system'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_activity_group_chat_membership() from public, anon, authenticated;

revoke all on function public.remove_activity_member(uuid, uuid, text) from public, anon;
grant execute on function public.remove_activity_member(uuid, uuid, text) to authenticated;
revoke all on function public.set_activity_chat_closed(uuid, boolean) from public, anon;
grant execute on function public.set_activity_chat_closed(uuid, boolean) to authenticated;
revoke all on function public.delete_activity_chat(uuid) from public, anon;
grant execute on function public.delete_activity_chat(uuid) to authenticated;
