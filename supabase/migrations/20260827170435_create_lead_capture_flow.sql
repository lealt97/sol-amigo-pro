create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists public.lead_capture_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  name text not null default 'Formulário principal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capture_form_id uuid references public.lead_capture_forms(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  phone_normalized text not null check (char_length(phone_normalized) between 8 and 20),
  email text,
  city text not null check (char_length(city) between 2 and 120),
  state text not null check (state ~ '^[A-Z]{2}$'),
  property_type text not null check (property_type in ('Residencial', 'Comercial', 'Rural', 'Industrial')),
  average_monthly_bill numeric(12,2) check (average_monthly_bill is null or average_monthly_bill >= 0),
  average_consumption_kwh numeric(12,2) check (average_consumption_kwh is null or average_consumption_kwh >= 0),
  distributor text,
  property_status text check (property_status is null or property_status in ('Próprio', 'Alugado', 'Em construção', 'Outro')),
  installation_timeframe text,
  preferred_contact_time text,
  status text not null default 'novo' check (
    status in ('novo', 'em_contato', 'qualificado', 'em_estudo', 'proposta_enviada', 'negociacao', 'ganho', 'perdido')
  ),
  responsible text,
  source text not null default 'Formulário do site',
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  consent_at timestamptz not null,
  next_activity_at timestamptz,
  last_submission_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  due_at timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'concluida')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_id_status_updated_at_idx
  on public.leads (user_id, status, updated_at desc);

create index if not exists leads_user_id_phone_created_at_idx
  on public.leads (user_id, phone_normalized, created_at desc);

create index if not exists leads_user_id_email_created_at_idx
  on public.leads (user_id, lower(email), created_at desc)
  where email is not null;

create index if not exists lead_tasks_user_id_status_due_at_idx
  on public.lead_tasks (user_id, status, due_at);

create index if not exists lead_tasks_lead_id_idx
  on public.lead_tasks (lead_id);

alter table public.lead_capture_forms enable row level security;
alter table public.leads enable row level security;
alter table public.lead_tasks enable row level security;

create policy "lead_capture_forms_select_own"
  on public.lead_capture_forms for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "lead_capture_forms_insert_own"
  on public.lead_capture_forms for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "lead_capture_forms_update_own"
  on public.lead_capture_forms for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "leads_select_own"
  on public.leads for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "leads_update_own"
  on public.leads for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "leads_delete_own"
  on public.leads for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "lead_tasks_select_own"
  on public.lead_tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "lead_tasks_insert_own"
  on public.lead_tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "lead_tasks_update_own"
  on public.lead_tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "lead_tasks_delete_own"
  on public.lead_tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update on public.lead_capture_forms to authenticated;
grant select, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_tasks to authenticated;

grant select, insert, update, delete on public.lead_capture_forms to service_role;
grant select, insert, update, delete on public.leads to service_role;
grant select, insert, update, delete on public.lead_tasks to service_role;

revoke all on public.lead_capture_forms from anon;
revoke all on public.leads from anon;
revoke all on public.lead_tasks from anon;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists lead_capture_forms_set_updated_at on public.lead_capture_forms;
create trigger lead_capture_forms_set_updated_at
before update on public.lead_capture_forms
for each row execute function private.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();

drop trigger if exists lead_tasks_set_updated_at on public.lead_tasks;
create trigger lead_tasks_set_updated_at
before update on public.lead_tasks
for each row execute function private.set_updated_at();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'leads'
    ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end
$$;
