-- Hosts can cancel (take down) their own activity before it starts.
-- Everyone who was going or had requested a spot gets a notification with the
-- host's optional message, then the activity, its requests and its group chat
-- are removed.

-- Keep notifications when their activity is deleted, so members still see
-- the cancellation message.
alter table public.notifications
  drop constraint if exists notifications_activity_id_fkey;
alter table public.notifications
  add constraint notifications_activity_id_fkey
  foreign key (activity_id) references public.activities(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('participant_left', 'invite', 'invite_accepted', 'invite_declined', 'activity_cancelled'));

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
        || to_char(activity_row.starts_at at time zone 'Australia/Adelaide', 'Dy DD Mon, HH12:MI AM')
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
