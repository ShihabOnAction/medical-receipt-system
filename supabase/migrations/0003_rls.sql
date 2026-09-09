-- =====================================================================
-- 0003_rls.sql
-- Row Level Security.
--
-- The Node API talks to Postgres with the service_role key and therefore
-- bypasses RLS - business rules live in the API. These policies are the
-- second line of defence: if the browser (anon key) ever reaches a table
-- directly, it must still be unable to read or change anything it should
-- not.
-- =====================================================================

alter table public.profiles      enable row level security;
alter table public.tests         enable row level security;
alter table public.receipts      enable row level security;
alter table public.receipt_items enable row level security;
alter table public.settings      enable row level security;
alter table public.audit_logs    enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- A user may never promote themselves or change their own status.
    -- These helpers are SECURITY DEFINER on purpose: reading profiles with a
    -- plain sub-select inside a policy ON profiles would recurse.
    and role = public.current_role_name()
    and status = public.current_status()
  );

-- No INSERT/DELETE policy for authenticated: profile rows are created by
-- the auth trigger / API only.

-- ---------------------------------------------------------------------
-- tests
-- ---------------------------------------------------------------------
drop policy if exists tests_select_active on public.tests;
create policy tests_select_active on public.tests
  for select to authenticated
  using ((is_active and public.is_approved()) or public.is_admin());

drop policy if exists tests_admin_write on public.tests;
create policy tests_admin_write on public.tests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------
drop policy if exists receipts_select_own on public.receipts;
create policy receipts_select_own on public.receipts
  for select to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_approved())
  );

-- Creation goes exclusively through the API / create_receipt() so that
-- serial numbers and totals cannot be forged. No insert policy on purpose.

drop policy if exists receipts_admin_update on public.receipts;
create policy receipts_admin_update on public.receipts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- receipt_items
-- ---------------------------------------------------------------------
drop policy if exists receipt_items_select on public.receipt_items;
create policy receipt_items_select on public.receipt_items
  for select to authenticated
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id
        and (public.is_admin() or (r.created_by = auth.uid() and public.is_approved()))
    )
  );

-- ---------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------
drop policy if exists settings_select_all on public.settings;
create policy settings_select_all on public.settings
  for select to authenticated
  using (public.is_approved());

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs (admin read only; writes happen server-side)
-- ---------------------------------------------------------------------
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Function execution: these RPCs are called by the API (service_role) only.
--
-- Postgres grants EXECUTE to PUBLIC when a function is created, so the
-- revoke has to be followed by an explicit grant - otherwise service_role
-- loses the privilege along with everyone else and every RPC fails with
-- "permission denied for function".
-- ---------------------------------------------------------------------
revoke all on function public.create_receipt(uuid, jsonb, uuid[], numeric, text) from public, anon, authenticated;
revoke all on function public.void_receipt(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.next_receipt_serial() from public, anon, authenticated;
revoke all on function public.dashboard_stats(uuid, boolean) from public, anon, authenticated;
revoke all on function public.collection_series(uuid, boolean, int) from public, anon, authenticated;

grant execute on function public.create_receipt(uuid, jsonb, uuid[], numeric, text) to service_role;
grant execute on function public.void_receipt(uuid, uuid, text) to service_role;
grant execute on function public.next_receipt_serial() to service_role;
grant execute on function public.dashboard_stats(uuid, boolean) to service_role;
grant execute on function public.collection_series(uuid, boolean, int) to service_role;

-- The RLS helpers are called from inside policies, so authenticated needs them.
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_approved() to authenticated, service_role;
grant execute on function public.current_role_name() to authenticated, service_role;
grant execute on function public.current_status() to authenticated, service_role;

-- Never expose the sequence to the browser.
revoke all on sequence public.receipt_serial_seq from public, anon, authenticated;
grant usage, select on sequence public.receipt_serial_seq to service_role;
