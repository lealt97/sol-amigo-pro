-- Complete the unified Atendimentos workflow without deleting existing data.
-- This migration intentionally follows the earlier proposal tables migration.

create extension if not exists pgcrypto with schema extensions;

-- A sizing belongs to an attendance while it is still a prospect. The consumer
-- unit is attached only after the sale is won and the lead is converted.
alter table public.solar_sizings
  alter column consumer_unit_id drop not null;

drop policy if exists "solar_sizings_insert_own_qualified_lead" on public.solar_sizings;
create policy "solar_sizings_insert_own_qualified_lead"
  on public.solar_sizings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and consumer_unit_id is null
    and exists (
      select 1
      from public.leads
      where leads.id = solar_sizings.lead_id
        and leads.user_id = (select auth.uid())
        and leads.status in ('qualificado', 'em_estudo', 'proposta_enviada', 'negociacao')
    )
  );

drop policy if exists "solar_sizings_update_own_qualified_lead" on public.solar_sizings;
create policy "solar_sizings_update_own_qualified_lead"
  on public.solar_sizings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      consumer_unit_id is null
      or exists (
        select 1
        from public.consumer_units
        where consumer_units.id = solar_sizings.consumer_unit_id
          and consumer_units.user_id = (select auth.uid())
      )
    )
    and exists (
      select 1
      from public.leads
      where leads.id = solar_sizings.lead_id
        and leads.user_id = (select auth.uid())
        and leads.status in ('qualificado', 'em_estudo', 'proposta_enviada', 'negociacao')
    )
  );

-- ---------------------------------------------------------------------------
-- Structured qualification and commercial composition
-- ---------------------------------------------------------------------------

create table if not exists public.lead_qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_type text not null check (property_type in ('Residencial', 'Comercial', 'Rural', 'Industrial')),
  property_status text check (property_status is null or property_status in ('Próprio', 'Alugado', 'Em construção', 'Outro')),
  connection_type text not null check (connection_type in ('Monofásica', 'Bifásica', 'Trifásica')),
  distributor text,
  average_monthly_bill numeric(14,2) check (average_monthly_bill is null or average_monthly_bill >= 0),
  average_consumption_kwh numeric(14,3) check (average_consumption_kwh is null or average_consumption_kwh >= 0),
  roof_type text,
  available_area_m2 numeric(12,2) check (available_area_m2 is null or available_area_m2 >= 0),
  roof_orientation text,
  has_shading text,
  decision_maker text,
  installation_timeframe text,
  responsible text,
  notes text check (notes is null or char_length(notes) <= 4000),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_qualifications_user_lead_unique unique (user_id, lead_id)
);

create index if not exists lead_qualifications_lead_idx
  on public.lead_qualifications (lead_id);

create table if not exists public.commercial_compositions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  sizing_id uuid not null references public.solar_sizings(id) on delete restrict,
  equipment_items jsonb not null default '[]'::jsonb check (jsonb_typeof(equipment_items) = 'array'),
  equipment_cost numeric(14,2) not null default 0 check (equipment_cost >= 0),
  installation_cost numeric(14,2) not null default 0 check (installation_cost >= 0),
  engineering_cost numeric(14,2) not null default 0 check (engineering_cost >= 0),
  utility_fee numeric(14,2) not null default 0 check (utility_fee >= 0),
  freight_cost numeric(14,2) not null default 0 check (freight_cost >= 0),
  other_costs numeric(14,2) not null default 0 check (other_costs >= 0),
  taxes_percent numeric(7,3) not null default 0 check (taxes_percent between 0 and 80),
  commission_percent numeric(7,3) not null default 0 check (commission_percent between 0 and 80),
  target_margin_percent numeric(7,3) not null default 0 check (target_margin_percent between 0 and 80),
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  gross_sale_price numeric(14,2) not null default 0 check (gross_sale_price >= 0),
  final_sale_price numeric(14,2) not null default 0 check (final_sale_price >= 0),
  taxes_value numeric(14,2) not null default 0 check (taxes_value >= 0),
  commission_value numeric(14,2) not null default 0 check (commission_value >= 0),
  profit numeric(14,2) not null default 0,
  real_margin_percent numeric(7,3) not null default 0,
  price_per_wp numeric(14,4) not null default 0 check (price_per_wp >= 0),
  commercial_conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(commercial_conditions) = 'object'),
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_compositions_user_lead_unique unique (user_id, lead_id)
);

create index if not exists commercial_compositions_lead_idx
  on public.commercial_compositions (lead_id);
create index if not exists commercial_compositions_sizing_idx
  on public.commercial_compositions (sizing_id);

alter table public.proposals
  add column if not exists sizing_id uuid references public.solar_sizings(id) on delete restrict,
  add column if not exists cancelled_at timestamptz,
  add column if not exists converted_at timestamptz;

alter table public.proposals drop constraint if exists proposals_status_check;
alter table public.proposals add constraint proposals_status_check check (
  status in (
    'rascunho', 'pronta', 'enviada', 'visualizada', 'em_negociacao',
    'aprovada', 'recusada', 'expirada', 'cancelada', 'convertida'
  )
);

alter table public.proposal_versions
  add column if not exists sizing_id uuid references public.solar_sizings(id) on delete restrict;

alter table public.proposal_versions drop constraint if exists proposal_versions_status_check;
alter table public.proposal_versions add constraint proposal_versions_status_check check (
  status in ('rascunho', 'pronta', 'enviada', 'visualizada', 'aprovada', 'recusada', 'expirada', 'cancelada', 'substituida')
);

create unique index if not exists proposals_user_code_unique_idx
  on public.proposals (user_id, code);

create table if not exists public.proposal_public_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) between 4 and 12),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists proposal_public_links_active_idx
  on public.proposal_public_links (proposal_id, expires_at desc)
  where revoked_at is null;
create index if not exists proposal_public_links_version_idx
  on public.proposal_public_links (proposal_version_id);

-- Preserve already-shared legacy UUID links by hashing them, then remove raw tokens.
insert into public.proposal_public_links (
  user_id, proposal_id, proposal_version_id, token_hash, token_hint, expires_at
)
select
  p.user_id,
  p.id,
  pv.id,
  encode(extensions.digest(p.public_token::text, 'sha256'), 'hex'),
  right(p.public_token::text, 6),
  coalesce((p.valid_until + 1)::timestamptz, now() + interval '30 days')
from public.proposals p
join public.proposal_versions pv
  on pv.proposal_id = p.id and pv.version_number = p.current_version_number
where p.public_token is not null
on conflict (token_hash) do nothing;

drop index if exists public.proposals_public_token_idx;
alter table public.proposals drop column if exists public_token;

-- ---------------------------------------------------------------------------
-- RLS and least-privilege grants
-- ---------------------------------------------------------------------------

alter table public.lead_qualifications enable row level security;
alter table public.commercial_compositions enable row level security;
alter table public.proposal_public_links enable row level security;

drop policy if exists "lead_qualifications_select_own" on public.lead_qualifications;
create policy "lead_qualifications_select_own"
  on public.lead_qualifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "commercial_compositions_select_own" on public.commercial_compositions;
create policy "commercial_compositions_select_own"
  on public.commercial_compositions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "proposals_insert_own" on public.proposals;
drop policy if exists "proposals_update_own" on public.proposals;
drop policy if exists "proposal_versions_insert_own" on public.proposal_versions;
drop policy if exists "proposal_versions_update_own" on public.proposal_versions;

revoke all on public.lead_qualifications from public, anon, authenticated;
grant select on public.lead_qualifications to authenticated;
grant select, insert, update, delete on public.lead_qualifications to service_role;

revoke all on public.commercial_compositions from public, anon, authenticated;
grant select on public.commercial_compositions to authenticated;
grant select, insert, update, delete on public.commercial_compositions to service_role;

revoke all on public.proposals from public, anon, authenticated;
grant select on public.proposals to authenticated;
grant select, insert, update, delete on public.proposals to service_role;

revoke all on public.proposal_versions from public, anon, authenticated;
grant select on public.proposal_versions to authenticated;
grant select, insert, update, delete on public.proposal_versions to service_role;

revoke all on public.proposal_public_links from public, anon, authenticated;
grant select, insert, update, delete on public.proposal_public_links to service_role;

-- Client records are materialized only by the transactional win conversion.
revoke insert, update, delete on public.clients from authenticated;
revoke insert, update, delete on public.consumer_units from authenticated;

-- The public capture Edge Function uses service_role and remains functional.
alter table private.lead_capture_rate_limits enable row level security;
revoke all on private.lead_capture_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on private.lead_capture_rate_limits to service_role;

drop trigger if exists lead_qualifications_set_updated_at on public.lead_qualifications;
create trigger lead_qualifications_set_updated_at
before update on public.lead_qualifications
for each row execute function private.set_updated_at();

drop trigger if exists commercial_compositions_set_updated_at on public.commercial_compositions;
create trigger commercial_compositions_set_updated_at
before update on public.commercial_compositions
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Version immutability and lead state machine
-- ---------------------------------------------------------------------------

create or replace function private.guard_proposal_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('app.proposal_version_write', true) is distinct from 'on' then
    raise exception 'Versões de proposta só podem ser alteradas pelo fluxo seguro.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_proposal_version_update() from public, anon, authenticated;

drop trigger if exists guard_proposal_version_update on public.proposal_versions;
create trigger guard_proposal_version_update
before update or delete on public.proposal_versions
for each row execute function private.guard_proposal_version_update();

create or replace function private.enforce_lead_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'novo' then new.status in ('em_contato', 'perdido')
    when 'em_contato' then new.status in ('qualificado', 'perdido')
    when 'qualificado' then new.status in ('em_estudo', 'perdido')
    when 'em_estudo' then new.status in ('proposta_enviada', 'perdido')
    when 'proposta_enviada' then new.status in ('negociacao', 'ganho', 'perdido')
    when 'negociacao' then new.status in ('proposta_enviada', 'ganho', 'perdido')
    when 'perdido' then new.status = 'em_contato'
    else false
  end;

  if not v_allowed then
    raise exception 'Transição inválida: % → %.', old.status, new.status using errcode = '22023';
  end if;

  if new.status in ('qualificado', 'em_estudo') and not exists (
    select 1 from public.lead_qualifications q
    where q.lead_id = old.id and q.user_id = old.user_id and q.completed
  ) then
    raise exception 'Conclua a qualificação antes de avançar.' using errcode = '22023';
  end if;

  if new.status = 'proposta_enviada' and (
    not exists (
      select 1 from public.solar_sizings s
      where s.lead_id = old.id and s.user_id = old.user_id and s.status = 'concluido'
    )
    or not exists (
      select 1 from public.proposals p
      where p.lead_id = old.id and p.user_id = old.user_id
        and p.status in ('enviada', 'visualizada', 'em_negociacao')
    )
  ) then
    raise exception 'Dimensionamento concluído e proposta enviada são obrigatórios.' using errcode = '22023';
  end if;

  if new.status = 'ganho' and not exists (
    select 1 from public.proposals p
    where p.lead_id = old.id and p.user_id = old.user_id
      and p.status in ('aprovada', 'convertida')
  ) then
    raise exception 'A proposta precisa estar aprovada antes de concluir a venda.' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_lead_status_transition() from public, anon, authenticated;

drop trigger if exists enforce_lead_status_transition on public.leads;
create trigger enforce_lead_status_transition
before update of status on public.leads
for each row execute function private.enforce_lead_status_transition();

create or replace function public.set_lead_stage(p_lead_id uuid, p_status text)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_previous_status text;
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if p_status not in ('novo', 'em_contato', 'qualificado', 'em_estudo', 'proposta_enviada', 'negociacao', 'perdido') then
    raise exception 'Use a ação específica para qualificar, ganhar ou perder um atendimento.' using errcode = '22023';
  end if;

  select status into v_previous_status
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Atendimento não encontrado.' using errcode = 'P0002';
  end if;

  update public.leads
  set status = p_status,
      lost_reason = case when p_status <> 'perdido' then null else lost_reason end,
      lost_at = case when p_status <> 'perdido' then null else lost_at end
  where id = p_lead_id and user_id = v_user_id;

  if v_previous_status <> p_status then
    insert into public.lead_activities (
      user_id, lead_id, activity_type, title, description, metadata
    ) values (
      v_user_id, p_lead_id,
      case when v_previous_status = 'perdido' then 'reaberto' else 'status_alterado' end,
      case when v_previous_status = 'perdido' then 'Atendimento reaberto' else 'Etapa do atendimento alterada' end,
      format('Etapa alterada de %s para %s.', v_previous_status, p_status),
      jsonb_build_object('from', v_previous_status, 'to', p_status)
    );
  end if;

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.set_lead_stage(uuid, text) from public, anon;
grant execute on function public.set_lead_stage(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Qualification and manual lead RPCs
-- ---------------------------------------------------------------------------

create or replace function public.save_lead_qualification(
  p_lead_id uuid,
  p_payload jsonb,
  p_complete boolean default false
)
returns setof public.leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
  v_property_type text := coalesce(nullif(btrim(p_payload ->> 'propertyType'), ''), 'Residencial');
  v_property_status text := nullif(btrim(p_payload ->> 'propertyStatus'), '');
  v_connection_type text := coalesce(nullif(btrim(p_payload ->> 'connectionType'), ''), 'Bifásica');
  v_distributor text := nullif(btrim(p_payload ->> 'distributor'), '');
  v_average_bill numeric := nullif(p_payload ->> 'averageMonthlyBill', '')::numeric;
  v_average_consumption numeric := nullif(p_payload ->> 'averageConsumptionKWh', '')::numeric;
  v_area numeric := nullif(p_payload ->> 'availableAreaM2', '')::numeric;
  v_responsible text := nullif(btrim(p_payload ->> 'responsible'), '');
  v_notes text := nullif(btrim(p_payload ->> 'notes'), '');
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Dados de qualificação inválidos.' using errcode = '22023';
  end if;
  if v_property_type not in ('Residencial', 'Comercial', 'Rural', 'Industrial')
    or v_connection_type not in ('Monofásica', 'Bifásica', 'Trifásica')
    or (v_property_status is not null and v_property_status not in ('Próprio', 'Alugado', 'Em construção', 'Outro')) then
    raise exception 'Parâmetro de qualificação inválido.' using errcode = '22023';
  end if;
  if coalesce(v_average_bill, 0) < 0 or coalesce(v_average_consumption, 0) < 0 or coalesce(v_area, 0) < 0 then
    raise exception 'Valores negativos não são permitidos.' using errcode = '22023';
  end if;
  if p_complete and (coalesce(v_average_consumption, 0) <= 0 or v_distributor is null) then
    raise exception 'Informe consumo e distribuidora para concluir a qualificação.' using errcode = '22023';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Atendimento não encontrado.' using errcode = 'P0002';
  end if;
  if v_lead.status in ('ganho', 'perdido') then
    raise exception 'Reabra o atendimento antes de editar a qualificação.' using errcode = '22023';
  end if;

  insert into public.lead_qualifications (
    user_id, lead_id, property_type, property_status, connection_type,
    distributor, average_monthly_bill, average_consumption_kwh, roof_type,
    available_area_m2, roof_orientation, has_shading, decision_maker,
    installation_timeframe, responsible, notes, completed, completed_at
  ) values (
    v_user_id, p_lead_id, v_property_type, v_property_status, v_connection_type,
    v_distributor, v_average_bill, v_average_consumption,
    nullif(btrim(p_payload ->> 'roofType'), ''), v_area,
    nullif(btrim(p_payload ->> 'roofOrientation'), ''),
    nullif(btrim(p_payload ->> 'hasShading'), ''),
    nullif(btrim(p_payload ->> 'decisionMaker'), ''),
    nullif(btrim(p_payload ->> 'installationTimeframe'), ''),
    v_responsible, v_notes, p_complete,
    case when p_complete then now() else null end
  )
  on conflict (user_id, lead_id) do update set
    property_type = excluded.property_type,
    property_status = excluded.property_status,
    connection_type = excluded.connection_type,
    distributor = excluded.distributor,
    average_monthly_bill = excluded.average_monthly_bill,
    average_consumption_kwh = excluded.average_consumption_kwh,
    roof_type = excluded.roof_type,
    available_area_m2 = excluded.available_area_m2,
    roof_orientation = excluded.roof_orientation,
    has_shading = excluded.has_shading,
    decision_maker = excluded.decision_maker,
    installation_timeframe = excluded.installation_timeframe,
    responsible = excluded.responsible,
    notes = excluded.notes,
    completed = public.lead_qualifications.completed or excluded.completed,
    completed_at = case
      when public.lead_qualifications.completed or excluded.completed
        then coalesce(public.lead_qualifications.completed_at, excluded.completed_at, now())
      else null
    end;

  update public.leads set
    property_type = v_property_type,
    property_status = v_property_status,
    distributor = v_distributor,
    average_monthly_bill = v_average_bill,
    average_consumption_kwh = v_average_consumption,
    installation_timeframe = nullif(btrim(p_payload ->> 'installationTimeframe'), ''),
    responsible = coalesce(v_responsible, responsible),
    qualified_at = case when p_complete then coalesce(qualified_at, now()) else qualified_at end
  where id = p_lead_id and user_id = v_user_id;

  if p_complete then
    if v_lead.status = 'novo' then
      update public.leads set status = 'em_contato' where id = p_lead_id and user_id = v_user_id;
      insert into public.lead_activities (user_id, lead_id, activity_type, title, description)
      values (v_user_id, p_lead_id, 'status_alterado', 'Contato inicial registrado', 'Atendimento preparado para qualificação.');
    end if;

    if v_lead.status in ('novo', 'em_contato') then
      update public.leads set status = 'qualificado' where id = p_lead_id and user_id = v_user_id;
      insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
      values (
        v_user_id, p_lead_id, 'qualificado', 'Qualificação concluída',
        'Dados técnicos e comerciais confirmados sem conversão antecipada em cliente.',
        jsonb_build_object('connection_type', v_connection_type, 'consumption_kwh', v_average_consumption)
      );
    end if;
  else
    insert into public.lead_activities (user_id, lead_id, activity_type, title, description)
    values (v_user_id, p_lead_id, 'nota', 'Rascunho de qualificação salvo', 'Os dados estruturados de qualificação foram atualizados.');
  end if;

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.save_lead_qualification(uuid, jsonb, boolean) from public, anon;
grant execute on function public.save_lead_qualification(uuid, jsonb, boolean) to authenticated;

-- Keep the legacy signature safe: it no longer creates clients or consumer units.
create or replace function public.qualify_lead(
  p_lead_id uuid,
  p_responsible text default null,
  p_notes text default null
)
returns setof public.leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.lead_qualifications
    where lead_id = p_lead_id and user_id = v_user_id and completed
  ) then
    raise exception 'Salve a qualificação estruturada antes de concluir.' using errcode = '22023';
  end if;
  update public.leads
  set status = 'qualificado', qualified_at = coalesce(qualified_at, now()),
      responsible = coalesce(nullif(btrim(p_responsible), ''), responsible),
      notes = coalesce(nullif(btrim(p_notes), ''), notes)
  where id = p_lead_id and user_id = v_user_id;
  if not found then raise exception 'Atendimento não encontrado.' using errcode = 'P0002'; end if;
  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.qualify_lead(uuid, text, text) from public, anon;
grant execute on function public.qualify_lead(uuid, text, text) to authenticated;

create or replace function public.create_manual_lead(
  p_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_state text,
  p_property_type text,
  p_average_monthly_bill numeric,
  p_average_consumption_kwh numeric,
  p_distributor text,
  p_property_status text,
  p_notes text,
  p_responsible text
)
returns setof public.leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(p_name);
  v_phone text := btrim(p_phone);
  v_phone_normalized text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_email text := nullif(lower(btrim(p_email)), '');
  v_city text := btrim(p_city);
  v_state text := upper(btrim(p_state));
  v_fingerprint text;
  v_existing_id uuid;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if char_length(v_name) not between 2 and 120
    or char_length(v_phone_normalized) not between 8 and 20
    or char_length(v_city) not between 2 and 120
    or v_state !~ '^[A-Z]{2}$'
    or p_property_type not in ('Residencial', 'Comercial', 'Rural', 'Industrial')
    or (p_property_status is not null and p_property_status not in ('Próprio', 'Alugado', 'Em construção', 'Outro'))
    or coalesce(p_average_monthly_bill, 0) < 0
    or coalesce(p_average_consumption_kwh, 0) < 0 then
    raise exception 'Dados do atendimento manual inválidos.' using errcode = '22023';
  end if;

  v_fingerprint := encode(extensions.digest(
    concat_ws('|', v_user_id::text, lower(v_name), v_phone_normalized, coalesce(v_email, ''), lower(v_city), v_state,
      p_property_type, coalesce(p_average_monthly_bill::text, ''), coalesce(p_average_consumption_kwh::text, '')),
    'sha256'
  ), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || v_fingerprint, 0));

  select id into v_existing_id
  from public.leads
  where user_id = v_user_id
    and submission_fingerprint = v_fingerprint
    and source = 'Atendimento manual'
    and created_at >= now() - interval '10 minutes'
  order by created_at desc
  limit 1;

  if v_existing_id is null then
    insert into public.leads (
      user_id, name, phone, phone_normalized, email, city, state, property_type,
      average_monthly_bill, average_consumption_kwh, distributor, property_status,
      status, responsible, source, landing_page, consent_at, notes,
      submission_fingerprint, last_submission_at
    ) values (
      v_user_id, v_name, v_phone, v_phone_normalized, v_email, v_city, v_state, p_property_type,
      p_average_monthly_bill, p_average_consumption_kwh, nullif(btrim(p_distributor), ''), p_property_status,
      'novo', nullif(btrim(p_responsible), ''), 'Atendimento manual', null, now(),
      nullif(btrim(p_notes), ''), v_fingerprint, now()
    ) returning id into v_existing_id;

    insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
    values (
      v_user_id, v_existing_id, 'lead_criado', 'Atendimento criado manualmente',
      'Cadastro autenticado criado pelo integrador.',
      jsonb_build_object('source', 'Atendimento manual')
    );
  end if;

  return query select * from public.leads where id = v_existing_id and user_id = v_user_id;
end;
$$;

revoke all on function public.create_manual_lead(text, text, text, text, text, text, numeric, numeric, text, text, text, text) from public, anon;
grant execute on function public.create_manual_lead(text, text, text, text, text, text, numeric, numeric, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Proposal persistence, pricing, publication and conversion
-- ---------------------------------------------------------------------------

create or replace function private.convert_lead_to_client(p_lead_id uuid, p_user_id uuid)
returns table(client_id uuid, consumer_unit_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.leads%rowtype;
  v_client_id uuid;
  v_unit_id uuid;
begin
  select * into v_lead from public.leads
  where id = p_lead_id and user_id = p_user_id
  for update;
  if not found then raise exception 'Atendimento não encontrado.' using errcode = 'P0002'; end if;

  if v_lead.client_id is not null and v_lead.consumer_unit_id is not null then
    return query select v_lead.client_id, v_lead.consumer_unit_id;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || '|' || coalesce(v_lead.phone_normalized, '') || '|' || coalesce(lower(v_lead.email), ''), 0
  ));

  v_client_id := v_lead.client_id;
  if v_client_id is null then
    select c.id into v_client_id
    from public.clients c
    where c.user_id = p_user_id and (
      (v_lead.phone_normalized <> '' and c.phone_normalized = v_lead.phone_normalized)
      or (v_lead.email is not null and c.email <> '' and lower(c.email) = lower(v_lead.email))
    )
    order by (c.phone_normalized = v_lead.phone_normalized) desc, c.created_at asc
    limit 1;
  end if;

  if v_client_id is null then
    insert into public.clients (
      user_id, name, type, email, phone, phone_normalized, city, state,
      concessionaria, avg_consumption_kwh, active_status, crm_status,
      responsible, source, last_interaction, avg_monthly_bill, tags
    ) values (
      p_user_id, v_lead.name, v_lead.property_type, coalesce(v_lead.email, ''),
      v_lead.phone, v_lead.phone_normalized, v_lead.city, v_lead.state,
      coalesce(v_lead.distributor, ''), coalesce(v_lead.average_consumption_kwh, 0),
      'Ativo', 'Cliente', v_lead.responsible, v_lead.source, now()::text,
      v_lead.average_monthly_bill, array['Convertido após venda ganha']
    ) returning id into v_client_id;
  else
    update public.clients set
      active_status = 'Ativo', crm_status = 'Cliente', last_interaction = now()::text,
      responsible = coalesce(v_lead.responsible, responsible)
    where id = v_client_id and user_id = p_user_id;
  end if;

  select cu.id into v_unit_id
  from public.consumer_units cu
  where cu.user_id = p_user_id and cu.source_lead_id = p_lead_id
  limit 1;

  if v_unit_id is null then
    insert into public.consumer_units (
      user_id, client_id, source_lead_id, name, city, state, property_type,
      distributor, average_monthly_bill, average_consumption_kwh
    ) values (
      p_user_id, v_client_id, p_lead_id, v_lead.city || '/' || v_lead.state,
      v_lead.city, v_lead.state, v_lead.property_type, v_lead.distributor,
      v_lead.average_monthly_bill, v_lead.average_consumption_kwh
    ) returning id into v_unit_id;
  end if;

  update public.leads set client_id = v_client_id, consumer_unit_id = v_unit_id
  where id = p_lead_id and user_id = p_user_id;

  update public.solar_sizings as sizing
  set consumer_unit_id = v_unit_id
  where sizing.lead_id = p_lead_id
    and sizing.user_id = p_user_id
    and sizing.consumer_unit_id is null;

  return query select v_client_id, v_unit_id;
end;
$$;

revoke all on function private.convert_lead_to_client(uuid, uuid) from public, anon, authenticated;

create or replace function public.save_proposal_draft(
  p_lead_id uuid,
  p_sizing_id uuid,
  p_equipment_items jsonb,
  p_cost_inputs jsonb,
  p_commercial_conditions jsonb,
  p_pdf_settings jsonb default '{}'::jsonb,
  p_custom_notes text default null,
  p_valid_days integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
  v_sizing public.solar_sizings%rowtype;
  v_proposal public.proposals%rowtype;
  v_version public.proposal_versions%rowtype;
  v_equipment jsonb;
  v_equipment_cost numeric := 0;
  v_installation numeric := coalesce((p_cost_inputs ->> 'installationCost')::numeric, 0);
  v_engineering numeric := coalesce((p_cost_inputs ->> 'engineeringCost')::numeric, 0);
  v_utility numeric := coalesce((p_cost_inputs ->> 'utilityFee')::numeric, 0);
  v_freight numeric := coalesce((p_cost_inputs ->> 'freightCost')::numeric, 0);
  v_other numeric := coalesce((p_cost_inputs ->> 'otherCosts')::numeric, 0);
  v_taxes numeric := coalesce((p_cost_inputs ->> 'taxesPercent')::numeric, 0);
  v_commission numeric := coalesce((p_cost_inputs ->> 'commissionPercent')::numeric, 0);
  v_target_margin numeric := coalesce((p_cost_inputs ->> 'targetMarginPercent')::numeric, 0);
  v_discount numeric := coalesce((p_cost_inputs ->> 'discountValue')::numeric, 0);
  v_direct numeric;
  v_gross numeric;
  v_final numeric;
  v_taxes_value numeric;
  v_commission_value numeric;
  v_profit numeric;
  v_real_margin numeric;
  v_price_per_wp numeric;
  v_costs jsonb;
  v_sizing_snapshot jsonb;
  v_valid_until date;
  v_next_version integer;
  v_code text;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if jsonb_typeof(p_equipment_items) <> 'array' or jsonb_array_length(p_equipment_items) = 0
    or jsonb_typeof(p_cost_inputs) <> 'object'
    or jsonb_typeof(p_commercial_conditions) <> 'object'
    or jsonb_typeof(p_pdf_settings) <> 'object' then
    raise exception 'Dados da proposta inválidos.' using errcode = '22023';
  end if;
  if p_valid_days not between 1 and 90 or char_length(coalesce(p_custom_notes, '')) > 4000 then
    raise exception 'Validade ou observações inválidas.' using errcode = '22023';
  end if;

  select * into v_lead from public.leads
  where id = p_lead_id and user_id = v_user_id for update;
  if not found then raise exception 'Atendimento não encontrado.' using errcode = 'P0002'; end if;
  if v_lead.status not in ('em_estudo', 'proposta_enviada', 'negociacao') then
    raise exception 'Conclua qualificação e dimensionamento antes da proposta.' using errcode = '22023';
  end if;

  select * into v_sizing from public.solar_sizings
  where id = p_sizing_id and lead_id = p_lead_id and user_id = v_user_id and status = 'concluido';
  if not found then raise exception 'Dimensionamento concluído não encontrado.' using errcode = '22023'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_equipment_items) item
    where jsonb_typeof(item) <> 'object'
      or coalesce(item ->> 'description', '') = ''
      or coalesce(item ->> 'quantity', '') !~ '^[0-9]+([.][0-9]+)?$'
      or coalesce(item ->> 'unitCost', '') !~ '^[0-9]+([.][0-9]+)?$'
      or (item ->> 'quantity')::numeric <= 0
      or (item ->> 'unitCost')::numeric < 0
  ) then
    raise exception 'Revise descrição, quantidade e custo dos equipamentos.' using errcode = '22023';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', coalesce(nullif(item ->> 'id', ''), gen_random_uuid()::text),
      'description', left(item ->> 'description', 160),
      'category', left(coalesce(item ->> 'category', 'Outros'), 60),
      'quantity', (item ->> 'quantity')::numeric,
      'unitCost', round((item ->> 'unitCost')::numeric, 2)
    )), '[]'::jsonb),
    coalesce(sum((item ->> 'quantity')::numeric * (item ->> 'unitCost')::numeric), 0)
  into v_equipment, v_equipment_cost
  from jsonb_array_elements(p_equipment_items) item;

  if least(v_installation, v_engineering, v_utility, v_freight, v_other, v_discount) < 0
    or greatest(v_installation, v_engineering, v_utility, v_freight, v_other, v_discount) > 1000000000
    or v_taxes not between 0 and 80
    or v_commission not between 0 and 80
    or v_target_margin not between 0 and 80
    or v_taxes + v_commission + v_target_margin >= 95 then
    raise exception 'Custos ou percentuais fora dos limites permitidos.' using errcode = '22023';
  end if;

  v_direct := v_equipment_cost + v_installation + v_engineering + v_utility + v_freight + v_other;
  v_gross := case when v_direct > 0 then v_direct / (1 - ((v_taxes + v_commission + v_target_margin) / 100)) else 0 end;
  if v_discount > v_gross * 0.5 then
    raise exception 'O desconto não pode ultrapassar 50%% do preço bruto.' using errcode = '22023';
  end if;
  v_final := round(greatest(v_gross - v_discount, 0), 2);
  if v_final <= 0 then raise exception 'O preço final precisa ser maior que zero.' using errcode = '22023'; end if;
  v_taxes_value := round(v_final * v_taxes / 100, 2);
  v_commission_value := round(v_final * v_commission / 100, 2);
  v_profit := round(v_final - v_direct - v_taxes_value - v_commission_value, 2);
  v_real_margin := round(v_profit / v_final * 100, 3);
  v_price_per_wp := round(v_final / nullif(v_sizing.installed_power_kwp * 1000, 0), 4);
  v_valid_until := current_date + p_valid_days;

  v_sizing_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'id', v_sizing.id,
    'leadId', v_sizing.lead_id,
    'consumerUnitId', v_sizing.consumer_unit_id,
    'calculationVersion', v_sizing.calculation_version,
    'status', v_sizing.status,
    'connectionType', v_sizing.connection_type,
    'monthlyConsumptionKWh', to_jsonb(v_sizing.monthly_consumption_kwh),
    'monthlySunHours', to_jsonb(v_sizing.monthly_sun_hours),
    'targetCoveragePercent', v_sizing.target_coverage_percent,
    'futureConsumptionKWh', v_sizing.future_consumption_kwh,
    'inclinationFactor', v_sizing.inclination_factor,
    'temperatureLossPercent', v_sizing.temperature_loss_percent,
    'otherLossesPercent', v_sizing.other_losses_percent,
    'transformerLossPercent', v_sizing.transformer_loss_percent,
    'modulePowerW', v_sizing.module_power_w,
    'moduleAreaM2', v_sizing.module_area_m2,
    'inverterPowerKW', v_sizing.inverter_power_kw,
    'inverterCount', v_sizing.inverter_count,
    'averageConsumptionKWh', v_sizing.average_consumption_kwh,
    'availabilityCostKWh', v_sizing.availability_cost_kwh,
    'compensableConsumptionKWh', v_sizing.compensable_consumption_kwh,
    'designConsumptionKWh', v_sizing.design_consumption_kwh,
    'averageCorrectedSunHours', v_sizing.average_corrected_sun_hours,
    'totalLossPercent', v_sizing.total_loss_percent,
    'performanceRatio', v_sizing.performance_ratio,
    'theoreticalPowerKWp', v_sizing.theoretical_power_kwp,
    'requiredPowerKWp', v_sizing.required_power_kwp,
    'modulesCount', v_sizing.modules_count,
    'installedPowerKWp', v_sizing.installed_power_kwp,
    'estimatedMonthlyGenerationKWh', v_sizing.estimated_monthly_generation_kwh,
    'estimatedAnnualGenerationKWh', v_sizing.estimated_annual_generation_kwh,
    'estimatedCoveragePercent', v_sizing.estimated_coverage_percent,
    'estimatedAreaM2', v_sizing.estimated_area_m2,
    'dcAcRatio', v_sizing.dc_ac_ratio,
    'monthlyGenerationKWh', to_jsonb(v_sizing.monthly_generation_kwh),
    'notes', v_sizing.notes,
    'completedAt', v_sizing.completed_at,
    'createdAt', v_sizing.created_at,
    'updatedAt', v_sizing.updated_at
  ));

  v_costs := jsonb_build_object(
    'equipmentItems', v_equipment,
    'equipmentCost', round(v_equipment_cost, 2),
    'installationCost', round(v_installation, 2),
    'engineeringCost', round(v_engineering, 2),
    'utilityFee', round(v_utility, 2),
    'freightCost', round(v_freight, 2),
    'otherCosts', round(v_other, 2),
    'taxesPercent', v_taxes,
    'commissionPercent', v_commission,
    'targetMarginPercent', v_target_margin,
    'discountValue', round(v_discount, 2),
    'grossSalePrice', round(v_gross, 2),
    'finalSalePrice', v_final,
    'taxesValue', v_taxes_value,
    'commissionValue', v_commission_value,
    'totalCost', round(v_direct + v_taxes_value + v_commission_value, 2),
    'profit', v_profit,
    'marginPercent', v_real_margin,
    'pricePerWp', v_price_per_wp,
    'status', 'concluido'
  );

  insert into public.commercial_compositions (
    user_id, lead_id, sizing_id, equipment_items, equipment_cost,
    installation_cost, engineering_cost, utility_fee, freight_cost, other_costs,
    taxes_percent, commission_percent, target_margin_percent, discount_value,
    gross_sale_price, final_sale_price, taxes_value, commission_value, profit,
    real_margin_percent, price_per_wp, commercial_conditions, notes
  ) values (
    v_user_id, p_lead_id, p_sizing_id, v_equipment, round(v_equipment_cost, 2),
    v_installation, v_engineering, v_utility, v_freight, v_other,
    v_taxes, v_commission, v_target_margin, v_discount,
    round(v_gross, 2), v_final, v_taxes_value, v_commission_value, v_profit,
    v_real_margin, v_price_per_wp, p_commercial_conditions, nullif(btrim(p_custom_notes), '')
  ) on conflict (user_id, lead_id) do update set
    sizing_id = excluded.sizing_id,
    equipment_items = excluded.equipment_items,
    equipment_cost = excluded.equipment_cost,
    installation_cost = excluded.installation_cost,
    engineering_cost = excluded.engineering_cost,
    utility_fee = excluded.utility_fee,
    freight_cost = excluded.freight_cost,
    other_costs = excluded.other_costs,
    taxes_percent = excluded.taxes_percent,
    commission_percent = excluded.commission_percent,
    target_margin_percent = excluded.target_margin_percent,
    discount_value = excluded.discount_value,
    gross_sale_price = excluded.gross_sale_price,
    final_sale_price = excluded.final_sale_price,
    taxes_value = excluded.taxes_value,
    commission_value = excluded.commission_value,
    profit = excluded.profit,
    real_margin_percent = excluded.real_margin_percent,
    price_per_wp = excluded.price_per_wp,
    commercial_conditions = excluded.commercial_conditions,
    notes = excluded.notes;

  select * into v_proposal from public.proposals
  where lead_id = p_lead_id and user_id = v_user_id for update;

  if not found then
    v_code := 'PROP-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.proposals (
      user_id, lead_id, sizing_id, code, status, current_version_number,
      total_value, valid_until
    ) values (
      v_user_id, p_lead_id, p_sizing_id, v_code, 'rascunho', 1, v_final, v_valid_until
    ) returning * into v_proposal;
    v_next_version := 1;
  else
    if v_proposal.status in ('aprovada', 'convertida', 'cancelada') then
      raise exception 'A proposta finalizada não pode ser alterada.' using errcode = '22023';
    end if;
    select * into v_version from public.proposal_versions
    where proposal_id = v_proposal.id and version_number = v_proposal.current_version_number;
    v_next_version := case when v_version.status = 'rascunho' then v_version.version_number else v_proposal.current_version_number + 1 end;
  end if;

  perform set_config('app.proposal_version_write', 'on', true);
  if v_version.id is not null and v_version.status = 'rascunho' then
    update public.proposal_versions set
      sizing_id = p_sizing_id,
      valid_until = v_valid_until,
      total_value = v_final,
      sizing_snapshot = v_sizing_snapshot,
      equipment_snapshot = v_equipment,
      costs_snapshot = v_costs,
      commercial_conditions = p_commercial_conditions,
      pdf_settings_snapshot = p_pdf_settings,
      custom_notes = nullif(btrim(p_custom_notes), '')
    where id = v_version.id;
  else
    if v_version.id is not null then
      update public.proposal_versions
      set status = 'substituida'
      where id = v_version.id;
      update public.proposal_public_links
      set revoked_at = coalesce(revoked_at, now())
      where proposal_version_id = v_version.id and revoked_at is null;
    end if;
    insert into public.proposal_versions (
      proposal_id, user_id, sizing_id, version_number, status, valid_until,
      total_value, sizing_snapshot, equipment_snapshot, costs_snapshot,
      commercial_conditions, pdf_settings_snapshot, custom_notes
    ) values (
      v_proposal.id, v_user_id, p_sizing_id, v_next_version, 'rascunho', v_valid_until,
      v_final, v_sizing_snapshot, v_equipment, v_costs,
      p_commercial_conditions, p_pdf_settings, nullif(btrim(p_custom_notes), '')
    );
  end if;

  update public.proposals set
    sizing_id = p_sizing_id,
    status = 'rascunho',
    current_version_number = v_next_version,
    total_value = v_final,
    valid_until = v_valid_until
  where id = v_proposal.id;

  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (
    v_user_id, p_lead_id, 'proposta_criada',
    case when v_next_version = 1 then 'Proposta comercial criada' else format('Revisão v%s criada', v_next_version) end,
    format('Rascunho v%s salvo com preço validado no servidor.', v_next_version),
    jsonb_build_object('proposal_id', v_proposal.id, 'version', v_next_version, 'total_value', v_final)
  );

  return jsonb_build_object(
    'proposalId', v_proposal.id,
    'versionNumber', v_next_version,
    'totalValue', v_final,
    'validUntil', v_valid_until
  );
end;
$$;

revoke all on function public.save_proposal_draft(uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, integer) from public, anon;
grant execute on function public.save_proposal_draft(uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, integer) to authenticated;

create or replace function public.publish_proposal_version(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal public.proposals%rowtype;
  v_version public.proposal_versions%rowtype;
  v_token text;
  v_hash text;
  v_expires timestamptz;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  select * into v_proposal from public.proposals
  where id = p_proposal_id and user_id = v_user_id for update;
  if not found then raise exception 'Proposta não encontrada.' using errcode = 'P0002'; end if;
  select * into v_version from public.proposal_versions
  where proposal_id = v_proposal.id and version_number = v_proposal.current_version_number
  for update;
  if not found or v_version.status <> 'rascunho' then
    raise exception 'Somente um rascunho pode ser enviado.' using errcode = '22023';
  end if;
  if v_version.total_value <= 0 or v_version.valid_until is null or v_version.valid_until < current_date then
    raise exception 'Revise preço e validade antes de enviar.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.solar_sizings s
    where s.id = v_version.sizing_id and s.lead_id = v_proposal.lead_id
      and s.user_id = v_user_id and s.status = 'concluido'
  ) then
    raise exception 'Dimensionamento concluído obrigatório.' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_expires := (v_version.valid_until + 1)::timestamptz;

  update public.proposal_public_links
  set revoked_at = coalesce(revoked_at, now())
  where proposal_id = v_proposal.id and revoked_at is null;

  insert into public.proposal_public_links (
    user_id, proposal_id, proposal_version_id, token_hash, token_hint, expires_at
  ) values (
    v_user_id, v_proposal.id, v_version.id, v_hash, right(v_token, 6), v_expires
  );

  perform set_config('app.proposal_version_write', 'on', true);
  update public.proposal_versions
  set status = 'enviada', sent_at = now()
  where id = v_version.id;
  update public.proposals
  set status = 'enviada', sent_at = now()
  where id = v_proposal.id;

  perform public.set_lead_stage(v_proposal.lead_id, 'proposta_enviada');

  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (
    v_user_id, v_proposal.lead_id, 'proposta_enviada',
    format('Proposta %s enviada', v_proposal.code),
    format('A versão %s foi congelada e disponibilizada por link seguro.', v_version.version_number),
    jsonb_build_object('proposal_id', v_proposal.id, 'version', v_version.version_number, 'expires_at', v_expires)
  );

  return jsonb_build_object(
    'proposalId', v_proposal.id,
    'versionNumber', v_version.version_number,
    'token', v_token,
    'expiresAt', v_expires
  );
end;
$$;

revoke all on function public.publish_proposal_version(uuid) from public, anon;
grant execute on function public.publish_proposal_version(uuid) to authenticated;

create or replace function public.create_proposal_public_link(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal public.proposals%rowtype;
  v_version public.proposal_versions%rowtype;
  v_token text;
  v_hash text;
  v_expires timestamptz;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  select * into v_proposal from public.proposals
  where id = p_proposal_id and user_id = v_user_id for update;
  if not found then raise exception 'Proposta não encontrada.' using errcode = 'P0002'; end if;
  select * into v_version from public.proposal_versions
  where proposal_id = v_proposal.id and version_number = v_proposal.current_version_number;
  if not found or v_version.status not in ('enviada', 'visualizada')
    or v_proposal.status not in ('enviada', 'visualizada', 'em_negociacao') then
    raise exception 'Envie a versão antes de gerar o link.' using errcode = '22023';
  end if;
  if v_version.valid_until < current_date then
    raise exception 'A proposta está expirada.' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_expires := (v_version.valid_until + 1)::timestamptz;
  update public.proposal_public_links set revoked_at = coalesce(revoked_at, now())
  where proposal_id = v_proposal.id and revoked_at is null;
  insert into public.proposal_public_links (
    user_id, proposal_id, proposal_version_id, token_hash, token_hint, expires_at
  ) values (v_user_id, v_proposal.id, v_version.id, v_hash, right(v_token, 6), v_expires);
  return jsonb_build_object('token', v_token, 'expiresAt', v_expires, 'versionNumber', v_version.version_number);
end;
$$;

revoke all on function public.create_proposal_public_link(uuid) from public, anon;
grant execute on function public.create_proposal_public_link(uuid) to authenticated;

create or replace function public.record_public_proposal_view(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.proposal_public_links%rowtype;
  v_proposal public.proposals%rowtype;
  v_first boolean;
begin
  select * into v_link from public.proposal_public_links
  where token_hash = lower(p_token_hash) and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception 'Link inválido, revogado ou expirado.' using errcode = 'P0002'; end if;
  select * into v_proposal from public.proposals where id = v_link.proposal_id for update;
  if v_proposal.status not in ('enviada', 'visualizada', 'em_negociacao', 'aprovada', 'convertida', 'recusada') then
    raise exception 'Proposta indisponível.' using errcode = '22023';
  end if;
  v_first := v_link.view_count = 0;
  update public.proposal_public_links
  set view_count = view_count + 1, last_viewed_at = now()
  where id = v_link.id;
  perform set_config('app.proposal_version_write', 'on', true);
  update public.proposal_versions
  set viewed_at = coalesce(viewed_at, now()),
      status = case when status = 'enviada' then 'visualizada' else status end
  where id = v_link.proposal_version_id;
  update public.proposals
  set viewed_at = coalesce(viewed_at, now()),
      status = case when status = 'enviada' then 'visualizada' else status end
  where id = v_link.proposal_id;
  if v_first then
    insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
    values (
      v_proposal.user_id, v_proposal.lead_id, 'proposta_visualizada',
      'Proposta visualizada pelo interessado',
      format('A proposta %s, versão %s, foi aberta.', v_proposal.code, v_proposal.current_version_number),
      jsonb_build_object('proposal_id', v_proposal.id, 'version', v_proposal.current_version_number)
    );
  end if;
  return jsonb_build_object('proposalId', v_link.proposal_id, 'versionId', v_link.proposal_version_id);
end;
$$;

revoke all on function public.record_public_proposal_view(text) from public, anon, authenticated;
grant execute on function public.record_public_proposal_view(text) to service_role;

create or replace function public.decide_public_proposal(
  p_token_hash text,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.proposal_public_links%rowtype;
  v_proposal public.proposals%rowtype;
  v_version public.proposal_versions%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_conversion record;
begin
  if p_decision not in ('aprovada', 'recusada') then raise exception 'Decisão inválida.' using errcode = '22023'; end if;
  if p_decision = 'recusada' and char_length(coalesce(v_reason, '')) < 3 then
    raise exception 'Informe o motivo da recusa.' using errcode = '22023';
  end if;
  select * into v_link from public.proposal_public_links
  where token_hash = lower(p_token_hash) and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception 'Link inválido, revogado ou expirado.' using errcode = 'P0002'; end if;
  select * into v_proposal from public.proposals where id = v_link.proposal_id for update;
  select * into v_version from public.proposal_versions where id = v_link.proposal_version_id for update;
  if v_version.version_number <> v_proposal.current_version_number then
    raise exception 'Esta versão foi substituída. Solicite o link atualizado.' using errcode = '22023';
  end if;
  if v_proposal.status in ('aprovada', 'convertida', 'recusada', 'cancelada', 'expirada') then
    raise exception 'Esta proposta já foi finalizada.' using errcode = '22023';
  end if;

  perform set_config('app.proposal_version_write', 'on', true);
  if p_decision = 'aprovada' then
    update public.proposal_versions set status = 'aprovada', approved_at = now() where id = v_version.id;
    update public.proposals set status = 'aprovada', decided_at = now(), decision_notes = coalesce(v_reason, 'Aprovada pelo link público.') where id = v_proposal.id;
    select * into v_conversion from private.convert_lead_to_client(v_proposal.lead_id, v_proposal.user_id);
    update public.leads set status = 'ganho' where id = v_proposal.lead_id and user_id = v_proposal.user_id;
    update public.proposals set status = 'convertida', converted_at = now() where id = v_proposal.id;
    insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
    values (
      v_proposal.user_id, v_proposal.lead_id, 'proposta_aprovada',
      'Venda ganha e cliente convertido',
      format('A proposta %s foi aprovada e convertida em venda.', v_proposal.code),
      jsonb_build_object('proposal_id', v_proposal.id, 'version', v_version.version_number,
        'client_id', v_conversion.client_id, 'consumer_unit_id', v_conversion.consumer_unit_id)
    );
    return jsonb_build_object('success', true, 'status', 'aprovada', 'message', 'Proposta aprovada com sucesso.');
  end if;

  update public.proposal_versions set status = 'recusada', rejected_at = now(), rejection_reason = v_reason where id = v_version.id;
  update public.proposals set status = 'recusada', decided_at = now(), decision_notes = v_reason where id = v_proposal.id;
  update public.leads set status = 'perdido', lost_at = now(), lost_reason = 'Recusa da proposta: ' || v_reason where id = v_proposal.lead_id;
  update public.lead_tasks set status = 'concluida', completed_at = coalesce(completed_at, now())
  where lead_id = v_proposal.lead_id and user_id = v_proposal.user_id and status = 'pendente';
  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (
    v_proposal.user_id, v_proposal.lead_id, 'proposta_recusada',
    'Proposta recusada pelo interessado', v_reason,
    jsonb_build_object('proposal_id', v_proposal.id, 'version', v_version.version_number)
  );
  return jsonb_build_object('success', true, 'status', 'recusada', 'message', 'Retorno registrado com sucesso.');
end;
$$;

revoke all on function public.decide_public_proposal(text, text, text) from public, anon, authenticated;
grant execute on function public.decide_public_proposal(text, text, text) to service_role;

create or replace function public.finalize_lead_win(p_lead_id uuid, p_notes text default null)
returns setof public.leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
  v_proposal public.proposals%rowtype;
  v_version public.proposal_versions%rowtype;
  v_conversion record;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  select * into v_lead from public.leads where id = p_lead_id and user_id = v_user_id for update;
  if not found then raise exception 'Atendimento não encontrado.' using errcode = 'P0002'; end if;
  select * into v_proposal from public.proposals where lead_id = p_lead_id and user_id = v_user_id for update;
  if not found or v_proposal.status not in ('enviada', 'visualizada', 'em_negociacao', 'aprovada') then
    raise exception 'Envie a proposta antes de concluir a venda.' using errcode = '22023';
  end if;
  select * into v_version from public.proposal_versions
  where proposal_id = v_proposal.id and version_number = v_proposal.current_version_number for update;
  perform set_config('app.proposal_version_write', 'on', true);
  update public.proposal_versions set status = 'aprovada', approved_at = coalesce(approved_at, now()) where id = v_version.id;
  update public.proposals set status = 'aprovada', decided_at = coalesce(decided_at, now()), decision_notes = coalesce(nullif(btrim(p_notes), ''), decision_notes, 'Venda confirmada pelo integrador.') where id = v_proposal.id;
  select * into v_conversion from private.convert_lead_to_client(p_lead_id, v_user_id);
  update public.leads set status = 'ganho' where id = p_lead_id and user_id = v_user_id;
  update public.proposals set status = 'convertida', converted_at = now() where id = v_proposal.id;
  if not exists (
    select 1 from public.lead_tasks
    where lead_id = p_lead_id and user_id = v_user_id
      and title = 'Agendar vistoria técnica' and status = 'pendente'
  ) then
    insert into public.lead_tasks (user_id, lead_id, title, due_at)
    values (v_user_id, p_lead_id, 'Agendar vistoria técnica', now() + interval '2 days');
  end if;
  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (
    v_user_id, p_lead_id, 'conversao', 'Venda ganha e cliente criado',
    'A conversão foi concluída de forma transacional.',
    jsonb_build_object('proposal_id', v_proposal.id, 'client_id', v_conversion.client_id,
      'consumer_unit_id', v_conversion.consumer_unit_id)
  );
  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.finalize_lead_win(uuid, text) from public, anon;
grant execute on function public.finalize_lead_win(uuid, text) to authenticated;

-- Include the complete immutable audit vocabulary.
alter table public.lead_activities drop constraint if exists lead_activities_activity_type_check;
alter table public.lead_activities add constraint lead_activities_activity_type_check check (
  activity_type in (
    'lead_criado', 'status_alterado', 'contato', 'nota', 'tarefa_criada',
    'tarefa_concluida', 'qualificado', 'conversao', 'perdido', 'reaberto',
    'dimensionamento', 'proposta_criada', 'proposta_enviada', 'proposta_visualizada',
    'proposta_aprovada', 'proposta_recusada', 'proposta_expirada',
    'proposta_cancelada', 'proposta_revisada'
  )
);

notify pgrst, 'reload schema';
