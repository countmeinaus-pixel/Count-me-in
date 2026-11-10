-- Patch challenges: members opt in to time-limited challenges.
-- The challenges themselves are defined in the app; this table only stores
-- who joined which challenge. Progress comes from confirmed meetups.

create table if not exists public.challenge_enrollments (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  challenge_id text not null check (challenge_id ~ '^[a-z0-9-]{3,60}$'),
  joined_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

alter table public.challenge_enrollments enable row level security;

drop policy if exists "Members can view their own challenges" on public.challenge_enrollments;
create policy "Members can view their own challenges"
on public.challenge_enrollments for select
using (user_id = auth.uid());

drop policy if exists "Members can join challenges" on public.challenge_enrollments;
create policy "Members can join challenges"
on public.challenge_enrollments for insert
with check (user_id = auth.uid());

drop policy if exists "Members can leave challenges" on public.challenge_enrollments;
create policy "Members can leave challenges"
on public.challenge_enrollments for delete
using (user_id = auth.uid());

revoke all on public.challenge_enrollments from anon;
grant select, insert, delete on public.challenge_enrollments to authenticated;
