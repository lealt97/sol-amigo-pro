alter table public.leads
  add column if not exists street text,
  add column if not exists address_number text;

alter table public.leads
  drop constraint if exists leads_street_length_check,
  drop constraint if exists leads_address_number_length_check,
  add constraint leads_street_length_check
    check (street is null or char_length(street) between 3 and 160),
  add constraint leads_address_number_length_check
    check (address_number is null or char_length(address_number) between 1 and 20);

alter table public.clients
  add column if not exists street text,
  add column if not exists address_number text;

alter table public.clients
  drop constraint if exists clients_street_length_check,
  drop constraint if exists clients_address_number_length_check,
  add constraint clients_street_length_check
    check (street is null or char_length(street) between 3 and 160),
  add constraint clients_address_number_length_check
    check (address_number is null or char_length(address_number) between 1 and 20);

create or replace function public.add_lead_to_clients(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lead public.leads%rowtype;
  v_client_id uuid;
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória'; end if;

  select * into v_lead from public.leads
  where id = p_lead_id and user_id = v_user_id;
  if not found then raise exception 'Lead não encontrado'; end if;

  insert into public.clients (
    user_id, source_lead_id, name, phone, email, city, state,
    street, address_number, property_type
  )
  values (
    v_user_id, v_lead.id, v_lead.name, v_lead.phone, v_lead.email,
    v_lead.city, v_lead.state, v_lead.street, v_lead.address_number, v_lead.property_type
  )
  on conflict (user_id, source_lead_id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    city = excluded.city,
    state = excluded.state,
    street = excluded.street,
    address_number = excluded.address_number,
    property_type = excluded.property_type
  returning id into v_client_id;

  update public.leads
  set client_id = v_client_id
  where id = v_lead.id and user_id = v_user_id;

  insert into public.lead_activities (user_id, lead_id, activity_type, title, metadata)
  values (
    v_user_id,
    v_lead.id,
    'conversao',
    'Lead adicionado aos clientes',
    jsonb_build_object('client_id', v_client_id)
  );

  return v_client_id;
end;
$$;
