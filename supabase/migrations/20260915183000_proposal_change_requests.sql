create table if not exists public.proposal_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  message text not null check (char_length(message) between 3 and 1000),
  status text not null default 'pendente' check (status in ('pendente', 'resolvida')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists proposal_change_requests_owner_idx
  on public.proposal_change_requests (user_id, status, created_at desc);
create index if not exists proposal_change_requests_proposal_idx
  on public.proposal_change_requests (proposal_id, created_at desc);

alter table public.proposal_change_requests enable row level security;
revoke all on public.proposal_change_requests from public, anon, authenticated;
grant select, update on public.proposal_change_requests to authenticated;
grant select, insert, update, delete on public.proposal_change_requests to service_role;

create policy "proposal_change_requests_select_own"
  on public.proposal_change_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "proposal_change_requests_update_own"
  on public.proposal_change_requests for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.request_public_proposal_change(
  p_token_hash text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.proposal_public_links%rowtype;
  v_proposal public.proposals%rowtype;
  v_message text := nullif(btrim(p_message), '');
begin
  if char_length(coalesce(v_message, '')) < 3 or char_length(v_message) > 1000 then
    raise exception 'Descreva o ajuste desejado em até 1000 caracteres.' using errcode = '22023';
  end if;
  select * into v_link from public.proposal_public_links
  where token_hash = lower(p_token_hash) and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception 'Link inválido, revogado ou expirado.' using errcode = 'P0002'; end if;
  select * into v_proposal from public.proposals where id = v_link.proposal_id for update;
  if v_proposal.current_version_number <> (
    select version_number from public.proposal_versions where id = v_link.proposal_version_id
  ) then raise exception 'Esta versão foi substituída. Solicite o link atualizado.' using errcode = '22023'; end if;
  if v_proposal.status not in ('enviada', 'visualizada', 'em_negociacao') then
    raise exception 'Esta proposta não aceita mais alterações.' using errcode = '22023';
  end if;

  insert into public.proposal_change_requests
    (user_id, proposal_id, proposal_version_id, lead_id, message)
  values
    (v_proposal.user_id, v_proposal.id, v_link.proposal_version_id, v_proposal.lead_id, v_message);
  update public.proposals set status = 'em_negociacao', decision_notes = v_message where id = v_proposal.id;
  update public.leads set status = 'negociacao' where id = v_proposal.lead_id and user_id = v_proposal.user_id;
  insert into public.lead_activities (user_id, lead_id, activity_type, title, description, metadata)
  values (v_proposal.user_id, v_proposal.lead_id, 'nota', 'Alteração solicitada na proposta', v_message,
    jsonb_build_object('proposal_id', v_proposal.id, 'version', v_proposal.current_version_number));
  return jsonb_build_object('success', true, 'status', 'em_negociacao', 'message', 'Pedido de alteração enviado ao consultor.');
end;
$$;

revoke all on function public.request_public_proposal_change(text, text) from public, anon, authenticated;
grant execute on function public.request_public_proposal_change(text, text) to service_role;

notify pgrst, 'reload schema';
