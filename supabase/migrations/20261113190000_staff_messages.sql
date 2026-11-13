-- Warnings and messages from the Count Me In team (admins) to a member.
-- The member sees it pinned at the top of Chats until he taps "I understand" or
-- replies. He sees "Count Me In team" as the sender, never the admin's name.
-- Admins see the history per member, including when it was acknowledged and the reply.
-- Safe to run more than once.

create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('warning', 'message')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  reply text check (reply is null or char_length(trim(reply)) between 1 and 1000),
  replied_at timestamptz
);
create index if not exists idx_staff_messages_user on public.staff_messages(user_id, created_at desc);

alter table public.staff_messages enable row level security;

-- Members read their own (through the function below, so the admin stays anonymous);
-- admins read everything.
drop policy if exists "Admins read team messages" on public.staff_messages;
create policy "Admins read team messages"
on public.staff_messages for select
using (public.has_admin_role());

revoke all on public.staff_messages from anon, authenticated;
grant select on public.staff_messages to authenticated;
grant select on public.staff_messages to service_role;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted',
    'activity_approved', 'activity_rejected', 'sport_suggested',
    'role_changed', 'profile_updated', 'staff_message', 'staff_message_reply'
  ));

-- Admin sends a warning or message. The member gets a notification (and push).
create or replace function public.send_staff_message(target_user_id uuid, message_kind text, message_body text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  new_id uuid;
begin
  if not public.has_admin_role() then
    raise exception 'Only admins can send team messages.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot send a team message to yourself.';
  end if;
  if message_kind not in ('warning', 'message') then
    raise exception 'Choose Warning or Message.';
  end if;
  message_body := trim(coalesce(message_body, ''));
  if char_length(message_body) not between 1 and 1000 then
    raise exception 'The message must be between 1 and 1000 characters.';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'This member no longer exists.';
  end if;

  insert into public.staff_messages (user_id, sender_id, kind, body)
  values (target_user_id, auth.uid(), message_kind, message_body)
  returning id into new_id;

  -- No actor: the member sees "Count Me In team", not the admin's name.
  insert into public.notifications (user_id, actor_id, type, body)
  values (
    target_user_id,
    null,
    'staff_message',
    case when message_kind = 'warning'
      then 'You have a warning from the Count Me In team. Open Chats to read it.'
      else 'You have a message from the Count Me In team. Open Chats to read it.'
    end
  );

  return new_id;
end;
$$;

-- The member's own team messages, without the admin's name.
create or replace function public.my_staff_messages()
returns table (
  id uuid,
  kind text,
  body text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  reply text,
  replied_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select m.id, m.kind, m.body, m.created_at, m.acknowledged_at, m.reply, m.replied_at
  from public.staff_messages m
  where m.user_id = auth.uid()
  order by m.created_at desc;
$$;

-- Member taps "I understand".
create or replace function public.acknowledge_staff_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.staff_messages
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = target_message_id and user_id = auth.uid();
  if not found then
    raise exception 'This message could not be found.';
  end if;
end;
$$;

-- Member replies (once). This also counts as acknowledged. The admin who sent it is notified.
create or replace function public.reply_to_staff_message(target_message_id uuid, reply_body text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  message_row public.staff_messages%rowtype;
begin
  reply_body := trim(coalesce(reply_body, ''));
  if char_length(reply_body) not between 1 and 1000 then
    raise exception 'Your reply must be between 1 and 1000 characters.';
  end if;

  select * into message_row from public.staff_messages
  where id = target_message_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'This message could not be found.';
  end if;
  if message_row.reply is not null then
    raise exception 'You already replied to this message.';
  end if;

  update public.staff_messages
  set reply = reply_body,
      replied_at = now(),
      acknowledged_at = coalesce(acknowledged_at, now())
  where id = target_message_id;

  if message_row.sender_id is not null then
    insert into public.notifications (user_id, actor_id, type, body, message)
    values (
      message_row.sender_id,
      auth.uid(),
      'staff_message_reply',
      'replied to your ' || case when message_row.kind = 'warning' then 'warning' else 'message' end || '.',
      left(reply_body, 280)
    );
  end if;
end;
$$;

revoke all on function public.send_staff_message(uuid, text, text) from public, anon;
grant execute on function public.send_staff_message(uuid, text, text) to authenticated;
revoke all on function public.my_staff_messages() from public, anon;
grant execute on function public.my_staff_messages() to authenticated;
revoke all on function public.acknowledge_staff_message(uuid) from public, anon;
grant execute on function public.acknowledge_staff_message(uuid) to authenticated;
revoke all on function public.reply_to_staff_message(uuid, text) from public, anon;
grant execute on function public.reply_to_staff_message(uuid, text) to authenticated;
