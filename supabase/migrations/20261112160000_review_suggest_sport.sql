-- Approving an activity and suggesting its sport for the sport list are now
-- two separate choices: "Approve activity only" or "Approve + suggest as sport".
-- Only the second notifies the admins.
-- Safe to run more than once.

-- The old version had 3 inputs; remove it so the app always uses the new one.
drop function if exists public.review_activity(uuid, boolean, text);

create or replace function public.review_activity(
  target_activity_id uuid,
  approve boolean,
  review_message text default '',
  suggest_as_sport boolean default true
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

  -- Approved and marked as a possible sport: ask every admin whether it
  -- should become a default sport. "Approve activity only" skips this.
  if approve and suggest_as_sport then
    insert into public.notifications (user_id, actor_id, activity_id, type, body)
    select ur.user_id, auth.uid(), target_activity_id, 'sport_suggested',
           format('New sport used: %s. Add it as a default sport?', sport_name)
    from public.user_roles ur
    where ur.role = 'admin';
  end if;

  return case when approve then 'approved' else 'rejected' end;
end;
$$;

revoke all on function public.review_activity(uuid, boolean, text, boolean) from public, anon;
grant execute on function public.review_activity(uuid, boolean, text, boolean) to authenticated;
