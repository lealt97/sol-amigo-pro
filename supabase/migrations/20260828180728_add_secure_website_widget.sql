alter table public.lead_capture_forms
  add column if not exists widget_enabled boolean not null default false,
  add column if not exists allowed_origins text[] not null default '{}',
  add column if not exists widget_mode text not null default 'inline',
  add column if not exists company_name text not null default 'Especialista em energia solar',
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#0076DD',
  add column if not exists secondary_color text not null default '#0E2337',
  add column if not exists headline text not null default 'Descubra quanto você pode economizar com energia solar.',
  add column if not exists subheadline text not null default 'Preencha seus dados para receber uma análise inicial sem compromisso.',
  add column if not exists submit_label text not null default 'Solicitar análise gratuita',
  add column if not exists success_message text not null default 'Recebemos sua solicitação. Em breve, nossa equipe entrará em contato.',
  add column if not exists privacy_url text,
  add column if not exists show_powered_by boolean not null default true;

alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_widget_mode_check,
  add constraint lead_capture_forms_widget_mode_check
    check (widget_mode in ('inline', 'modal')),
  drop constraint if exists lead_capture_forms_company_name_length_check,
  add constraint lead_capture_forms_company_name_length_check
    check (char_length(company_name) between 2 and 100),
  drop constraint if exists lead_capture_forms_logo_url_check,
  add constraint lead_capture_forms_logo_url_check
    check (logo_url is null or (char_length(logo_url) <= 500 and logo_url ~ '^https://')),
  drop constraint if exists lead_capture_forms_primary_color_check,
  add constraint lead_capture_forms_primary_color_check
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists lead_capture_forms_secondary_color_check,
  add constraint lead_capture_forms_secondary_color_check
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists lead_capture_forms_headline_length_check,
  add constraint lead_capture_forms_headline_length_check
    check (char_length(headline) between 5 and 160),
  drop constraint if exists lead_capture_forms_subheadline_length_check,
  add constraint lead_capture_forms_subheadline_length_check
    check (char_length(subheadline) between 5 and 240),
  drop constraint if exists lead_capture_forms_submit_label_length_check,
  add constraint lead_capture_forms_submit_label_length_check
    check (char_length(submit_label) between 3 and 60),
  drop constraint if exists lead_capture_forms_success_message_length_check,
  add constraint lead_capture_forms_success_message_length_check
    check (char_length(success_message) between 5 and 240),
  drop constraint if exists lead_capture_forms_privacy_url_check,
  add constraint lead_capture_forms_privacy_url_check
    check (privacy_url is null or (char_length(privacy_url) <= 500 and privacy_url ~ '^https://')),
  drop constraint if exists lead_capture_forms_allowed_origins_limit_check,
  add constraint lead_capture_forms_allowed_origins_limit_check
    check (cardinality(allowed_origins) <= 10);

create table if not exists public.lead_capture_rate_limits (
  form_id uuid not null references public.lead_capture_forms(id) on delete cascade,
  key_hash text not null check (char_length(key_hash) = 64),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (form_id, key_hash, window_started_at)
);

alter table public.lead_capture_rate_limits enable row level security;

revoke all on table public.lead_capture_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.lead_capture_rate_limits to service_role;

create or replace function public.consume_lead_capture_rate_limit(
  p_form_id uuid,
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
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

  insert into public.lead_capture_rate_limits (
    form_id,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_form_id, p_key_hash, v_window_start, 1, now())
  on conflict (form_id, key_hash, window_started_at)
  do update set
    request_count = public.lead_capture_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into v_request_count;

  if random() < 0.02 then
    delete from public.lead_capture_rate_limits
    where updated_at < now() - interval '2 days';
  end if;

  return v_request_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_lead_capture_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_lead_capture_rate_limit(uuid, text, integer, integer)
  to service_role;

comment on column public.lead_capture_forms.allowed_origins is
  'Origens HTTPS normalizadas que podem enviar leads pelo widget. O formulário hospedado é tratado separadamente.';

comment on table public.lead_capture_rate_limits is
  'Contadores temporários de abuso. key_hash contém somente hash SHA-256; nenhum endereço IP bruto é armazenado.';

-- O contador é movido ao esquema privado na migração seguinte.
