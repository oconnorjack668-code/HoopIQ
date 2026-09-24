-- 00008_api_role_grants.sql
-- Newer Supabase projects no longer grant the API roles access to tables created
-- in the SQL editor, which shows up in the app as "permission denied for table ...".
-- Row Level Security (00001-00007) still decides WHICH rows a player can touch;
-- these grants only allow the logged-in role to reach the tables at all.
-- Safe to re-run.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Logged-in players: table access, filtered by each table's RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Server-side admin jobs (AI credits, account deletion) use the service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Logged-out visitors never read app data directly
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Tables added by future migrations get the same access automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- Functions: helpers used by policies stay callable; admin-only functions are locked down.
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO authenticated, service_role;

-- handle_new_user only runs from the signup trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- provision_owner (seed.sql) grants owner access; it must only be run from the SQL editor.
-- Without this, any logged-in player could call it through the API on their own email.
DO $$
BEGIN
  IF to_regprocedure('public.provision_owner(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.provision_owner(text) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
