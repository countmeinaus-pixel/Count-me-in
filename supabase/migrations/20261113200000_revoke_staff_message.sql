-- Admins can revoke a warning or message that was sent by mistake.
-- The member no longer sees it in Chats and gets a notification that it was
-- withdrawn. Admins still see it in the history as "Revoked", with who, when and why.
-- Safe to run more than once.

alter table public.staff_messages add column if not exists revoked_at timestamptz;
alter table public.staff_messages add column if not exists revoked_by uuid references public.profiles(id) on delete set null;
alter table public.staff_messages add column if not exists revoke_reason text not null default '' check (char_length(revoke_reason) <= 280);

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
    'staff_message_revoked'
  ));

create or replace function public.revoke_staff_message(target_message_id uuid, reason text default '')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  message_row public.staff_messages%rowtype;
begin
  if not public.has_admin_role() then
    raise exception 'Only admins can revoke team messages.';
  end if;

  select * into message_row from public.staff_messages where id = target_message_id for update;
  if not found then
    raise exception 'This message could not be found.';
  end if;
  if message_row.revoked_at is not null then
    return;
  end if;

  update public.staff_messages
  set revoked_at = now(),
      revoked_by = auth.uid(),
      revoke_reason = left(trim(coalesce(reason, '')), 280)
  where id = target_message_id;

  insert into public.notifications (user_id, actor_id, type, body, message)
  values (
    message_row.user_id,
    null,
    'staff_message_revoked',
    case when message_row.kind = 'warning'
      then 'A warning from the Count Me In team was withdrawn. Sorry for the confusion.'
      else 'A message from the Count Me In team was withdrawn.'
    end,
    left(trim(coalesce(reason, '')), 280)
  );
end;
$$;

-- The member's own team messages, without revoked ones and without the admin's name.
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
    and m.revoked_at is null
  order by m.created_at desc;
$$;

-- A revoked message can no longer be acknowledged or replied to.
create or replace function public.acknowledge_staff_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.staff_messages
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = target_message_id and user_id = auth.uid() and revoked_at is null;
  if not found then
    raise exception 'This message could not be found.';
  end if;
end;
$$;

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
  where id = target_message_id and user_id = auth.uid() and revoked_at is null
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

revoke all on function public.revoke_staff_message(uuid, text) from public, anon;
grant execute on function public.revoke_staff_message(uuid, text) to authenticated;
revoke all on function public.my_staff_messages() from public, anon;
grant execute on function public.my_staff_messages() to authenticated;
revoke all on function public.acknowledge_staff_message(uuid) from public, anon;
grant execute on function public.acknowledge_staff_message(uuid) to authenticated;
revoke all on function public.reply_to_staff_message(uuid, text) from public, anon;
grant execute on function public.reply_to_staff_message(uuid, text) to authenticated;
