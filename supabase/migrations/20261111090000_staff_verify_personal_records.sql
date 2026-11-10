-- Admins and moderators can verify a personal record directly. A staff
-- verification counts as fully verified (like 3 confirms) and also makes a
-- flagged record visible again.

alter table public.personal_records
  add column if not exists staff_verified_at timestamptz,
  add column if not exists staff_verified_by uuid references public.profiles(id) on delete set null;

drop policy if exists "Members can view personal records" on public.personal_records;
create policy "Members can view personal records"
on public.personal_records for select
using (
  auth.uid() is not null
  and (
    flag_count < 3
    or staff_verified_at is not null
    or user_id = auth.uid()
    or public.has_staff_role()
  )
);

-- Members can still not set staff fields themselves when claiming.
drop policy if exists "Members can claim their own records" on public.personal_records;
create policy "Members can claim their own records"
on public.personal_records for insert
with check (
  user_id = auth.uid()
  and confirm_count = 0
  and flag_count = 0
  and staff_verified_at is null
  and staff_verified_by is null
  and photo_path like auth.uid()::text || '/%'
);

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'participant_left', 'invite', 'invite_accepted', 'invite_declined',
    'activity_cancelled', 'pr_confirmed', 'pr_flagged', 'pr_verified'
  ));

-- verify = true sets the staff verification, false removes it again.
create or replace function public.staff_verify_personal_record(
  target_record_id uuid,
  verify boolean default true
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  record_row public.personal_records%rowtype;
begin
  if not public.has_staff_role() then
    raise exception 'Only admins and moderators can verify records.';
  end if;

  update public.personal_records
  set staff_verified_at = case when verify then now() else null end,
      staff_verified_by = case when verify then auth.uid() else null end
  where id = target_record_id
  returning * into record_row;

  if record_row.id is null then
    raise exception 'This record could not be found.';
  end if;

  if verify then
    -- Close open moderation reports about this record.
    update public.moderation_reports
    set status = 'resolved'
    where target_type = 'personal_record'
      and target_id = target_record_id::text
      and status in ('open', 'in_review');

    insert into public.notifications (user_id, actor_id, record_id, type, body)
    values (
      record_row.user_id,
      auth.uid(),
      record_row.id,
      'pr_verified',
      'A moderator verified your PR.'
    );
  end if;
end;
$$;

revoke all on function public.staff_verify_personal_record(uuid, boolean) from public, anon;
grant execute on function public.staff_verify_personal_record(uuid, boolean) to authenticated;
