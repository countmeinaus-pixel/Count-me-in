-- Admins can make members moderator, and take that role away again.
-- Only through this function: user_roles itself stays read-only for the app.
-- Admin accounts cannot be changed here (so you cannot lock yourself out).
-- Safe to run more than once.

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified',
    'friend_request', 'friend_accepted',
    'activity_approved', 'activity_rejected', 'sport_suggested',
    'role_changed'
  ));

create or replace function public.set_member_role(target_user_id uuid, new_role text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_role_value text;
begin
  if not public.has_admin_role() then
    raise exception 'Only admins can change member roles.';
  end if;
  if new_role not in ('user', 'moderator') then
    raise exception 'A member can only be made moderator or a regular member.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'This member no longer exists.';
  end if;

  select role into current_role_value from public.user_roles where user_id = target_user_id;
  if current_role_value = 'admin' then
    raise exception 'Admin accounts cannot be changed here.';
  end if;
  if coalesce(current_role_value, 'user') = new_role then
    return new_role;
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, new_role)
  on conflict (user_id) do update set role = excluded.role;

  insert into public.notifications (user_id, actor_id, type, body)
  values (
    target_user_id,
    auth.uid(),
    'role_changed',
    case when new_role = 'moderator'
      then 'You are now a moderator. You can find the Moderation tools in the menu.'
      else 'You are no longer a moderator.'
    end
  );

  return new_role;
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;
