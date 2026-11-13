-- Private 1-on-1 chats between friends (text only).
-- 1. direct_chats: one chat per pair of members (user_low < user_high).
-- 2. direct_messages: the messages.
-- 3. direct_chat_reads: when each member last read the chat (unread counts).
-- Only friends (accepted friend request) can start a chat or send messages, and
-- not when one of them blocked the other. Old messages stay readable for both.
-- Safe to run more than once.

create table if not exists public.direct_chats (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_low < user_high),
  unique (user_low, user_high)
);
create index if not exists idx_direct_chats_high on public.direct_chats(user_high);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.direct_chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_direct_messages_chat on public.direct_messages(chat_id, created_at desc);

create table if not exists public.direct_chat_reads (
  chat_id uuid not null references public.direct_chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- True when the two members are friends.
create or replace function public.are_friends(first_id uuid, second_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.friend_requests
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(first_id, second_id)
      and greatest(requester_id, addressee_id) = greatest(first_id, second_id)
  );
$$;

-- True when the signed-in member is one of the two in this chat.
create or replace function public.is_direct_chat_member(target_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.direct_chats
    where id = target_chat_id
      and auth.uid() in (user_low, user_high)
  );
$$;

-- True when the signed-in member may send in this chat: still friends, no block.
create or replace function public.can_send_direct_message(target_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.direct_chats chat
    where chat.id = target_chat_id
      and auth.uid() in (chat.user_low, chat.user_high)
      and public.are_friends(chat.user_low, chat.user_high)
      and not exists (
        select 1
        from public.blocked_users block
        where (block.blocker_id = chat.user_low and block.blocked_user_id = chat.user_high)
           or (block.blocker_id = chat.user_high and block.blocked_user_id = chat.user_low)
      )
  );
$$;

-- Opens (or creates) the chat with a friend and returns its id.
create or replace function public.open_direct_chat(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  viewer_id uuid := auth.uid();
  chat_id uuid;
begin
  if viewer_id is null then
    raise exception 'Sign in before sending a message.';
  end if;
  if target_profile_id is null or target_profile_id = viewer_id then
    raise exception 'Choose a friend to message.';
  end if;
  if not public.are_friends(viewer_id, target_profile_id) then
    raise exception 'You can only message friends.';
  end if;
  if public.is_blocked_from_current_user(target_profile_id) then
    raise exception 'You can''t message this member.';
  end if;

  insert into public.direct_chats (user_low, user_high)
  values (least(viewer_id, target_profile_id), greatest(viewer_id, target_profile_id))
  on conflict (user_low, user_high) do nothing;

  select id into chat_id
  from public.direct_chats
  where user_low = least(viewer_id, target_profile_id)
    and user_high = greatest(viewer_id, target_profile_id);

  return chat_id;
end;
$$;

-- Keeps last_message_at up to date for sorting the chat list.
create or replace function public.touch_direct_chat()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.direct_chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists direct_messages_touch_chat on public.direct_messages;
create trigger direct_messages_touch_chat
after insert on public.direct_messages
for each row execute function public.touch_direct_chat();

alter table public.direct_chats enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_chat_reads enable row level security;

drop policy if exists "Members see their own direct chats" on public.direct_chats;
create policy "Members see their own direct chats"
on public.direct_chats for select
using (auth.uid() in (user_low, user_high));

drop policy if exists "Members read messages in their direct chats" on public.direct_messages;
create policy "Members read messages in their direct chats"
on public.direct_messages for select
using (public.is_direct_chat_member(chat_id));

drop policy if exists "Friends send messages in their direct chats" on public.direct_messages;
create policy "Friends send messages in their direct chats"
on public.direct_messages for insert
with check (sender_id = auth.uid() and public.can_send_direct_message(chat_id));

drop policy if exists "Members see their own direct chat read markers" on public.direct_chat_reads;
create policy "Members see their own direct chat read markers"
on public.direct_chat_reads for select
using (user_id = auth.uid() and public.is_direct_chat_member(chat_id));

drop policy if exists "Members add their own direct chat read markers" on public.direct_chat_reads;
create policy "Members add their own direct chat read markers"
on public.direct_chat_reads for insert
with check (user_id = auth.uid() and public.is_direct_chat_member(chat_id));

drop policy if exists "Members update their own direct chat read markers" on public.direct_chat_reads;
create policy "Members update their own direct chat read markers"
on public.direct_chat_reads for update
using (user_id = auth.uid() and public.is_direct_chat_member(chat_id))
with check (user_id = auth.uid() and public.is_direct_chat_member(chat_id));

revoke all on public.direct_chats from anon, authenticated;
revoke all on public.direct_messages from anon, authenticated;
revoke all on public.direct_chat_reads from anon, authenticated;
grant select on public.direct_chats to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant select, insert, update on public.direct_chat_reads to authenticated;
-- The send-push Edge Function reads these to find who to notify.
grant select on public.direct_chats, public.direct_messages, public.direct_chat_reads to service_role;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
revoke all on function public.is_direct_chat_member(uuid) from public, anon;
grant execute on function public.is_direct_chat_member(uuid) to authenticated;
revoke all on function public.can_send_direct_message(uuid) from public, anon;
grant execute on function public.can_send_direct_message(uuid) to authenticated;
revoke all on function public.open_direct_chat(uuid) from public, anon;
grant execute on function public.open_direct_chat(uuid) to authenticated;
revoke all on function public.touch_direct_chat() from public, anon, authenticated;

-- Live updates in the chat screen.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
    ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;
