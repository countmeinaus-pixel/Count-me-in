-- The send-push Edge Function reads the database with the server key
-- (role service_role). Earlier migrations revoked table permissions, so it got
-- "permission denied" on the chat tables and could not find anyone to notify.
-- service_role is only used server-side (Supabase and Edge Functions), never in
-- the browser, and it already bypasses Row Level Security.
-- Safe to run more than once.

grant usage on schema public to service_role;
grant select on all tables in schema public to service_role;
-- send-push removes devices that turned push off.
grant delete on public.push_subscriptions to service_role;
