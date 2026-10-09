-- ============================================================================
-- Focus CaseX — Row Level Security policies for static (browser-direct) mode
-- ----------------------------------------------------------------------------
-- In static deployments the browser talks to PostgREST directly with the
-- publishable key, so RLS decides everything:
--   · anon (not signed in)          → zero access on every table
--   · authenticated (clinic logins) → full CRUD on every table
-- All 9 tables must already have RLS ENABLED (see schema.sql).
-- Run once in the Supabase SQL Editor or via scripts/apply-supabase-policies.ts
-- ============================================================================

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists "authenticated_full_access" on %I', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true)',
      t);
    raise notice 'policy applied to %', t;
  end loop;
end $$;
