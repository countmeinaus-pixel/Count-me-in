-- Push notifications (free web push).
-- 1. push_subscriptions: one row per device that turned push on.
-- 2. notification_preferences: which pushes a member wants (the switches on
--    Notification settings), so the server can respect them.
-- The Edge Function "send-push" reads both with the service role key.
-- Safe to run more than once.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Members manage their own push subscriptions" on public.push_subscriptions;
create policy "Members manage their own push subscriptions"
on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  chat_messages boolean not null default true,
  join_requests boolean not null default true,
  activity_updates boolean not null default true,
  friend_requests boolean not null default true,
  activity_in_my_sports boolean not null default true,
  reminder_day_before boolean not null default true,
  reminder_hour_before boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Members manage their own notification preferences" on public.notification_preferences;
create policy "Members manage their own notification preferences"
on public.notification_preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
