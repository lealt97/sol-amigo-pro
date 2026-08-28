alter table public.lead_capture_rate_limits set schema private;

revoke all on table private.lead_capture_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.lead_capture_rate_limits to service_role;

create or replace function public.consume_lead_capture_rate_limit(
  p_form_id uuid,
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_max_requests < 1
    or p_max_requests > 1000
    or p_window_seconds < 60
    or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.lead_capture_rate_limits (
    form_id,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_form_id, p_key_hash, v_window_start, 1, now())
  on conflict (form_id, key_hash, window_started_at)
  do update set
    request_count = private.lead_capture_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into v_request_count;

  if random() < 0.02 then
    delete from private.lead_capture_rate_limits
    where updated_at < now() - interval '2 days';
  end if;

  return v_request_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_lead_capture_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_lead_capture_rate_limit(uuid, text, integer, integer)
  to service_role;

comment on table private.lead_capture_rate_limits is
  'Contadores temporários de abuso. key_hash contém somente hash SHA-256; nenhum endereço IP bruto é armazenado.';

-- O acesso direto do service_role é removido na migração seguinte.
