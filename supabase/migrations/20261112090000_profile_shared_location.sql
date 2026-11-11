-- Optional, approximate location a member can share (rounded to about 1 km
-- in the app). Used to show distances in km. Members who do not share it are
-- measured from the centre of their suburb instead.

alter table public.profiles
  add column if not exists shared_latitude double precision check (shared_latitude between -90 and 90),
  add column if not exists shared_longitude double precision check (shared_longitude between -180 and 180),
  add column if not exists location_shared_at timestamptz;

-- Never store more precision than about 1 km.
alter table public.profiles
  drop constraint if exists profiles_shared_location_rounded;
alter table public.profiles
  add constraint profiles_shared_location_rounded
  check (
    (shared_latitude is null and shared_longitude is null)
    or (
      shared_latitude is not null and shared_longitude is not null
      and shared_latitude = round(shared_latitude::numeric, 2)::double precision
      and shared_longitude = round(shared_longitude::numeric, 2)::double precision
    )
  );
