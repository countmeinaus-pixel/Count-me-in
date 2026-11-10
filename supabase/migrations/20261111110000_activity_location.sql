-- Optional address and map pin for an activity's meeting spot.

alter table public.activities
  add column if not exists address text not null default '' check (char_length(address) <= 200),
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);

alter table public.activities
  drop constraint if exists activities_map_pin_complete;
alter table public.activities
  add constraint activities_map_pin_complete
  check ((latitude is null) = (longitude is null));
