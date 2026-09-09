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
