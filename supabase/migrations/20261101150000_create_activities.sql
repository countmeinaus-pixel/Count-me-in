create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  sport_id bigint not null references public.sports(id),
  title text not null check (char_length(title) between 1 and 120),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  meeting_point text not null check (char_length(meeting_point) between 1 and 200),
  suburb text not null check (char_length(suburb) between 1 and 100),
  spots_total integer not null check (spots_total between 1 and 8),
  level_wanted text not null check (
    level_wanted in ('Beginner friendly', 'Intermediate', 'Experienced')
  ),
  notes text not null default '' check (char_length(notes) <= 300),
  auto_accept boolean not null default false,
  sport_details jsonb not null default '{}'::jsonb check (jsonb_typeof(sport_details) = 'object'),
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_invites (
  activity_id uuid not null references public.activities(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (activity_id, invitee_id),
  check (invitee_id <> invited_by)
);

create index if not exists idx_activities_starts_at on public.activities(starts_at);
create index if not exists idx_activities_host on public.activities(host_id);
create index if not exists idx_activities_sport on public.activities(sport_id);
create index if not exists idx_activity_invites_invitee on public.activity_invites(invitee_id, status);

alter table public.activities enable row level security;
alter table public.activity_invites enable row level security;

drop policy if exists "Activities are viewable by everyone" on public.activities;
drop policy if exists "Users can create their own activities" on public.activities;
drop policy if exists "Hosts can update their own activities" on public.activities;
drop policy if exists "Hosts can delete their own activities" on public.activities;
drop policy if exists "Users can view their activity invitations" on public.activity_invites;
drop policy if exists "Hosts can invite users to their activities" on public.activity_invites;

create policy "Activities are viewable by everyone"
on public.activities for select using (true);

create policy "Users can create their own activities"
on public.activities for insert with check (
  auth.uid() = host_id
  and exists (
    select 1
    from public.profile_sports
    where profile_sports.profile_id = auth.uid()
      and profile_sports.sport_id = activities.sport_id
  )
);

create policy "Hosts can update their own activities"
on public.activities for update using (auth.uid() = host_id)
with check (
  auth.uid() = host_id
  and exists (
    select 1
    from public.profile_sports
    where profile_sports.profile_id = auth.uid()
      and profile_sports.sport_id = activities.sport_id
  )
);

create policy "Hosts can delete their own activities"
on public.activities for delete using (auth.uid() = host_id);

create policy "Users can view their activity invitations"
on public.activity_invites for select using (
  auth.uid() = invitee_id or auth.uid() = invited_by
);

create policy "Hosts can invite users to their activities"
on public.activity_invites for insert with check (
  auth.uid() = invited_by
  and exists (
    select 1
    from public.activities
    where activities.id = activity_invites.activity_id
      and activities.host_id = auth.uid()
  )
);
