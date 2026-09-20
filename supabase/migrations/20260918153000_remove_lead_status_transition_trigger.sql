-- Remove trigger de validação rígida de transição de status de leads herdado do módulo de atendimentos.
-- No CRM simplificado atual, os status podem ser alterados diretamente pelos usuários no kanban e nos detalhes do lead.

drop trigger if exists enforce_lead_status_transition on public.leads;
drop function if exists private.enforce_lead_status_transition();

notify pgrst, 'reload schema';
