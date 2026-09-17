create table if not exists public.solar_sizings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  consumer_unit_id uuid not null references public.consumer_units(id) on delete cascade,
  calculation_version text not null default 'sa-sizing-v1'
    check (calculation_version = 'sa-sizing-v1'),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'concluido')),
  connection_type text not null
    check (connection_type in ('Monofásica', 'Bifásica', 'Trifásica')),
  monthly_consumption_kwh numeric[] not null
    check (cardinality(monthly_consumption_kwh) = 12),
  monthly_sun_hours numeric[] not null
    check (cardinality(monthly_sun_hours) = 12),
  target_coverage_percent numeric(6,2) not null
    check (target_coverage_percent between 1 and 150),
  future_consumption_kwh numeric(14,3) not null default 0
    check (future_consumption_kwh between 0 and 1000000),
  inclination_factor numeric(7,4) not null default 1
    check (inclination_factor between 0.5 and 1.5),
  temperature_loss_percent numeric(6,2) not null
    check (temperature_loss_percent between 0 and 50),
  other_losses_percent numeric(6,2) not null
    check (other_losses_percent between 0 and 50),
  transformer_loss_percent numeric(6,2) not null default 0
    check (transformer_loss_percent between 0 and 20),
  module_power_w numeric(9,2) not null
    check (module_power_w between 50 and 2000),
  module_area_m2 numeric(8,3) not null
    check (module_area_m2 between 0.1 and 20),
  inverter_power_kw numeric(12,3) not null
    check (inverter_power_kw between 0.1 and 10000),
  inverter_count integer not null default 1
    check (inverter_count between 1 and 1000),
  average_consumption_kwh numeric(14,3) not null check (average_consumption_kwh >= 0),
  availability_cost_kwh numeric(8,2) not null check (availability_cost_kwh >= 0),
  compensable_consumption_kwh numeric(14,3) not null check (compensable_consumption_kwh >= 0),
  design_consumption_kwh numeric(14,3) not null check (design_consumption_kwh >= 0),
  average_corrected_sun_hours numeric(8,4) not null check (average_corrected_sun_hours > 0),
  total_loss_percent numeric(6,2) not null check (total_loss_percent between 0 and 80),
  performance_ratio numeric(8,5) not null check (performance_ratio between 0.2 and 1),
  theoretical_power_kwp numeric(14,4) not null check (theoretical_power_kwp >= 0),
  required_power_kwp numeric(14,4) not null check (required_power_kwp >= 0),
  modules_count integer not null check (modules_count >= 0),
  installed_power_kwp numeric(14,4) not null check (installed_power_kwp >= 0),
  estimated_monthly_generation_kwh numeric(14,3) not null check (estimated_monthly_generation_kwh >= 0),
  estimated_annual_generation_kwh numeric(16,3) not null check (estimated_annual_generation_kwh >= 0),
  estimated_coverage_percent numeric(9,2) not null check (estimated_coverage_percent >= 0),
  estimated_area_m2 numeric(14,3) not null check (estimated_area_m2 >= 0),
  dc_ac_ratio numeric(9,4) not null check (dc_ac_ratio >= 0),
  monthly_generation_kwh numeric[] not null
    check (cardinality(monthly_generation_kwh) = 12),
  notes text check (notes is null or char_length(notes) <= 4000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solar_sizings_total_loss_check check (
    temperature_loss_percent + other_losses_percent + transformer_loss_percent <= 80
  ),
  constraint solar_sizings_completion_check check (
    (status = 'rascunho') or (status = 'concluido' and completed_at is not null)
  )
);

create index if not exists solar_sizings_user_updated_idx
  on public.solar_sizings (user_id, updated_at desc);

create index if not exists solar_sizings_consumer_unit_idx
  on public.solar_sizings (consumer_unit_id);

alter table public.solar_sizings enable row level security;

drop policy if exists "solar_sizings_select_own" on public.solar_sizings;
create policy "solar_sizings_select_own"
  on public.solar_sizings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "solar_sizings_insert_own_qualified_lead" on public.solar_sizings;
create policy "solar_sizings_insert_own_qualified_lead"
  on public.solar_sizings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.leads
      where leads.id = solar_sizings.lead_id
        and leads.user_id = (select auth.uid())
        and leads.client_id is not null
        and leads.consumer_unit_id = solar_sizings.consumer_unit_id
        and leads.status in ('qualificado', 'em_estudo', 'proposta_enviada', 'negociacao', 'ganho')
    )
    and exists (
      select 1
      from public.consumer_units
      where consumer_units.id = solar_sizings.consumer_unit_id
        and consumer_units.user_id = (select auth.uid())
    )
  );

drop policy if exists "solar_sizings_update_own_qualified_lead" on public.solar_sizings;
create policy "solar_sizings_update_own_qualified_lead"
  on public.solar_sizings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.leads
      where leads.id = solar_sizings.lead_id
        and leads.user_id = (select auth.uid())
        and leads.client_id is not null
        and leads.consumer_unit_id = solar_sizings.consumer_unit_id
        and leads.status in ('qualificado', 'em_estudo', 'proposta_enviada', 'negociacao', 'ganho')
    )
    and exists (
      select 1
      from public.consumer_units
      where consumer_units.id = solar_sizings.consumer_unit_id
        and consumer_units.user_id = (select auth.uid())
    )
  );

revoke all on public.solar_sizings from authenticated;
grant select, insert, update on public.solar_sizings to authenticated;
grant select, insert, update, delete on public.solar_sizings to service_role;
revoke all on public.solar_sizings from anon;

drop trigger if exists solar_sizings_set_updated_at on public.solar_sizings;
create trigger solar_sizings_set_updated_at
before update on public.solar_sizings
for each row execute function private.set_updated_at();

alter table public.lead_activities
  drop constraint if exists lead_activities_activity_type_check;

alter table public.lead_activities
  add constraint lead_activities_activity_type_check check (
    activity_type in (
      'lead_criado', 'status_alterado', 'contato', 'nota', 'tarefa_criada',
      'tarefa_concluida', 'qualificado', 'conversao', 'perdido', 'reaberto',
      'dimensionamento'
    )
  );

comment on table public.solar_sizings is
  'Dimensionamentos fotovoltaicos versionados e vinculados a oportunidades qualificadas.';
comment on column public.solar_sizings.performance_ratio is
  'Fração de desempenho restante após as perdas; usada como divisor da potência teórica.';
comment on column public.solar_sizings.monthly_sun_hours is
  'Horas de sol pico mensais antes da aplicação do fator de inclinação.';
