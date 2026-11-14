-- Patches you have already seen the "New patch unlocked" screen for, so it
-- shows only once per account, on every device. Safe to run more than once.

create table if not exists public.seen_patches (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  patch_id text not null check (char_length(patch_id) between 1 and 100),
  seen_at timestamptz not null default now(),
  primary key (user_id, patch_id)
);

alter table public.seen_patches enable row level security;

drop policy if exists "Members see the patches they have seen" on public.seen_patches;
create policy "Members see the patches they have seen"
on public.seen_patches for select
using (user_id = auth.uid());

drop policy if exists "Members mark their own patches as seen" on public.seen_patches;
create policy "Members mark their own patches as seen"
on public.seen_patches for insert
with check (user_id = auth.uid());

revoke all on public.seen_patches from anon;
grant select, insert on public.seen_patches to authenticated;
