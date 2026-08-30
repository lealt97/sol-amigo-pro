create index if not exists consumer_units_client_id_idx
  on public.consumer_units (client_id);

create index if not exists lead_activities_lead_id_idx
  on public.lead_activities (lead_id, created_at desc);

create index if not exists leads_client_id_idx
  on public.leads (client_id)
  where client_id is not null;

create index if not exists leads_consumer_unit_id_idx
  on public.leads (consumer_unit_id)
  where consumer_unit_id is not null;

