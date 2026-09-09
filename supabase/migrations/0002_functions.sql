-- =====================================================================
-- 0002_functions.sql
-- Helper functions, concurrency-safe serial numbers, atomic receipt
-- creation, and the auth.users -> profiles bridge.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Role helpers (used by RLS policies; security definer avoids recursion)
-- ---------------------------------------------------------------------
create or replace function public.current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select role from public.profiles where id = auth.uid();
$fn$;

create or replace function public.current_status()
returns user_status
language sql
stable
security definer
set search_path = public
as $fn$
  select status from public.profiles where id = auth.uid();
$fn$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'APPROVED'
  );
$fn$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'APPROVED'
  );
$fn$;

-- ---------------------------------------------------------------------
-- Serial number: nextval() is transaction-safe and never hands the same
-- value to two concurrent sessions.
-- ---------------------------------------------------------------------
create or replace function public.next_receipt_serial()
returns bigint
language sql
volatile
as $fn$
  select nextval('public.receipt_serial_seq');
$fn$;

-- ---------------------------------------------------------------------
-- Atomic receipt creation.
-- Prices ALWAYS come from public.tests inside this transaction; the
-- caller-supplied total is only used as an optimistic-concurrency check
-- so a price change mid-flight surfaces as an error instead of a wrong
-- receipt.
-- ---------------------------------------------------------------------
create or replace function public.create_receipt(
  p_created_by      uuid,
  p_payload         jsonb,
  p_test_ids        uuid[],
  p_expected_total  numeric,
  p_amount_in_words text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_receipt_id uuid;
  v_serial     bigint;
  v_total      numeric(12,2) := 0;
  v_count      int;
  v_ids        uuid[];
begin
  -- de-duplicate while preserving the order the staff selected
  select array_agg(t.id order by t.ord)
    into v_ids
  from (
    select distinct on (x.id) x.id, x.ord
    from unnest(p_test_ids) with ordinality as x(id, ord)
    order by x.id, x.ord
  ) t;

  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'NO_TESTS_SELECTED' using errcode = 'P0001';
  end if;

  select count(*), coalesce(sum(price), 0)
    into v_count, v_total
  from public.tests
  where id = any (v_ids) and is_active = true;

  if v_count <> array_length(v_ids, 1) then
    raise exception 'INVALID_OR_INACTIVE_TEST' using errcode = 'P0002';
  end if;

  if p_expected_total is not null and round(p_expected_total, 2) <> round(v_total, 2) then
    raise exception 'PRICE_CHANGED:%', v_total using errcode = 'P0003';
  end if;

  v_serial := nextval('public.receipt_serial_seq');

  insert into public.receipts (
    serial_number, receipt_date, patient_name, age, age_unit, sex, ref_by,
    opd_ward, bed_number, reg_number, total_amount, amount_in_words,
    report_delivery_date, report_delivery_time, bank_officer, prepared_by,
    remarks, created_by
  )
  values (
    v_serial,
    coalesce((p_payload ->> 'receiptDate')::date, (now() at time zone 'Asia/Dhaka')::date),
    p_payload ->> 'patientName',
    nullif(p_payload ->> 'age', '')::int,
    coalesce(nullif(p_payload ->> 'ageUnit', ''), 'Y'),
    (p_payload ->> 'sex')::patient_sex,
    nullif(p_payload ->> 'refBy', ''),
    nullif(p_payload ->> 'opdWard', ''),
    nullif(p_payload ->> 'bedNumber', ''),
    nullif(p_payload ->> 'regNumber', ''),
    v_total,
    coalesce(p_amount_in_words, ''),
    nullif(p_payload ->> 'reportDeliveryDate', '')::date,
    nullif(p_payload ->> 'reportDeliveryTime', ''),
    nullif(p_payload ->> 'bankOfficer', ''),
    nullif(p_payload ->> 'preparedBy', ''),
    nullif(p_payload ->> 'remarks', ''),
    p_created_by
  )
  returning id into v_receipt_id;

  insert into public.receipt_items (receipt_id, test_id, test_name, unit_price, quantity, line_total, line_no)
  select v_receipt_id, t.id, t.name, t.price, 1, t.price, ord.n
  from unnest(v_ids) with ordinality as ord(tid, n)
  join public.tests t on t.id = ord.tid;

  return jsonb_build_object(
    'id', v_receipt_id,
    'serial_number', v_serial,
    'total_amount', v_total
  );
end;
$fn$;

-- ---------------------------------------------------------------------
-- Void (cancel) a receipt - the controlled alternative to editing or
-- deleting a financial record.
-- ---------------------------------------------------------------------
create or replace function public.void_receipt(
  p_receipt_id uuid,
  p_admin_id   uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_row public.receipts;
begin
  select * into v_row from public.receipts where id = p_receipt_id for update;

  if not found then
    raise exception 'RECEIPT_NOT_FOUND' using errcode = 'P0004';
  end if;

  if v_row.status = 'VOID' then
    raise exception 'RECEIPT_ALREADY_VOID' using errcode = 'P0005';
  end if;

  update public.receipts
     set status = 'VOID',
         void_reason = p_reason,
         voided_by = p_admin_id,
         voided_at = now()
   where id = p_receipt_id;

  return jsonb_build_object('id', p_receipt_id, 'status', 'VOID');
end;
$fn$;

-- ---------------------------------------------------------------------
-- Dashboard statistics (single round-trip)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats(p_user_id uuid, p_is_admin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_today date := (now() at time zone 'Asia/Dhaka')::date;
begin
  if p_is_admin then
    return jsonb_build_object(
      'totalStaff',      (select count(*) from public.profiles where role = 'STAFF'),
      'pendingStaff',    (select count(*) from public.profiles where status = 'PENDING'),
      'approvedStaff',   (select count(*) from public.profiles where status = 'APPROVED' and role = 'STAFF'),
      'totalReceipts',   (select count(*) from public.receipts where status = 'ACTIVE'),
      'todayReceipts',   (select count(*) from public.receipts where status = 'ACTIVE' and receipt_date = v_today),
      'totalTests',      (select count(*) from public.tests),
      'activeTests',     (select count(*) from public.tests where is_active),
      'totalCollected',  (select coalesce(sum(total_amount), 0) from public.receipts where status = 'ACTIVE'),
      'todayCollected',  (select coalesce(sum(total_amount), 0) from public.receipts where status = 'ACTIVE' and receipt_date = v_today)
    );
  else
    return jsonb_build_object(
      'totalReceipts',  (select count(*) from public.receipts where created_by = p_user_id and status = 'ACTIVE'),
      'todayReceipts',  (select count(*) from public.receipts where created_by = p_user_id and status = 'ACTIVE' and receipt_date = v_today),
      'totalCollected', (select coalesce(sum(total_amount), 0) from public.receipts where created_by = p_user_id and status = 'ACTIVE'),
      'todayCollected', (select coalesce(sum(total_amount), 0) from public.receipts where created_by = p_user_id and status = 'ACTIVE' and receipt_date = v_today),
      'activeTests',    (select count(*) from public.tests where is_active)
    );
  end if;
end;
$fn$;

-- ---------------------------------------------------------------------
-- Daily collection series for the dashboard chart
-- ---------------------------------------------------------------------
create or replace function public.collection_series(p_user_id uuid, p_is_admin boolean, p_days int default 14)
returns table (day date, receipts bigint, amount numeric)
language sql
security definer
set search_path = public
as $fn$
  select d::date as day,
         count(r.id) as receipts,
         coalesce(sum(r.total_amount), 0) as amount
  from generate_series(
         (now() at time zone 'Asia/Dhaka')::date - (p_days - 1),
         (now() at time zone 'Asia/Dhaka')::date,
         interval '1 day') d
  left join public.receipts r
    on r.receipt_date = d::date
   and r.status = 'ACTIVE'
   and (p_is_admin or r.created_by = p_user_id)
  group by d
  order by d;
$fn$;

-- ---------------------------------------------------------------------
-- auth.users -> profiles bridge.
-- Covers users created straight from the Supabase dashboard; the API
-- registration route creates the profile itself and this stays a no-op
-- thanks to ON CONFLICT.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'STAFF'),
    coalesce((new.raw_user_meta_data ->> 'status')::user_status, 'PENDING')
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Receipts and their items are append-only for everyone except the
-- controlled void path above.
-- ---------------------------------------------------------------------
create or replace function public.block_receipt_item_mutation()
returns trigger
language plpgsql
as $fn$
begin
  raise exception 'RECEIPT_ITEMS_ARE_IMMUTABLE' using errcode = 'P0006';
end;
$fn$;

drop trigger if exists trg_receipt_items_immutable on public.receipt_items;
create trigger trg_receipt_items_immutable
  before update or delete on public.receipt_items
  for each row execute function public.block_receipt_item_mutation();
