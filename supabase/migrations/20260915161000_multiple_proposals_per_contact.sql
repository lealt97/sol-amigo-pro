-- Permite propostas alternativas independentes, mantendo versões por proposta.
alter table public.proposals drop constraint if exists proposals_user_lead_unique;

create index if not exists proposals_user_lead_updated_idx
  on public.proposals (user_id, lead_id, updated_at desc);
create index if not exists proposals_user_sizing_updated_idx
  on public.proposals (user_id, sizing_id, updated_at desc)
  where sizing_id is not null;

comment on table public.proposals is
  'Propostas comerciais independentes por atendimento; cada proposta possui suas próprias versões imutáveis.';

-- Mantém a assinatura atual do RPC e usa metadados em p_cost_inputs para selecionar
-- uma proposta existente ou criar uma alternativa nova.
do $$
declare
  v_definition text;
  v_old text := E'  select * into v_proposal from public.proposals\n  where lead_id = p_lead_id and user_id = v_user_id for update;';
  v_new text := E'  select * into v_proposal from public.proposals\n  where user_id = v_user_id\n    and coalesce((p_cost_inputs ->> ''createAlternative'')::boolean, false) = false\n    and (\n      (nullif(p_cost_inputs ->> ''proposalId'', '''') is not null\n        and id = (p_cost_inputs ->> ''proposalId'')::uuid)\n      or (nullif(p_cost_inputs ->> ''proposalId'', '''') is null and sizing_id = p_sizing_id)\n    )\n  order by updated_at desc\n  limit 1\n  for update;';
begin
  select pg_get_functiondef('public.save_proposal_draft(uuid,uuid,jsonb,jsonb,jsonb,jsonb,text,integer)'::regprocedure)
  into v_definition;
  if position(v_old in v_definition) = 0 then
    raise exception 'Trecho esperado de save_proposal_draft não encontrado.';
  end if;
  execute replace(v_definition, v_old, v_new);
end;
$$;

-- Ao concluir uma venda manualmente, seleciona apenas uma proposta elegível.
do $$
declare
  v_definition text;
  v_old text := E'  select * into v_proposal from public.proposals where lead_id = p_lead_id and user_id = v_user_id for update;';
  v_new text := E'  select * into v_proposal from public.proposals\n  where lead_id = p_lead_id and user_id = v_user_id\n    and status in (''enviada'', ''visualizada'', ''em_negociacao'', ''aprovada'')\n  order by case when status = ''aprovada'' then 0 else 1 end, updated_at desc\n  limit 1 for update;';
begin
  select pg_get_functiondef('public.finalize_lead_win(uuid,text)'::regprocedure) into v_definition;
  if position(v_old in v_definition) = 0 then
    raise exception 'Trecho esperado de finalize_lead_win não encontrado.';
  end if;
  execute replace(v_definition, v_old, v_new);
end;
$$;

notify pgrst, 'reload schema';
