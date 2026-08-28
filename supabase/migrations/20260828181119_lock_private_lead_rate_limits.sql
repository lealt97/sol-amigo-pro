revoke all on table private.lead_capture_rate_limits from service_role;
alter table private.lead_capture_rate_limits disable row level security;

comment on table private.lead_capture_rate_limits is
  'Tabela privada acessível somente pelo proprietário da função transacional; não é exposta pela Data API.';
