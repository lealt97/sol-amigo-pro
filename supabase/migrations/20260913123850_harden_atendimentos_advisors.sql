-- Índices das chaves estrangeiras usadas no fluxo comercial.
create index if not exists proposal_public_links_user_id_idx
  on public.proposal_public_links (user_id);
create index if not exists proposal_versions_sizing_id_idx
  on public.proposal_versions (sizing_id)
  where sizing_id is not null;
create index if not exists proposals_sizing_id_idx
  on public.proposals (sizing_id)
  where sizing_id is not null;
create index if not exists lead_documents_lead_id_idx
  on public.lead_documents (lead_id);

-- As políticas antigas exigiam unidade consumidora antes da venda e ficaram
-- redundantes depois que o dimensionamento passou a pertencer ao atendimento.
drop policy if exists "solar_sizings_insert_own" on public.solar_sizings;
drop policy if exists "solar_sizings_update_own" on public.solar_sizings;

-- Estas duas tabelas são exclusivamente internas. As políticas explícitas de
-- negação documentam a intenção e mantêm o Data API fechado para clientes.
drop policy if exists "lead_capture_rate_limits_deny_data_api"
  on private.lead_capture_rate_limits;
create policy "lead_capture_rate_limits_deny_data_api"
  on private.lead_capture_rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "proposal_public_links_deny_data_api"
  on public.proposal_public_links;
create policy "proposal_public_links_deny_data_api"
  on public.proposal_public_links
  for all
  to anon, authenticated
  using (false)
  with check (false);
