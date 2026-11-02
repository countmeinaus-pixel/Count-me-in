create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create or replace function public.assign_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

insert into public.user_roles (user_id, role)
select id, 'user'
from auth.users
on conflict (user_id) do nothing;

drop trigger if exists assign_default_user_role on auth.users;
create trigger assign_default_user_role
after insert on auth.users
for each row execute function public.assign_default_user_role();

create or replace function public.has_staff_role()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator', 'admin')
  );
$$;

drop policy if exists "Users can view their own role or staff roles" on public.user_roles;
create policy "Users can view their own role or staff roles"
on public.user_roles for select
using (user_id = auth.uid() or public.has_staff_role());

create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create or replace function public.is_blocked_from_current_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.blocked_users
    where (blocker_id = auth.uid() and blocked_user_id = target_user_id)
       or (blocker_id = target_user_id and blocked_user_id = auth.uid())
  );
$$;

alter table public.blocked_users enable row level security;

drop policy if exists "Users can view their own blocks" on public.blocked_users;
drop policy if exists "Users can block other accounts" on public.blocked_users;
drop policy if exists "Users can unblock their own blocks" on public.blocked_users;

create policy "Users can view their own blocks"
on public.blocked_users for select
using (blocker_id = auth.uid());

create policy "Users can block other accounts"
on public.blocked_users for insert
with check (blocker_id = auth.uid());

create policy "Users can unblock their own blocks"
on public.blocked_users for delete
using (blocker_id = auth.uid());

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'activity')),
  target_id text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (
    reason in (
      'inappropriate_or_sexual_content',
      'harassment_or_bullying',
      'spam_or_scam',
      'fake_profile',
      'safety_concern',
      'other'
    )
  ),
  note text not null default '' check (char_length(note) <= 1000),
  evidence jsonb not null,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_reports_status_created
on public.moderation_reports(status, created_at desc);

create index if not exists idx_moderation_reports_target
on public.moderation_reports(target_type, target_id);

alter table public.moderation_reports enable row level security;

drop policy if exists "Reporters and staff can view reports" on public.moderation_reports;
drop policy if exists "Staff can update report status" on public.moderation_reports;

create policy "Reporters and staff can view reports"
on public.moderation_reports for select
using (reporter_id = auth.uid() or public.has_staff_role());

create policy "Staff can update report status"
on public.moderation_reports for update
using (public.has_staff_role())
with check (public.has_staff_role());

create or replace function public.submit_moderation_report(
  target_type text,
  target_id text,
  report_reason text,
  report_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  reporter uuid := auth.uid();
  target_user uuid;
  report_evidence jsonb;
  new_report_id uuid;
begin
  if reporter is null then
    raise exception 'Sign in before submitting a report.';
  end if;

  if report_reason is null or report_reason not in (
    'inappropriate_or_sexual_content',
    'harassment_or_bullying',
    'spam_or_scam',
    'fake_profile',
    'safety_concern',
    'other'
  ) then
    raise exception 'Choose a valid report reason.';
  end if;

  if char_length(coalesce(report_note, '')) > 1000 then
    raise exception 'Report notes must be 1000 characters or fewer.';
  end if;

  if target_type = 'profile' then
    select profiles.id,
      jsonb_build_object(
        'id', profiles.id,
        'first_name', profiles.first_name,
        'suburb', profiles.suburb,
        'bio', profiles.bio,
        'photo_url', profiles.photo_url,
        'selfie_verified', profiles.selfie_verified
      )
    into target_user, report_evidence
    from public.profiles
    where profiles.id::text = target_id;
  elsif target_type = 'activity' then
    select activities.host_id,
      jsonb_build_object(
        'id', activities.id,
        'host_id', activities.host_id,
        'title', activities.title,
        'sport_id', activities.sport_id,
        'starts_at', activities.starts_at,
        'meeting_point', activities.meeting_point,
        'suburb', activities.suburb,
        'notes', activities.notes,
        'cover_image_url', activities.cover_image_url
      )
    into target_user, report_evidence
    from public.activities
    where activities.id::text = target_id;
  else
    raise exception 'This type of content cannot be reported yet.';
  end if;

  if report_evidence is null then
    raise exception 'The reported profile or activity could not be found.';
  end if;

  if target_user = reporter then
    raise exception 'You cannot report your own profile or activity.';
  end if;

  insert into public.moderation_reports (
    reporter_id,
    target_type,
    target_id,
    target_user_id,
    reason,
    note,
    evidence
  )
  values (
    reporter,
    target_type,
    target_id,
    target_user,
    report_reason,
    coalesce(report_note, ''),
    report_evidence
  )
  returning id into new_report_id;

  return new_report_id;
end;
$$;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable unless either user has blocked the other" on public.profiles;
create policy "Profiles are viewable unless either user has blocked the other"
on public.profiles for select
using (id = auth.uid() or not public.is_blocked_from_current_user(id));

drop policy if exists "Profile sport rows are viewable by everyone" on public.profile_sports;
drop policy if exists "Profile sport rows are viewable unless either user has blocked the other" on public.profile_sports;
create policy "Profile sport rows are viewable unless either user has blocked the other"
on public.profile_sports for select
using (profile_id = auth.uid() or not public.is_blocked_from_current_user(profile_id));

drop policy if exists "Profile availability rows are viewable by everyone" on public.profile_availability;
drop policy if exists "Profile availability rows are viewable unless either user has blocked the other" on public.profile_availability;
create policy "Profile availability rows are viewable unless either user has blocked the other"
on public.profile_availability for select
using (profile_id = auth.uid() or not public.is_blocked_from_current_user(profile_id));

drop policy if exists "Activities are viewable by everyone" on public.activities;
drop policy if exists "Activities are viewable unless either user has blocked the other" on public.activities;
create policy "Activities are viewable unless either user has blocked the other"
on public.activities for select
using (host_id = auth.uid() or not public.is_blocked_from_current_user(host_id));

drop policy if exists "Users can view their activity invitations" on public.activity_invites;
drop policy if exists "Users can view invitations unless either user has blocked the other" on public.activity_invites;
create policy "Users can view invitations unless either user has blocked the other"
on public.activity_invites for select
using (
  (auth.uid() = invitee_id or auth.uid() = invited_by)
  and not public.is_blocked_from_current_user(invitee_id)
  and not public.is_blocked_from_current_user(invited_by)
);

drop policy if exists "Hosts can invite users to their activities" on public.activity_invites;
drop policy if exists "Hosts can invite users unless either user has blocked the other" on public.activity_invites;
create policy "Hosts can invite users unless either user has blocked the other"
on public.activity_invites for insert
with check (
  auth.uid() = invited_by
  and not public.is_blocked_from_current_user(invitee_id)
  and exists (
    select 1
    from public.activities
    where activities.id = activity_invites.activity_id
      and activities.host_id = auth.uid()
  )
);

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

revoke all on public.blocked_users from anon, authenticated;
grant select, insert, delete on public.blocked_users to authenticated;

revoke all on public.moderation_reports from anon, authenticated;
grant select on public.moderation_reports to authenticated;
grant update (status) on public.moderation_reports to authenticated;

revoke all on function public.has_staff_role() from public, anon;
grant execute on function public.has_staff_role() to authenticated;
revoke all on function public.assign_default_user_role() from public, anon, authenticated;
revoke all on function public.is_blocked_from_current_user(uuid) from public;
grant execute on function public.is_blocked_from_current_user(uuid) to anon, authenticated;

revoke all on function public.submit_moderation_report(text, text, text, text) from public, anon;
grant execute on function public.submit_moderation_report(text, text, text, text) to authenticated;
