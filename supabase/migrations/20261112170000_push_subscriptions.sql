-- Push notifications: each phone or browser a member turned notifications on
-- for. Members only see and change their own rows. The send-push Edge
-- Function reads them with the service role key to deliver notifications.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  user_agent text not null default '' check (char_length(user_agent) <= 300),
  -- Which kinds of push messages this device wants (from Notification settings).
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Members can view their own push subscriptions" on public.push_subscriptions;
create policy "Members can view their own push subscriptions"
on public.push_subscriptions for select
using (user_id = auth.uid());

drop policy if exists "Members can add their own push subscriptions" on public.push_subscriptions;
create policy "Members can add their own push subscriptions"
on public.push_subscriptions for insert
with check (user_id = auth.uid());

drop policy if exists "Members can update their own push subscriptions" on public.push_subscriptions;
create policy "Members can update their own push subscriptions"
on public.push_subscriptions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members can remove their own push subscriptions" on public.push_subscriptions;
create policy "Members can remove their own push subscriptions"
on public.push_subscriptions for delete
using (user_id = auth.uid());

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
