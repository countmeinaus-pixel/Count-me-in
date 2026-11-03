create table if not exists public.activity_chat_threads (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  title text not null,
  organiser_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_chat_members (
  thread_id uuid not null references public.activity_chat_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'pending', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.activity_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.activity_chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  message_type text not null default 'message' check (message_type in ('message', 'system')),
  created_at timestamptz not null default now()
);

alter table public.activity_chat_threads enable row level security;
alter table public.activity_chat_members enable row level security;
alter table public.activity_chat_messages enable row level security;

create unique index if not exists idx_activity_chat_threads_activity_unique
on public.activity_chat_threads(activity_id);
create index if not exists idx_chat_members_user
on public.activity_chat_members(user_id);
create index if not exists idx_chat_messages_thread
on public.activity_chat_messages(thread_id, created_at desc);

alter table public.activity_chat_messages
  drop constraint if exists activity_chat_messages_body_length;
alter table public.activity_chat_messages
  add constraint activity_chat_messages_body_length
  check (char_length(body) between 1 and 2000);

create table if not exists public.activity_chat_reads (
  thread_id uuid not null references public.activity_chat_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table public.activity_chat_reads enable row level security;

create or replace function public.is_activity_chat_member(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.activity_chat_threads t
    where t.id = target_thread_id
      and (
        t.organiser_id = auth.uid()
        or exists (
          select 1
          from public.activity_chat_members m
          where m.thread_id = t.id
            and m.user_id = auth.uid()
            and m.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.is_activity_chat_member(uuid) from public, anon;
grant execute on function public.is_activity_chat_member(uuid) to authenticated;

drop policy if exists "Users can view activity chats they belong to" on public.activity_chat_threads;
drop policy if exists "Users can insert activity chat threads they organise" on public.activity_chat_threads;
drop policy if exists "Organisers can update activity chat threads" on public.activity_chat_threads;
create policy "Accepted members can read their activity chat threads"
on public.activity_chat_threads for select
using (public.is_activity_chat_member(id));

drop policy if exists "Users can view chat membership for threads they belong to" on public.activity_chat_members;
drop policy if exists "Users can manage their own chat membership" on public.activity_chat_members;
create policy "Accepted members can view chat membership"
on public.activity_chat_members for select
using (public.is_activity_chat_member(thread_id));

drop policy if exists "Members can read chat messages" on public.activity_chat_messages;
drop policy if exists "Members can send chat messages" on public.activity_chat_messages;
create policy "Accepted members can read chat messages"
on public.activity_chat_messages for select
using (public.is_activity_chat_member(thread_id));

create policy "Accepted members can send chat messages"
on public.activity_chat_messages for insert
with check (
  sender_id = auth.uid()
  and message_type = 'message'
  and public.is_activity_chat_member(thread_id)
);

drop policy if exists "Users can manage their own activity chat reads" on public.activity_chat_reads;
create policy "Users can view their activity chat read markers"
on public.activity_chat_reads for select
using (user_id = auth.uid() and public.is_activity_chat_member(thread_id));

create policy "Users can add their activity chat read markers"
on public.activity_chat_reads for insert
with check (user_id = auth.uid() and public.is_activity_chat_member(thread_id));

create policy "Users can update their activity chat read markers"
on public.activity_chat_reads for update
using (user_id = auth.uid() and public.is_activity_chat_member(thread_id))
with check (user_id = auth.uid() and public.is_activity_chat_member(thread_id));

revoke all on public.activity_chat_threads from anon, authenticated;
grant select on public.activity_chat_threads to authenticated;
revoke all on public.activity_chat_members from anon, authenticated;
grant select on public.activity_chat_members to authenticated;
revoke all on public.activity_chat_messages from anon, authenticated;
grant select, insert on public.activity_chat_messages to authenticated;
revoke all on public.activity_chat_reads from anon, authenticated;
grant select, insert, update on public.activity_chat_reads to authenticated;

create or replace function public.sync_activity_group_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  activity_row public.activities%rowtype;
  chat_thread_id uuid;
  member_name text;
begin
  if new.status <> 'accepted'
    or (tg_op = 'UPDATE' and old.status = 'accepted') then
    return new;
  end if;

  select *
  into activity_row
  from public.activities
  where id = new.activity_id;

  if not found then
    raise exception 'The activity for this chat could not be found.';
  end if;

  insert into public.activity_chat_threads (activity_id, title, organiser_id)
  values (activity_row.id, activity_row.title, activity_row.host_id)
  on conflict (activity_id) do update
    set title = excluded.title,
        organiser_id = excluded.organiser_id,
        updated_at = now()
  returning id into chat_thread_id;

  insert into public.activity_chat_members (thread_id, user_id, status)
  values (chat_thread_id, activity_row.host_id, 'accepted')
  on conflict (thread_id, user_id) do update
    set status = 'accepted';

  insert into public.activity_chat_members (thread_id, user_id, status)
  values (chat_thread_id, new.user_id, 'accepted')
  on conflict (thread_id, user_id) do update
    set status = 'accepted';

  if new.user_id <> activity_row.host_id then
    select first_name into member_name
    from public.profiles
    where id = new.user_id;

    insert into public.activity_chat_messages (thread_id, sender_id, body, message_type)
    values (
      chat_thread_id,
      new.user_id,
      coalesce(member_name, 'A member') || ' joined the activity.',
      'system'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.sync_activity_group_chat_membership() from public, anon, authenticated;

drop trigger if exists sync_activity_group_chat_membership on public.activity_join_requests;
create trigger sync_activity_group_chat_membership
after insert or update of status on public.activity_join_requests
for each row execute function public.sync_activity_group_chat_membership();

insert into public.activity_chat_threads (activity_id, title, organiser_id)
select distinct a.id, a.title, a.host_id
from public.activities a
join public.activity_join_requests r
  on r.activity_id = a.id and r.status = 'accepted'
on conflict (activity_id) do update
  set title = excluded.title,
      organiser_id = excluded.organiser_id,
      updated_at = now();

insert into public.activity_chat_members (thread_id, user_id, status)
select t.id, t.organiser_id, 'accepted'
from public.activity_chat_threads t
join public.activity_join_requests r
  on r.activity_id = t.activity_id and r.status = 'accepted'
on conflict (thread_id, user_id) do update
  set status = 'accepted';

insert into public.activity_chat_members (thread_id, user_id, status)
select t.id, r.user_id, 'accepted'
from public.activity_chat_threads t
join public.activity_join_requests r
  on r.activity_id = t.activity_id and r.status = 'accepted'
on conflict (thread_id, user_id) do update
  set status = 'accepted';

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_chat_messages'
  ) then
    alter publication supabase_realtime add table public.activity_chat_messages;
  end if;
end;
$$;
