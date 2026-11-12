-- New sports suggested by members, checked by moderators.
--
-- A member can post an activity with a sport that is not in the list yet:
-- it is saved as "Open activity" with sport_details.suggested_sport = the name.
-- Such an activity starts as review_status 'pending' and is hidden from
-- everyone except the host and staff (moderators and admins).
-- A moderator approves it (it goes live, and every admin gets a notification
-- to consider adding the sport as a default) or rejects it (the host is told).
--
-- Also: only admins can add sports to the sports list from now on.
-- Safe to run more than once.

-- 1. Review status on activities ------------------------------------------------
alter table public.activities
  add column if not exists review_status text not null default 'approved';

alter table public.activities
  drop constraint if exists activities_review_status_check;
alter table public.activities
  add constraint activities_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

alter table public.activities
  drop constraint if exists activities_suggested_sport_check;
alter table public.activities
  add constraint activities_suggested_sport_check
  check (
    not (sport_details ? 'suggested_sport')
    or char_length(sport_details->>'suggested_sport') between 2 and 40
  );

create index if not exists idx_activities_review_pending
on public.activities(created_at)
where review_status = 'pending';

-- Members cannot choose their own review status: a suggested sport always
-- starts as pending, everything else as approved. Only staff can change it later.
create or replace function public.set_activity_review_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.review_status := case
      when new.sport_details ? 'suggested_sport' then 'pending'
      else 'approved'
    end;
  elsif not public.has_staff_role() then
    -- Hosts can edit their activity, but not its review status or suggested sport.
    new.review_status := old.review_status;
    if old.sport_details ? 'suggested_sport' then
      new.sport_details := new.sport_details
        || jsonb_build_object('suggested_sport', old.sport_details->'suggested_sport');
    else
      new.sport_details := new.sport_details - 'suggested_sport';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activity_review_status on public.activities;
create trigger trg_activity_review_status
before insert or update on public.activities
for each row execute function public.set_activity_review_status();

-- Who can see an activity: the host and staff always; everyone else only
-- approved activities (and still not when blocked).
drop policy if exists "Activities are viewable unless either user has blocked the other" on public.activities;
create policy "Activities are viewable unless either user has blocked the other"
on public.activities for select
using (
  host_id = auth.uid()
  or public.has_staff_role()
  or (review_status = 'approved' and not public.is_blocked_from_current_user(host_id))
);

-- 2. Notifications for reviews ---------------------------------------------------
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted',
    'activity_approved', 'activity_rejected', 'sport_suggested'
  ));

-- 3. Moderators approve or reject ------------------------------------------------
create or replace function public.review_activity(
  target_activity_id uuid,
  approve boolean,
  review_message text default ''
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  target public.activities%rowtype;
  sport_name text;
begin
  if not public.has_staff_role() then
    raise exception 'Only moderators and admins can review activities.';
  end if;

  select * into target from public.activities where id = target_activity_id for update;
  if not found then
    raise exception 'This activity no longer exists.';
  end if;
  if target.review_status <> 'pending' then
    return target.review_status;
  end if;

  sport_name := target.sport_details->>'suggested_sport';

  update public.activities
  set review_status = case when approve then 'approved' else 'rejected' end,
      updated_at = now()
  where id = target_activity_id;

  insert into public.notifications (user_id, actor_id, activity_id, type, body, message)
  values (
    target.host_id,
    auth.uid(),
    target_activity_id,
    case when approve then 'activity_approved' else 'activity_rejected' end,
    case when approve
      then format('Your activity "%s" is approved and now visible to everyone.', target.title)
      else format('Your activity "%s" was not approved.', target.title)
    end,
    left(coalesce(review_message, ''), 280)
  );

  -- Approved with a new sport: ask every admin to consider adding it.
  if approve and sport_name is not null then
    insert into public.notifications (user_id, actor_id, activity_id, type, body)
    select ur.user_id, auth.uid(), target_activity_id, 'sport_suggested',
           format('New sport used: %s. Add it as a default sport?', sport_name)
    from public.user_roles ur
    where ur.role = 'admin';
  end if;

  return case when approve then 'approved' else 'rejected' end;
end;
$$;

revoke all on function public.review_activity(uuid, boolean, text) from public, anon;
grant execute on function public.review_activity(uuid, boolean, text) to authenticated;

-- 4. Only admins add sports --------------------------------------------------------
drop policy if exists "Sports are insertable by authenticated users" on public.sports;
drop policy if exists "Admins can add sports" on public.sports;
create policy "Admins can add sports"
on public.sports for insert with check (public.has_admin_role());
