-- Remoção intencional dos módulos comerciais. Preserva autenticação e captura pública de leads.
drop function if exists public.create_manual_lead(text,text,text,text,text,text,numeric,numeric,text,text,text,text);
drop function if exists public.create_proposal_public_link(uuid);
drop function if exists public.decide_public_proposal(text,text,text);
drop function if exists public.finalize_lead_win(uuid,text);
drop function if exists public.mark_lead_lost(uuid,text);
drop function if exists public.publish_proposal_version(uuid);
drop function if exists public.qualify_lead(uuid,text,text);
drop function if exists public.record_public_proposal_view(text);
drop function if exists public.register_lead_contact(uuid,text,text,timestamptz);
drop function if exists public.request_public_proposal_change(text,text);
drop function if exists public.save_consumer_unit(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric);
drop function if exists public.save_lead_details(uuid,text,text);
drop function if exists public.save_lead_qualification(uuid,jsonb,boolean);
drop function if exists public.save_proposal_draft(uuid,uuid,jsonb,jsonb,jsonb,jsonb,text,integer);
drop function if exists public.set_consumer_unit_archived(uuid,boolean);
drop function if exists public.set_contact_lifecycle(uuid,text);
drop function if exists public.set_lead_stage(uuid,text);
drop function if exists public.update_contact_profile(uuid,text,text,text,text,text,text,numeric,numeric,text,text,text,text);
drop function if exists private.convert_lead_to_client(uuid,uuid);

alter table public.leads drop constraint if exists leads_client_id_fkey;
alter table public.leads drop constraint if exists leads_consumer_unit_id_fkey;
alter table public.leads drop column if exists client_id;
alter table public.leads drop column if exists consumer_unit_id;

drop table if exists public.proposal_change_requests;
drop table if exists public.proposal_public_links;
drop table if exists public.proposal_versions;
drop table if exists public.proposals;
drop table if exists public.commercial_compositions;
drop table if exists public.solar_sizings;
drop table if exists public.lead_qualifications;
drop table if exists public.consumer_units;
drop table if exists public.clients;
drop table if exists public.solar_kit_items;
drop table if exists public.solar_kits;
drop table if exists public.solar_products;

drop function if exists private.guard_proposal_version_update();
drop function if exists public.touch_solar_catalog_updated_at();
drop function if exists public.set_clients_updated_at();
drop function if exists private.normalize_client_phone();
notify pgrst,'reload schema';
