-- =====================================================================
-- ALL MIGRATIONS IN ONE FILE
-- Convenience copy for the Supabase SQL editor: paste this whole file
-- and press Run once. It is 0001 + 0002 + 0003 + 0004 + 0005 in order.
-- The editor wraps it in a transaction, so if anything fails, nothing
-- is half-applied.
-- =====================================================================


-- ############### 0001_schema.sql ###############

-- =====================================================================
-- 0001_schema.sql
-- Medical Receipt System - core schema
-- Target: Supabase PostgreSQL
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('ADMIN', 'STAFF');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type patient_sex as enum ('MALE', 'FEMALE', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type receipt_status as enum ('ACTIVE', 'VOID');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text        not null check (length(btrim(full_name)) between 2 and 120),
  email         citext      not null unique,
  role          user_role   not null default 'STAFF',
  status        user_status not null default 'PENDING',
  phone         text,
  designation   text,
  approved_by   uuid references public.profiles(id) on delete set null,
  approved_at   timestamptz,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx   on public.profiles(role);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- tests (catalogue of investigations)
-- ---------------------------------------------------------------------
create table if not exists public.tests (
  id            uuid primary key default gen_random_uuid(),
  name          text    not null unique check (length(btrim(name)) between 2 and 200),
  short_code    text,
  category      text    not null default 'GENERAL',
  price         numeric(12,2) not null check (price >= 0),
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tests_active_idx on public.tests(is_active, display_order);

drop trigger if exists trg_tests_updated_at on public.tests;
create trigger trg_tests_updated_at
  before update on public.tests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------
create sequence if not exists public.receipt_serial_seq
  as bigint start with 1 increment by 1 minvalue 1 no maxvalue cache 1;

create table if not exists public.receipts (
  id                   uuid primary key default gen_random_uuid(),
  serial_number        bigint not null unique,
  receipt_date         date   not null default (now() at time zone 'Asia/Dhaka')::date,

  patient_name         text   not null check (length(btrim(patient_name)) between 2 and 150),
  age                  integer check (age between 0 and 150),
  age_unit             text   not null default 'Y' check (age_unit in ('Y','M','D')),
  sex                  patient_sex not null,
  ref_by               text,

  -- fields carried over from the printed pad
  opd_ward             text,
  bed_number           text,
  reg_number           text,

  total_amount         numeric(12,2) not null check (total_amount >= 0),
  amount_in_words      text not null default '',

  report_delivery_date date,
  report_delivery_time text,
  bank_officer         text,
  prepared_by          text,
  remarks              text,

  status               receipt_status not null default 'ACTIVE',
  void_reason          text,
  voided_by            uuid references public.profiles(id) on delete set null,
  voided_at            timestamptz,

  created_by           uuid not null references public.profiles(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists receipts_created_by_idx on public.receipts(created_by, created_at desc);
create index if not exists receipts_created_at_idx on public.receipts(created_at desc);
create index if not exists receipts_serial_idx     on public.receipts(serial_number desc);
create index if not exists receipts_date_idx       on public.receipts(receipt_date desc);
create index if not exists receipts_search_idx     on public.receipts
  using gin (to_tsvector('simple', coalesce(patient_name, '') || ' ' || coalesce(ref_by, '')));

drop trigger if exists trg_receipts_updated_at on public.receipts;
create trigger trg_receipts_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- receipt_items  (price + name snapshot => immutable financial history)
-- ---------------------------------------------------------------------
create table if not exists public.receipt_items (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.receipts(id) on delete cascade,
  test_id     uuid references public.tests(id) on delete set null,
  test_name   text not null,
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  quantity    integer not null default 1 check (quantity > 0),
  line_total  numeric(12,2) not null check (line_total >= 0),
  line_no     integer not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists receipt_items_receipt_idx on public.receipt_items(receipt_id, line_no);

-- ---------------------------------------------------------------------
-- settings  (single row, id = 1) - everything printable is configurable
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                  smallint primary key default 1 check (id = 1),
  hospital_name       text not null default 'Bangladesh Medical University',
  hospital_name_bn    text not null default '',
  hospital_address    text not null default 'Shahbag, Dhaka-1000',
  department_name     text not null default 'DEPARTMENT OF NEUROLOGY',
  receipt_title       text not null default 'MONEY RECEIPT REQUIRED TEST LIST',
  logo_url            text not null default '/logo.png',
  bank_name           text not null default 'PUBALI BANK PLC',
  bank_account_label  text not null default 'Account Number',
  bank_account_number text not null default '0947901026627',
  currency_symbol     text not null default 'Tk.',
  currency_word       text not null default 'Taka',
  footer_note         text not null default '',
  -- dynamic print / theme configuration
  serial_padding      smallint not null default 6 check (serial_padding between 3 and 10),
  serial_prefix       text not null default '',
  print_table_rows    smallint not null default 12 check (print_table_rows between 1 and 40),
  theme_primary       text not null default '#0f766e',
  theme_accent        text not null default '#0284c7',
  pdf_font_family     text not null default 'Helvetica, Arial, sans-serif',
  pdf_base_font_size  smallint not null default 12 check (pdf_base_font_size between 8 and 20),
  show_bank_box       boolean not null default true,
  show_ward_fields    boolean not null default true,
  updated_by          uuid references public.profiles(id) on delete set null,
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  user_email  text,
  action      text not null,
  entity_type text,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_user_idx       on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_action_idx     on public.audit_logs(action);

-- ############### 0002_functions.sql ###############

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

-- ############### 0003_rls.sql ###############

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

-- ############### 0004_seed.sql ###############

-- =====================================================================
-- 0004_seed.sql
-- Hospital settings + the investigation catalogue printed on the pad.
-- Prices live here, never in the frontend.
-- =====================================================================

insert into public.settings (id) values (1)
on conflict (id) do nothing;

insert into public.tests (name, short_code, category, price, display_order) values
  ('Digital EEG',                                                  'EEG',        'EEG',      1200,  10),

  ('EMG - Left Upper Limb',                                        'EMG-LUL',    'EMG',      1000,  20),
  ('EMG - Right Upper Limb',                                       'EMG-RUL',    'EMG',      1000,  30),
  ('EMG - Left Lower Limb',                                        'EMG-LLL',    'EMG',      1000,  40),
  ('EMG - Right Lower Limb',                                       'EMG-RLL',    'EMG',      1000,  50),

  ('NCS - Left Upper Limb',                                        'NCS-LUL',    'NCS',      1000,  60),
  ('NCS - Right Upper Limb',                                       'NCS-RUL',    'NCS',      1000,  70),
  ('NCS - Left Lower Limb',                                        'NCS-LLL',    'NCS',      1000,  80),
  ('NCS - Right Lower Limb',                                       'NCS-RLL',    'NCS',      1000,  90),

  ('NCS of Both Upper Limbs',                                      'NCS-BUL',    'NCS',      1500, 100),
  ('NCS of Both Lower Limbs',                                      'NCS-BLL',    'NCS',      1500, 110),
  ('EMG of Both Upper Limbs',                                      'EMG-BUL',    'EMG',      2000, 120),
  ('EMG of Both Lower Limbs',                                      'EMG-BLL',    'EMG',      2000, 130),

  ('NCS of All 4 Limbs',                                           'NCS-4L',     'NCS',      2500, 140),
  ('EMG of All 4 Limbs',                                           'EMG-4L',     'EMG',      2500, 150),

  ('EMG & NCS of Both Upper Limbs',                                'EN-BUL',     'EMG_NCS',  2500, 160),
  ('EMG & NCS of Both Lower Limbs',                                'EN-BLL',     'EMG_NCS',  2500, 170),
  ('EMG & NCS of All 4 Limbs',                                     'EN-4L',      'EMG_NCS',  5000, 180),

  ('NCS of Facial Nerves',                                         'NCS-FACE',   'NCS',      1000, 190),
  ('EMG of Facial Muscles',                                        'EMG-FACE',   'EMG',      1500, 200),

  ('NCS of Brachial Plexus (One Side)',                            'NCS-BP1',    'NCS',      1500, 210),
  ('NCS of Brachial Plexus (Both Side)',                           'NCS-BP2',    'NCS',      2500, 220),
  ('NCS & EMG of Brachial Plexus (One Side)',                      'EN-BP1',     'EMG_NCS',  2000, 230),
  ('NCS & EMG of Brachial Plexus (Both Side)',                     'EN-BP2',     'EMG_NCS',  3000, 240),

  ('NCS of One Upper & One Lower Limb',                            'NCS-1U1L',   'NCS',      1500, 250),
  ('EMG of One Upper & One Lower Limb',                            'EMG-1U1L',   'EMG',      1500, 260),
  ('EMG & NCS of One Upper & One Lower Limb',                      'EN-1U1L',    'EMG_NCS',  2500, 270),

  ('Carotid Duplex Study',                                         'CDS',        'DOPPLER',  1200, 280),
  ('Transcranial Doppler / Transcranial Color Coded Duplex Study', 'TCD',        'DOPPLER',  2500, 290)
on conflict (name) do nothing;

-- ############### 0005_bootstrap_admin.sql ###############

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
