create or replace function public.has_admin_role()
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
      and role = 'admin'
  );
$$;

revoke all on function public.has_admin_role() from public, anon;
grant execute on function public.has_admin_role() to authenticated;

drop policy if exists "Hosts can update their own activities" on public.activities;
create policy "Hosts and admins can update activities"
on public.activities for update
using (auth.uid() = host_id or public.has_admin_role())
with check (
  (auth.uid() = host_id or public.has_admin_role())
  and exists (
    select 1
    from public.sports
    where sports.id = activities.sport_id
  )
);

drop policy if exists "Users can delete their own activity covers" on storage.objects;
create policy "Users and admins can delete activity covers"
on storage.objects for delete
using (
  bucket_id = 'activity-covers'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_admin_role()
  )
);
