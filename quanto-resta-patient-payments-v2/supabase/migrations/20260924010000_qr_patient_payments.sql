-- Dedicated qr_ tables in the existing project. No existing table is altered.
create table public.qr_patients (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) <= 120),
  default_monthly_amount_cents bigint not null check (default_monthly_amount_cents >= 0),
  active boolean not null default true,
  archived_at timestamptz,
  archived_from_month integer,
  created_month integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(id, owner_user_id)
);

create table public.qr_patient_months (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  year integer not null check (year between 1900 and 3000),
  month integer not null check (month between 1 and 12),
  expected_amount_cents bigint not null check (expected_amount_cents >= 0),
  paid_amount_cents bigint not null check (paid_amount_cents >= 0),
  included boolean not null default true,
  force_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(patient_id, year, month),
  foreign key (patient_id, owner_user_id) references public.qr_patients(id, owner_user_id) on delete cascade
);

create index qr_patients_owner_idx on public.qr_patients(owner_user_id);
create index qr_months_owner_month_idx on public.qr_patient_months(owner_user_id, year, month);

-- A tombstoned patient keeps only opaque IDs. Old offline upserts cannot resurrect it.
create function public.qr_guard_patient() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_user_id <> old.owner_user_id or new.id <> old.id then
      raise exception 'Patient ownership and ID are immutable';
    end if;
    if old.deleted_at is not null then return old; end if;
  end if;
  if new.deleted_at is not null then
    new.display_name := '';
    new.default_monthly_amount_cents := 0;
    new.active := false;
    new.archived_at := null;
    new.archived_from_month := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger qr_guard_patient_before before insert or update on public.qr_patients
  for each row execute function public.qr_guard_patient();

create function public.qr_purge_patient_months() returns trigger language plpgsql as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    delete from public.qr_patient_months where patient_id = new.id;
  end if;
  return null;
end $$;
create trigger qr_purge_patient_after after update on public.qr_patients
  for each row execute function public.qr_purge_patient_months();

create function public.qr_guard_month() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (new.owner_user_id <> old.owner_user_id or new.patient_id <> old.patient_id or new.id <> old.id) then
    raise exception 'Month ownership and identity are immutable';
  end if;
  if exists(select 1 from public.qr_patients p where p.id = new.patient_id and p.deleted_at is not null) then
    raise exception 'Deleted patients cannot receive payments';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger qr_guard_month_before before insert or update on public.qr_patient_months
  for each row execute function public.qr_guard_month();

alter table public.qr_patients enable row level security;
alter table public.qr_patient_months enable row level security;

create policy qr_patients_select on public.qr_patients for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy qr_patients_insert on public.qr_patients for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy qr_patients_update on public.qr_patients for update to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy qr_patients_delete on public.qr_patients for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy qr_months_select on public.qr_patient_months for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy qr_months_insert on public.qr_patient_months for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy qr_months_update on public.qr_patient_months for update to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy qr_months_delete on public.qr_patient_months for delete to authenticated
  using (owner_user_id = (select auth.uid()));

grant select, insert, update, delete on public.qr_patients, public.qr_patient_months to authenticated;
revoke all on public.qr_patients, public.qr_patient_months from anon;

comment on table public.qr_patients is 'Pseudonymous patient billing aliases only; no clinical content.';
comment on table public.qr_patient_months is 'Month-scoped financial snapshots in integer cents.';
