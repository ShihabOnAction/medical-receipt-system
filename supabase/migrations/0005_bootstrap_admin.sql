-- =====================================================================
-- 0005_bootstrap_admin.sql
-- Creating the first administrator.
--
-- No password is ever written here. Create the account in
--   Supabase Dashboard -> Authentication -> Users -> Add user
--   (tick "Auto Confirm User")
-- and then run ONE of the statements below with that account's e-mail.
-- =====================================================================

create or replace function public.promote_to_admin(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user auth.users;
begin
  select * into v_user from auth.users where lower(email) = lower(p_email);
  if not found then
    raise exception 'No auth user with e-mail %. Create it in Authentication -> Users first.', p_email;
  end if;

  insert into public.profiles (id, full_name, email, role, status, approved_at)
  values (
    v_user.id,
    coalesce(v_user.raw_user_meta_data ->> 'full_name', split_part(v_user.email, '@', 1)),
    v_user.email,
    'ADMIN',
    'APPROVED',
    now()
  )
  on conflict (id) do update
    set role = 'ADMIN',
        status = 'APPROVED',
        approved_at = coalesce(profiles.approved_at, now());

  insert into public.audit_logs (user_id, user_email, action, entity_type, entity_id, metadata)
  values (v_user.id, v_user.email, 'ADMIN_BOOTSTRAPPED', 'profile', v_user.id::text,
          jsonb_build_object('via', 'promote_to_admin'));

  return jsonb_build_object('id', v_user.id, 'email', v_user.email, 'role', 'ADMIN');
end;
$fn$;

-- Keep it away from the browser roles, but leave it usable by the roles that
-- actually run migrations and the SQL editor.
revoke all on function public.promote_to_admin(text) from public, anon, authenticated;
grant execute on function public.promote_to_admin(text) to postgres, service_role;

-- Run this once, with your own address.
--
-- Use the DO form, not `select promote_to_admin(...)`: the Supabase SQL
-- editor sees a bare SELECT as a read-only query and runs it in a read-only
-- transaction as an unprivileged role, which fails with
-- "permission denied for function promote_to_admin".
--
--   do $do$ begin perform public.promote_to_admin('your.admin@gmail.com'); end $do$;
--
-- Or do the same thing without the function at all:
--
--   update public.profiles
--      set role = 'ADMIN', status = 'APPROVED', approved_at = now()
--    where email = 'your.admin@gmail.com';
