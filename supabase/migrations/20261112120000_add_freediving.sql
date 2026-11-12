-- Freediving as its own sport (Port Noarlunga reef is an aquatic reserve:
-- freediving and snorkelling are fine there, spearfishing is not).
-- Safe to run more than once.
insert into public.sports (name, icon)
values ('Freediving', 'shell')
on conflict (name) do nothing;
