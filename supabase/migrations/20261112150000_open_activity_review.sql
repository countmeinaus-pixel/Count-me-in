-- Every Open activity is checked by a moderator before others can see it
-- (not only the ones with a suggested sport). The name of the sport or
-- activity is taken from sport_details.suggested_sport, else the title.
--
-- Also fixes 20261112130000: logged-out visitors could no longer read
-- activities, because the visibility rule calls has_staff_role(), which they
-- were not allowed to run. For them it simply returns false.
-- Safe to run more than once.

grant execute on function public.has_staff_role() to anon;

create or replace function public.set_activity_review_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  is_open_activity boolean;
begin
  if tg_op = 'INSERT' then
    select s.name = 'Open activity' into is_open_activity
    from public.sports s
    where s.id = new.sport_id;

    new.review_status := case
      when new.sport_details ? 'suggested_sport' or coalesce(is_open_activity, false) then 'pending'
      else 'approved'
    end;
  elsif auth.uid() is not null and not public.has_staff_role() then
    -- Hosts can edit their activity, but not its review status or suggested sport.
    -- (No signed-in user means the Supabase dashboard / SQL Editor: allowed.)
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

  sport_name := coalesce(nullif(target.sport_details->>'suggested_sport', ''), target.title);

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

  -- Approved: ask every admin whether this should become a default sport.
  if approve then
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

-- Activities that are already live as Open activity stay live; only new ones are checked.
