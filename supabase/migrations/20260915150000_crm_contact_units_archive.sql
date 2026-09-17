-- CRM unificado: edição segura, múltiplas unidades e exclusão lógica.
alter table public.leads
  add column if not exists archived_at timestamptz,
  add column if not exists trashed_at timestamptz;

alter table public.clients
  add column if not exists archived_at timestamptz,
  add column if not exists trashed_at timestamptz;

alter table public.consumer_units
  add column if not exists connection_type text
    check (connection_type is null or connection_type in ('Monofásica', 'Bifásica', 'Trifásica')),
  add column if not exists voltage text
    check (voltage is null or voltage in ('127V', '220V', '380V')),
  add column if not exists archived_at timestamptz;

create index if not exists leads_user_lifecycle_idx
  on public.leads (user_id, trashed_at, archived_at, updated_at desc);
create index if not exists consumer_units_user_active_idx
  on public.consumer_units (user_id, client_id, archived_at, created_at);

create or replace function public.update_contact_profile(
  p_lead_id uuid, p_name text, p_phone text, p_email text, p_city text, p_state text,
  p_property_type text, p_average_monthly_bill numeric, p_average_consumption_kwh numeric,
  p_distributor text, p_property_status text, p_responsible text, p_notes text
)
returns setof public.leads
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_phone_normalized text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_email text := nullif(lower(btrim(p_email)), '');
  v_city text := btrim(coalesce(p_city, ''));
  v_state text := upper(btrim(coalesce(p_state, '')));
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if char_length(v_name) not between 2 and 120
    or char_length(v_phone_normalized) not between 8 and 20
    or char_length(v_city) not between 2 and 120 or v_state !~ '^[A-Z]{2}$'
    or p_property_type not in ('Residencial', 'Comercial', 'Rural', 'Industrial')
    or (p_property_status is not null and p_property_status not in ('Próprio', 'Alugado', 'Em construção', 'Outro'))
    or coalesce(p_average_monthly_bill, 0) < 0 or coalesce(p_average_consumption_kwh, 0) < 0
    or char_length(coalesce(p_notes, '')) > 4000 then
    raise exception 'Dados do contato inválidos.' using errcode = '22023';
  end if;

  select * into v_lead from public.leads
  where id = p_lead_id and user_id = v_user_id and trashed_at is null for update;
  if not found then raise exception 'Contato não encontrado.' using errcode = 'P0002'; end if;

  update public.leads set
    name = v_name, phone = v_phone, phone_normalized = v_phone_normalized, email = v_email,
    city = v_city, state = v_state, property_type = p_property_type,
    average_monthly_bill = p_average_monthly_bill, average_consumption_kwh = p_average_consumption_kwh,
    distributor = nullif(btrim(p_distributor), ''), property_status = p_property_status,
    responsible = nullif(btrim(p_responsible), ''), notes = nullif(btrim(p_notes), '')
  where id = p_lead_id and user_id = v_user_id;

  if v_lead.client_id is not null then
    update public.clients set
      name = v_name, email = coalesce(v_email, ''), phone = v_phone, city = v_city, state = v_state,
      type = p_property_type, concessionaria = coalesce(nullif(btrim(p_distributor), ''), ''),
      avg_monthly_bill = p_average_monthly_bill,
      avg_consumption_kwh = coalesce(p_average_consumption_kwh, 0),
      responsible = nullif(btrim(p_responsible), '')
    where id = v_lead.client_id and user_id = v_user_id;
  end if;

  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (v_user_id, p_lead_id, 'nota', 'Dados cadastrais atualizados',
    'Nome, contato, localização ou dados energéticos foram revisados.', '{}'::jsonb);
  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end;
$$;

revoke all on function public.update_contact_profile(uuid,text,text,text,text,text,text,numeric,numeric,text,text,text,text) from public, anon;
grant execute on function public.update_contact_profile(uuid,text,text,text,text,text,text,numeric,numeric,text,text,text,text) to authenticated;

create or replace function public.save_consumer_unit(
  p_client_id uuid, p_unit_id uuid, p_name text, p_city text, p_state text,
  p_property_type text, p_distributor text, p_connection_type text, p_voltage text,
  p_average_monthly_bill numeric, p_average_consumption_kwh numeric
)
returns setof public.consumer_units
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_unit_id uuid := p_unit_id;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if not exists (select 1 from public.clients where id = p_client_id and user_id = v_user_id and trashed_at is null) then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 160
    or char_length(btrim(coalesce(p_city, ''))) not between 2 and 120
    or upper(btrim(coalesce(p_state, ''))) !~ '^[A-Z]{2}$'
    or p_property_type not in ('Residencial', 'Comercial', 'Rural', 'Industrial')
    or (p_connection_type is not null and p_connection_type not in ('Monofásica', 'Bifásica', 'Trifásica'))
    or (p_voltage is not null and p_voltage not in ('127V', '220V', '380V'))
    or coalesce(p_average_monthly_bill, 0) < 0 or coalesce(p_average_consumption_kwh, 0) < 0 then
    raise exception 'Dados da unidade consumidora inválidos.' using errcode = '22023';
  end if;

  if v_unit_id is null then
    insert into public.consumer_units (
      user_id, client_id, name, city, state, property_type, distributor,
      connection_type, voltage, average_monthly_bill, average_consumption_kwh
    ) values (
      v_user_id, p_client_id, btrim(p_name), btrim(p_city), upper(btrim(p_state)), p_property_type,
      nullif(btrim(p_distributor), ''), p_connection_type, p_voltage,
      p_average_monthly_bill, p_average_consumption_kwh
    ) returning id into v_unit_id;
  else
    update public.consumer_units set
      name = btrim(p_name), city = btrim(p_city), state = upper(btrim(p_state)), property_type = p_property_type,
      distributor = nullif(btrim(p_distributor), ''), connection_type = p_connection_type, voltage = p_voltage,
      average_monthly_bill = p_average_monthly_bill, average_consumption_kwh = p_average_consumption_kwh
    where id = v_unit_id and client_id = p_client_id and user_id = v_user_id and archived_at is null;
    if not found then raise exception 'Unidade consumidora não encontrada.' using errcode = 'P0002'; end if;
  end if;

  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  select v_user_id, l.id, 'nota',
    case when p_unit_id is null then 'Unidade consumidora adicionada' else 'Unidade consumidora atualizada' end,
    btrim(p_name), jsonb_build_object('consumer_unit_id', v_unit_id)
  from public.leads l where l.client_id = p_client_id and l.user_id = v_user_id order by l.created_at limit 1;
  return query select * from public.consumer_units where id = v_unit_id and user_id = v_user_id;
end;
$$;

revoke all on function public.save_consumer_unit(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric) from public, anon;
grant execute on function public.save_consumer_unit(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric) to authenticated;

create or replace function public.set_consumer_unit_archived(p_unit_id uuid, p_archived boolean)
returns setof public.consumer_units language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  update public.consumer_units set archived_at = case when p_archived then now() else null end
  where id = p_unit_id and user_id = v_user_id;
  if not found then raise exception 'Unidade consumidora não encontrada.' using errcode = 'P0002'; end if;
  return query select * from public.consumer_units where id = p_unit_id and user_id = v_user_id;
end; $$;
revoke all on function public.set_consumer_unit_archived(uuid,boolean) from public, anon;
grant execute on function public.set_consumer_unit_archived(uuid,boolean) to authenticated;

create or replace function public.set_contact_lifecycle(p_lead_id uuid, p_action text)
returns setof public.leads language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_lead public.leads%rowtype;
begin
  if v_user_id is null then raise exception 'Sessão inválida.' using errcode = '42501'; end if;
  if p_action not in ('archive', 'restore', 'trash') then raise exception 'Ação inválida.' using errcode = '22023'; end if;
  select * into v_lead from public.leads where id = p_lead_id and user_id = v_user_id for update;
  if not found then raise exception 'Contato não encontrado.' using errcode = 'P0002'; end if;
  if p_action = 'trash' and exists (select 1 from public.proposals where lead_id = p_lead_id and user_id = v_user_id) then
    raise exception 'Contatos com proposta devem ser arquivados.' using errcode = '22023';
  end if;
  update public.leads set
    archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
    trashed_at = case when p_action = 'trash' then now() when p_action = 'restore' then null else trashed_at end
  where id = p_lead_id and user_id = v_user_id;
  if v_lead.client_id is not null then
    update public.clients set
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      trashed_at = case when p_action = 'trash' then now() when p_action = 'restore' then null else trashed_at end
    where id = v_lead.client_id and user_id = v_user_id;
  end if;
  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (v_user_id, p_lead_id, 'nota',
    case p_action when 'archive' then 'Contato arquivado' when 'trash' then 'Contato enviado para a lixeira' else 'Contato restaurado' end,
    'Alteração de ciclo de vida registrada com segurança.', jsonb_build_object('action', p_action));
  return query select * from public.leads where id = p_lead_id and user_id = v_user_id;
end; $$;
revoke all on function public.set_contact_lifecycle(uuid,text) from public, anon;
grant execute on function public.set_contact_lifecycle(uuid,text) to authenticated;

notify pgrst, 'reload schema';
