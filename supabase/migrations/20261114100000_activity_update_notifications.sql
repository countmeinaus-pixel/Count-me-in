-- When the host (or an admin) changes an activity, everyone who joined it gets
-- a notification ("Activity updated") saying what changed. If an admin made
-- the change, the host is told too. Push notifications follow via the
-- existing notifications webhook. Safe to run more than once.

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
    'staff_message_revoked', 'removed_from_activity', 'activity_updated'
  ));

create or replace function public.notify_activity_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  editor_id uuid := auth.uid();
  editor_name text;
  changes text[] := array[]::text[];
  summary text;
  zone text;
begin
  -- Only real edits by a signed-in person (not review or system updates).
  if editor_id is null then
    return new;
  end if;

  if new.starts_at is distinct from old.starts_at then
    zone := coalesce(public.place_time_zone(new.suburb), 'Australia/Adelaide');
    changes := changes || ('new time ' || to_char(new.starts_at at time zone zone, 'Dy DD Mon, HH12:MI AM'));
  end if;
  if new.duration_minutes is distinct from old.duration_minutes then
    changes := changes || 'duration'::text;
  end if;
  if new.meeting_point is distinct from old.meeting_point
    or new.suburb is distinct from old.suburb
    or new.address is distinct from old.address
    or new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude then
    changes := changes || ('meeting place ' || new.meeting_point || ', ' || new.suburb);
  end if;
  if new.title is distinct from old.title then
    changes := changes || 'title'::text;
  end if;
  if new.level_wanted is distinct from old.level_wanted
    or new.spots_total is distinct from old.spots_total
    or new.notes is distinct from old.notes
    or new.sport_details is distinct from old.sport_details then
    changes := changes || 'details'::text;
  end if;

  if array_length(changes, 1) is null then
    return new;
  end if;

  select first_name into editor_name from public.profiles where id = editor_id;
  summary := left(
    coalesce(editor_name, 'The host') || ' updated ' || new.title || ': '
      || array_to_string(changes, ', ') || '.',
    500
  );

  insert into public.notifications (user_id, actor_id, activity_id, type, body)
  select recipient.user_id, editor_id, new.id, 'activity_updated', summary
  from (
    select user_id
    from public.activity_join_requests
    where activity_id = new.id
      and status = 'accepted'
    union
    -- The host hears about it when someone else (an admin) changed it.
    select new.host_id
  ) as recipient
  where recipient.user_id <> editor_id;

  return new;
end;
$$;

revoke all on function public.notify_activity_updated() from public, anon, authenticated;

drop trigger if exists activity_updated_notify on public.activities;
create trigger activity_updated_notify
after update on public.activities
for each row
execute function public.notify_activity_updated();
