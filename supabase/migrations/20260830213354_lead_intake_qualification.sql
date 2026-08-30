alter table public.clients
  add column if not exists phone_normalized text;

update public.clients
set phone_normalized = regexp_replace(phone, '[^0-9]', '', 'g')
where phone_normalized is null;

alter table public.clients
  alter column phone_normalized set default '',
  alter column phone_normalized set not null;

create index if not exists clients_user_phone_normalized_idx
  on public.clients (user_id, phone_normalized)
  where phone_normalized <> '';

create index if not exists clients_user_lower_email_idx
  on public.clients (user_id, lower(email))
  where email <> '';

create or replace function private.normalize_client_phone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.phone_normalized := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

revoke all on function private.normalize_client_phone() from public, anon, authenticated;

drop trigger if exists clients_normalize_phone on public.clients;
create trigger clients_normalize_phone
before insert or update of phone on public.clients
for each row execute function private.normalize_client_phone();

create table if not exists public.consumer_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_lead_id uuid unique references public.leads(id) on delete set null,
  name text not null default 'Unidade principal' check (char_length(name) between 2 and 160),
  city text not null default '',
  state text not null default '' check (state = '' or state ~ '^[A-Z]{2}$'),
  property_type text not null default 'Residencial' check (property_type in ('Residencial', 'Comercial', 'Rural', 'Industrial')),
  distributor text,
  average_monthly_bill numeric(12,2) check (average_monthly_bill is null or average_monthly_bill >= 0),
  average_consumption_kwh numeric(12,2) check (average_consumption_kwh is null or average_consumption_kwh >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consumer_units_user_client_idx
  on public.consumer_units (user_id, client_id, created_at desc);

alter table public.leads
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists consumer_unit_id uuid references public.consumer_units(id) on delete set null,
  add column if not exists qualified_at timestamptz,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_reason text;

update public.leads
set lost_reason = 'Não informado (registro anterior)',
    lost_at = coalesce(lost_at, updated_at)
where status = 'perdido' and lost_reason is null;

alter table public.leads
  drop constraint if exists leads_lost_reason_required,
  add constraint leads_lost_reason_required check (
    status <> 'perdido'
    or (lost_reason is not null and char_length(btrim(lost_reason)) between 3 and 300)
  );

create index if not exists leads_user_client_idx
  on public.leads (user_id, client_id)
  where client_id is not null;

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'lead_criado', 'status_alterado', 'contato', 'nota', 'tarefa_criada',
      'tarefa_concluida', 'qualificado', 'conversao', 'perdido', 'reaberto'
    )
  ),
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 1000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_user_lead_created_idx
  on public.lead_activities (user_id, lead_id, created_at desc);

alter table public.consumer_units enable row level security;
alter table public.lead_activities enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "consumer_units_select_own" on public.consumer_units;
create policy "consumer_units_select_own"
  on public.consumer_units for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "consumer_units_insert_own" on public.consumer_units;
create policy "consumer_units_insert_own"
  on public.consumer_units for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients
      where clients.id = consumer_units.client_id
        and clients.user_id = (select auth.uid())
    )
  );

drop policy if exists "consumer_units_update_own" on public.consumer_units;
create policy "consumer_units_update_own"
  on public.consumer_units for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients
      where clients.id = consumer_units.client_id
        and clients.user_id = (select auth.uid())
    )
  );

drop policy if exists "consumer_units_delete_own" on public.consumer_units;
create policy "consumer_units_delete_own"
  on public.consumer_units for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "lead_activities_select_own" on public.lead_activities;
create policy "lead_activities_select_own"
  on public.lead_activities for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "lead_activities_insert_own" on public.lead_activities;
create policy "lead_activities_insert_own"
  on public.lead_activities for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_activities.lead_id
        and leads.user_id = (select auth.uid())
    )
  );

drop policy if exists "lead_tasks_insert_own" on public.lead_tasks;
create policy "lead_tasks_insert_own"
  on public.lead_tasks for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_tasks.lead_id
        and leads.user_id = (select auth.uid())
    )
  );

drop policy if exists "lead_tasks_update_own" on public.lead_tasks;
create policy "lead_tasks_update_own"
  on public.lead_tasks for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_tasks.lead_id
        and leads.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_tasks.lead_id
        and leads.user_id = (select auth.uid())
    )
  );

drop policy if exists "lead_tasks_delete_own" on public.lead_tasks;
create policy "lead_tasks_delete_own"
  on public.lead_tasks for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_tasks.lead_id
        and leads.user_id = (select auth.uid())
    )
  );

alter table public.lead_tasks alter column user_id set default auth.uid();

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.consumer_units to authenticated;
grant select, insert on public.lead_activities to authenticated;

grant select, insert, update, delete on public.consumer_units to service_role;
grant select, insert, update, delete on public.lead_activities to service_role;

revoke all on public.consumer_units from anon;
revoke all on public.lead_activities from anon;

drop trigger if exists consumer_units_set_updated_at on public.consumer_units;
create trigger consumer_units_set_updated_at
before update on public.consumer_units
for each row execute function private.set_updated_at();

create or replace function private.log_lead_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_type text;
  v_title text;
  v_description text;
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities (user_id, lead_id, activity_type, title, created_at)
    values (new.user_id, new.id, 'lead_criado', 'Lead recebido pelo formulário', new.created_at);
    return new;
  end if;

  if new.status is distinct from old.status then
    v_type := case
      when new.status = 'qualificado' then 'qualificado'
      when new.status = 'perdido' then 'perdido'
      when old.status = 'perdido' then 'reaberto'
      else 'status_alterado'
    end;
    v_title := case
      when new.status = 'qualificado' then 'Lead qualificado'
      when new.status = 'perdido' then 'Lead marcado como perdido'
      when old.status = 'perdido' then 'Lead reaberto'
      else 'Etapa comercial alterada'
    end;
    v_description := case
      when new.status = 'perdido' then 'Motivo: ' || new.lost_reason
      else 'De ' || old.status || ' para ' || new.status
    end;

    insert into public.lead_activities (
      user_id, lead_id, activity_type, title, description, metadata
    ) values (
      new.user_id,
      new.id,
      v_type,
      v_title,
      v_description,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.log_lead_activity() from public, anon, authenticated;

drop trigger if exists leads_log_activity on public.leads;
create trigger leads_log_activity
after insert or update of status on public.leads
for each row execute function private.log_lead_activity();

create or replace function private.log_lead_task_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities (
      user_id, lead_id, activity_type, title, description, metadata, created_at
    ) values (
      new.user_id,
      new.lead_id,
      'tarefa_criada',
      'Tarefa criada',
      new.title,
      jsonb_build_object('task_id', new.id, 'due_at', new.due_at),
      new.created_at
    );
  elsif new.status = 'concluida' and old.status is distinct from new.status then
    insert into public.lead_activities (
      user_id, lead_id, activity_type, title, description, metadata
    ) values (
      new.user_id,
      new.lead_id,
      'tarefa_concluida',
      'Tarefa concluída',
      new.title,
      jsonb_build_object('task_id', new.id)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.log_lead_task_activity() from public, anon, authenticated;

drop trigger if exists lead_tasks_log_activity on public.lead_tasks;
create trigger lead_tasks_log_activity
after insert or update of status on public.lead_tasks
for each row execute function private.log_lead_task_activity();

insert into public.lead_activities (user_id, lead_id, activity_type, title, created_at)
select leads.user_id, leads.id, 'lead_criado', 'Lead recebido pelo formulário', leads.created_at
from public.leads
where not exists (
  select 1 from public.lead_activities
  where lead_activities.lead_id = leads.id
    and lead_activities.activity_type = 'lead_criado'
);

insert into public.lead_activities (
  user_id, lead_id, activity_type, title, description, metadata, created_at
)
select
  lead_tasks.user_id,
  lead_tasks.lead_id,
  'tarefa_criada',
  'Tarefa criada',
  lead_tasks.title,
  jsonb_build_object('task_id', lead_tasks.id, 'due_at', lead_tasks.due_at),
  lead_tasks.created_at
from public.lead_tasks
where not exists (
  select 1 from public.lead_activities
  where lead_activities.lead_id = lead_tasks.lead_id
    and lead_activities.activity_type = 'tarefa_criada'
    and lead_activities.metadata ->> 'task_id' = lead_tasks.id::text
);

insert into public.lead_activities (
  user_id, lead_id, activity_type, title, description, created_at
)
select
  leads.user_id,
  leads.id,
  'perdido',
  'Lead marcado como perdido',
  'Motivo: ' || leads.lost_reason,
  coalesce(leads.lost_at, leads.updated_at)
from public.leads
where leads.status = 'perdido'
  and not exists (
    select 1 from public.lead_activities
    where lead_activities.lead_id = leads.id
      and lead_activities.activity_type = 'perdido'
  );

create or replace function public.set_lead_stage(p_lead_id uuid, p_status text)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if p_status not in ('novo', 'em_contato', 'em_estudo', 'proposta_enviada', 'negociacao', 'ganho') then
    raise exception 'Use a ação específica para qualificar ou perder um lead.' using errcode = '22023';
  end if;

  return query
  update public.leads
  set status = p_status,
      lost_reason = null,
      lost_at = null
  where id = p_lead_id and user_id = v_user_id
  returning *;

  if not found then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.save_lead_details(
  p_lead_id uuid,
  p_responsible text,
  p_notes text
)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_responsible text := nullif(btrim(p_responsible), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_previous public.leads%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if v_responsible is not null and char_length(v_responsible) > 120 then
    raise exception 'Responsável muito longo.' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 4000 then
    raise exception 'Observação muito longa.' using errcode = '22023';
  end if;

  select * into v_previous
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;

  update public.leads
  set responsible = v_responsible,
      notes = v_notes
  where id = p_lead_id and user_id = v_user_id;

  if v_previous.responsible is distinct from v_responsible
     or v_previous.notes is distinct from v_notes then
    insert into public.lead_activities (
      user_id, lead_id, activity_type, title, description
    ) values (
      v_user_id,
      p_lead_id,
      'nota',
      'Ficha comercial atualizada',
      case
        when v_previous.responsible is distinct from v_responsible then 'Responsável e observações atualizados.'
        else 'Observações atualizadas.'
      end
    );
  end if;

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

create or replace function public.register_lead_contact(
  p_lead_id uuid,
  p_channel text,
  p_summary text,
  p_next_activity_at timestamptz default null
)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_summary text := nullif(btrim(p_summary), '');
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if p_channel not in ('WhatsApp', 'Ligação', 'E-mail', 'Presencial', 'Outro') then
    raise exception 'Canal de contato inválido.' using errcode = '22023';
  end if;
  if v_summary is null or char_length(v_summary) > 1000 then
    raise exception 'Informe um resumo de até 1000 caracteres.' using errcode = '22023';
  end if;

  select status into v_status
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;
  if v_status in ('ganho', 'perdido') then
    raise exception 'Reabra o lead antes de registrar um novo contato.' using errcode = '22023';
  end if;

  update public.leads
  set status = case when status = 'novo' then 'em_contato' else status end,
      next_activity_at = p_next_activity_at
  where id = p_lead_id and user_id = v_user_id;

  update public.lead_tasks
  set status = 'concluida', completed_at = now()
  where lead_id = p_lead_id
    and user_id = v_user_id
    and status = 'pendente'
    and title in ('Realizar primeiro contato', 'Retornar novo contato do site');

  insert into public.lead_activities (
    user_id, lead_id, activity_type, title, description, metadata
  ) values (
    v_user_id,
    p_lead_id,
    'contato',
    'Contato registrado por ' || p_channel,
    v_summary,
    jsonb_build_object('channel', p_channel, 'next_activity_at', p_next_activity_at)
  );

  if p_next_activity_at is not null then
    insert into public.lead_tasks (user_id, lead_id, title, due_at)
    values (v_user_id, p_lead_id, 'Realizar acompanhamento', p_next_activity_at);
  end if;

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

create or replace function public.qualify_lead(
  p_lead_id uuid,
  p_responsible text default null,
  p_notes text default null
)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
  v_client_id uuid;
  v_consumer_unit_id uuid;
  v_responsible text := nullif(btrim(p_responsible), '');
  v_notes text := nullif(btrim(p_notes), '');
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if v_responsible is not null and char_length(v_responsible) > 120 then
    raise exception 'Responsável muito longo.' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 4000 then
    raise exception 'Observação muito longa.' using errcode = '22023';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;
  if v_lead.status in ('ganho', 'perdido') then
    raise exception 'Reabra o lead antes de qualificá-lo.' using errcode = '22023';
  end if;
  if v_lead.client_id is not null and v_lead.consumer_unit_id is not null then
    update public.leads
    set status = 'qualificado',
        qualified_at = coalesce(qualified_at, now()),
        responsible = coalesce(v_responsible, responsible),
        notes = coalesce(v_notes, notes),
        lost_reason = null,
        lost_at = null
    where id = p_lead_id and user_id = v_user_id;
    return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
    return;
  end if;

  v_client_id := v_lead.client_id;
  if v_client_id is null then
    select clients.id into v_client_id
    from public.clients
    where clients.user_id = v_user_id
      and (
        (v_lead.phone_normalized <> '' and clients.phone_normalized = v_lead.phone_normalized)
        or (
          v_lead.email is not null
          and clients.email <> ''
          and lower(clients.email) = lower(v_lead.email)
        )
      )
    order by
      (clients.phone_normalized = v_lead.phone_normalized) desc,
      clients.created_at asc
    limit 1;
  end if;

  if v_client_id is null then
    insert into public.clients (
      user_id, name, type, email, phone, phone_normalized, city, state,
      concessionaria, avg_consumption_kwh, active_status, crm_status,
      responsible, source, last_interaction, avg_monthly_bill, tags
    ) values (
      v_user_id,
      v_lead.name,
      v_lead.property_type,
      coalesce(v_lead.email, ''),
      v_lead.phone,
      v_lead.phone_normalized,
      v_lead.city,
      v_lead.state,
      coalesce(v_lead.distributor, ''),
      coalesce(v_lead.average_consumption_kwh, 0),
      'Em atendimento',
      'Qualificado',
      coalesce(v_responsible, v_lead.responsible),
      v_lead.source,
      now()::text,
      v_lead.average_monthly_bill,
      array['Convertido do formulário']
    ) returning id into v_client_id;
  else
    update public.clients
    set crm_status = 'Qualificado',
        active_status = 'Em atendimento',
        responsible = coalesce(v_responsible, responsible),
        source = coalesce(source, v_lead.source),
        last_interaction = now()::text,
        city = case when city = '' then v_lead.city else city end,
        state = case when state = '' then v_lead.state else state end,
        concessionaria = case when concessionaria = '' then coalesce(v_lead.distributor, '') else concessionaria end,
        avg_consumption_kwh = case when avg_consumption_kwh = 0 then coalesce(v_lead.average_consumption_kwh, 0) else avg_consumption_kwh end,
        avg_monthly_bill = coalesce(avg_monthly_bill, v_lead.average_monthly_bill)
    where id = v_client_id and user_id = v_user_id;
  end if;

  v_consumer_unit_id := v_lead.consumer_unit_id;
  if v_consumer_unit_id is null then
    select consumer_units.id into v_consumer_unit_id
    from public.consumer_units
    where consumer_units.source_lead_id = p_lead_id
      and consumer_units.user_id = v_user_id
    limit 1;
  end if;

  if v_consumer_unit_id is null then
    insert into public.consumer_units (
      user_id, client_id, source_lead_id, name, city, state, property_type,
      distributor, average_monthly_bill, average_consumption_kwh
    ) values (
      v_user_id,
      v_client_id,
      p_lead_id,
      v_lead.city || '/' || v_lead.state,
      v_lead.city,
      v_lead.state,
      v_lead.property_type,
      v_lead.distributor,
      v_lead.average_monthly_bill,
      v_lead.average_consumption_kwh
    ) returning id into v_consumer_unit_id;
  end if;

  update public.leads
  set status = 'qualificado',
      client_id = v_client_id,
      consumer_unit_id = v_consumer_unit_id,
      qualified_at = coalesce(qualified_at, now()),
      responsible = coalesce(v_responsible, responsible),
      notes = coalesce(v_notes, notes),
      lost_reason = null,
      lost_at = null
  where id = p_lead_id and user_id = v_user_id;

  update public.lead_tasks
  set status = 'concluida', completed_at = now()
  where lead_id = p_lead_id
    and user_id = v_user_id
    and status = 'pendente'
    and title in ('Realizar primeiro contato', 'Retornar novo contato do site');

  insert into public.lead_activities (
    user_id, lead_id, activity_type, title, description, metadata
  ) values (
    v_user_id,
    p_lead_id,
    'conversao',
    'Cliente e unidade consumidora criados',
    'O lead agora está pronto para iniciar o estudo solar.',
    jsonb_build_object('client_id', v_client_id, 'consumer_unit_id', v_consumer_unit_id)
  );

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

create or replace function public.mark_lead_lost(p_lead_id uuid, p_reason text)
returns setof public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reason text := nullif(btrim(p_reason), '');
  v_client_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) not between 3 and 300 then
    raise exception 'Informe um motivo de perda entre 3 e 300 caracteres.' using errcode = '22023';
  end if;

  select client_id into v_client_id
  from public.leads
  where id = p_lead_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;

  update public.leads
  set status = 'perdido',
      lost_reason = v_reason,
      lost_at = now(),
      next_activity_at = null
  where id = p_lead_id and user_id = v_user_id;

  update public.lead_tasks
  set status = 'concluida', completed_at = now()
  where lead_id = p_lead_id
    and user_id = v_user_id
    and status = 'pendente';

  if v_client_id is not null then
    update public.clients
    set crm_status = 'Perdido', last_interaction = now()::text
    where id = v_client_id and user_id = v_user_id;
  end if;

  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.set_lead_stage(uuid, text) from public, anon;
revoke all on function public.save_lead_details(uuid, text, text) from public, anon;
revoke all on function public.register_lead_contact(uuid, text, text, timestamptz) from public, anon;
revoke all on function public.qualify_lead(uuid, text, text) from public, anon;
revoke all on function public.mark_lead_lost(uuid, text) from public, anon;

grant execute on function public.set_lead_stage(uuid, text) to authenticated;
grant execute on function public.save_lead_details(uuid, text, text) to authenticated;
grant execute on function public.register_lead_contact(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.qualify_lead(uuid, text, text) to authenticated;
grant execute on function public.mark_lead_lost(uuid, text) to authenticated;
