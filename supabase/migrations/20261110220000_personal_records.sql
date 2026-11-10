-- Personal records (PRs): members claim a record with a photo as proof.
-- Other members confirm or flag it. 3 confirms = verified, 3 flags = hidden
-- and sent to moderation. Record types are defined in the app.

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sport text not null check (char_length(sport) between 1 and 60),
  record_type text not null check (record_type ~ '^[a-z0-9-]{2,60}$'),
  value numeric not null check (value > 0 and value < 1000000),
  note text not null default '' check (char_length(note) <= 200),
  photo_url text not null check (char_length(photo_url) between 1 and 500),
  photo_path text not null check (char_length(photo_path) between 1 and 300),
  confirm_count integer not null default 0,
  flag_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_personal_records_user
on public.personal_records(user_id, created_at desc);
create index if not exists idx_personal_records_recent
on public.personal_records(created_at desc);

create table if not exists public.personal_record_votes (
  record_id uuid not null references public.personal_records(id) on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('confirm', 'flag')),
  created_at timestamptz not null default now(),
  primary key (record_id, voter_id)
);

create index if not exists idx_personal_record_votes_voter
on public.personal_record_votes(voter_id, vote, created_at);

alter table public.personal_records enable row level security;
alter table public.personal_record_votes enable row level security;

-- Records with 3 or more flags are only visible to the owner and staff.
drop policy if exists "Members can view personal records" on public.personal_records;
create policy "Members can view personal records"
on public.personal_records for select
using (
  auth.uid() is not null
  and (flag_count < 3 or user_id = auth.uid() or public.has_staff_role())
);

drop policy if exists "Members can claim their own records" on public.personal_records;
create policy "Members can claim their own records"
on public.personal_records for insert
with check (
  user_id = auth.uid()
  and confirm_count = 0
  and flag_count = 0
  and photo_path like auth.uid()::text || '/%'
);

drop policy if exists "Owners and staff can delete records" on public.personal_records;
create policy "Owners and staff can delete records"
on public.personal_records for delete
using (user_id = auth.uid() or public.has_staff_role());

-- No update policy: counts are only changed by the trigger below.
revoke all on public.personal_records from anon;
grant select, insert, delete on public.personal_records to authenticated;

drop policy if exists "Members can view their own votes" on public.personal_record_votes;
create policy "Members can view their own votes"
on public.personal_record_votes for select
using (voter_id = auth.uid());

drop policy if exists "Members can vote on other members' records" on public.personal_record_votes;
create policy "Members can vote on other members' records"
on public.personal_record_votes for insert
with check (
  voter_id = auth.uid()
  and exists (
    select 1
    from public.personal_records
    where personal_records.id = personal_record_votes.record_id
      and personal_records.user_id <> auth.uid()
  )
);

drop policy if exists "Members can take back their vote" on public.personal_record_votes;
create policy "Members can take back their vote"
on public.personal_record_votes for delete
using (voter_id = auth.uid());

revoke all on public.personal_record_votes from anon;
grant select, insert, delete on public.personal_record_votes to authenticated;

-- Notifications for confirmed and flagged records.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged'
  ));

alter table public.notifications
  add column if not exists record_id uuid references public.personal_records(id) on delete set null;

-- Moderation can receive records that reached 3 flags.
alter table public.moderation_reports
  drop constraint if exists moderation_reports_target_type_check;
alter table public.moderation_reports
  add constraint moderation_reports_target_type_check
  check (target_type in ('profile', 'activity', 'personal_record'));

create or replace function public.handle_personal_record_vote()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  vote_row public.personal_record_votes%rowtype;
  record_row public.personal_records%rowtype;
  voter_name text;
  delta integer;
begin
  if tg_op = 'INSERT' then
    vote_row := new;
    delta := 1;
  else
    vote_row := old;
    delta := -1;
  end if;

  update public.personal_records
  set confirm_count = greatest(0, confirm_count + case when vote_row.vote = 'confirm' then delta else 0 end),
      flag_count = greatest(0, flag_count + case when vote_row.vote = 'flag' then delta else 0 end)
  where id = vote_row.record_id
  returning * into record_row;

  if tg_op = 'DELETE' or record_row.id is null then
    return null;
  end if;

  select first_name into voter_name from public.profiles where id = vote_row.voter_id;

  insert into public.notifications (user_id, actor_id, record_id, type, body)
  values (
    record_row.user_id,
    vote_row.voter_id,
    record_row.id,
    case when vote_row.vote = 'confirm' then 'pr_confirmed' else 'pr_flagged' end,
    coalesce(voter_name, 'A member')
      || case
           when vote_row.vote = 'confirm' and record_row.confirm_count = 3 then ' confirmed your PR. It is now verified!'
           when vote_row.vote = 'confirm' then ' confirmed your PR.'
           when record_row.flag_count >= 3 then ' flagged your PR. It is hidden until a moderator checks it.'
           else ' flagged your PR as not right.'
         end
  );

  if vote_row.vote = 'flag' and record_row.flag_count = 3 then
    insert into public.moderation_reports (
      reporter_id, target_type, target_id, target_user_id, reason, note, evidence
    )
    values (
      vote_row.voter_id,
      'personal_record',
      record_row.id::text,
      record_row.user_id,
      'other',
      'Personal record flagged by 3 members.',
      jsonb_build_object(
        'title', 'PR: ' || record_row.sport || ' ' || record_row.record_type || ' = ' || record_row.value,
        'photo_url', record_row.photo_url,
        'note', record_row.note
      )
    );
  end if;

  return null;
end;
$$;

revoke all on function public.handle_personal_record_vote() from public, anon, authenticated;
drop trigger if exists handle_personal_record_vote on public.personal_record_votes;
create trigger handle_personal_record_vote
after insert or delete on public.personal_record_votes
for each row execute function public.handle_personal_record_vote();

-- Proof photos: public bucket, compressed JPEGs up to 2 MB, own folder only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pr-proofs', 'pr-proofs', true, 2097152, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view PR proof photos" on storage.objects;
drop policy if exists "Members can upload their own PR proof photos" on storage.objects;
drop policy if exists "Members and staff can delete PR proof photos" on storage.objects;

create policy "Anyone can view PR proof photos"
on storage.objects for select
using (bucket_id = 'pr-proofs');

create policy "Members can upload their own PR proof photos"
on storage.objects for insert
with check (
  bucket_id = 'pr-proofs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Members and staff can delete PR proof photos"
on storage.objects for delete
using (
  bucket_id = 'pr-proofs'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.has_staff_role())
);
