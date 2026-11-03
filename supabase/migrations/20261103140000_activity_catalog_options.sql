insert into public.sports (name, icon)
values
  ('Running', 'footprints'),
  ('Hiking', 'mountain'),
  ('Spearfishing', 'fish'),
  ('Kitesurfing', 'wind'),
  ('Surfing', 'waves'),
  ('Swimming', 'waves'),
  ('Gym', 'dumbbell'),
  ('Mountain biking', 'bike'),
  ('Road cycling', 'bike'),
  ('SUP / kayak', 'sailboat'),
  ('Scuba diving', 'anchor'),
  ('Climbing / bouldering', 'mountain-snow'),
  ('Open activity', 'plus')
on conflict (name) do nothing;

drop policy if exists "Users can create their own activities" on public.activities;
create policy "Users can create their own activities"
on public.activities for insert with check (
  auth.uid() = host_id
  and exists (
    select 1
    from public.sports
    where sports.id = activities.sport_id
  )
);

drop policy if exists "Hosts can update their own activities" on public.activities;
create policy "Hosts can update their own activities"
on public.activities for update using (auth.uid() = host_id)
with check (
  auth.uid() = host_id
  and exists (
    select 1
    from public.sports
    where sports.id = activities.sport_id
  )
);

grant select on table public.activities to anon, authenticated;
grant insert, update, delete on table public.activities to authenticated;
grant select, insert on table public.activity_invites to authenticated;
