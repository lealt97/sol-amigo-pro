-- Billing is disabled until a payment provider is configured and validated in test mode.
create table public.platform_config (
  id boolean primary key default true check (id),
  billing_enforced boolean not null default false
);
insert into public.platform_config(id,billing_enforced) values(true,false);
alter table public.platform_config enable row level security;
grant select on public.platform_config to authenticated;
grant all on public.platform_config to service_role;
revoke all on public.platform_config from anon;
create policy platform_config_read on public.platform_config for select to authenticated using (true);

create table public.account_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','kiwify','manual')),
  provider_subscription_id text not null,
  status text not null check (status in ('trialing','active','past_due','unpaid','canceled','refunded','disputed')),
  current_period_end timestamptz not null,
  grace_until timestamptz,
  last_event_created bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.account_subscriptions enable row level security;
revoke all on public.account_subscriptions from anon, authenticated;
grant select on public.account_subscriptions to authenticated;
grant all on public.account_subscriptions to service_role;
create policy account_subscriptions_read_own on public.account_subscriptions for select to authenticated using ((select auth.uid())=user_id);

create table public.billing_events (
  provider text not null,
  event_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(provider,event_id)
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;
grant all on public.billing_events to service_role;

create function public.account_can_write() returns boolean
language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and (
    not coalesce((select billing_enforced from public.platform_config where id),true)
    or exists (
      select 1 from public.account_subscriptions
      where user_id = (select auth.uid()) and (
        (status in ('trialing','active','canceled') and current_period_end > now())
        or (status='past_due' and greatest(current_period_end,grace_until) > now())
      )
    )
  );
$$;
revoke execute on function public.account_can_write() from public, anon;
grant execute on function public.account_can_write() to authenticated;

-- The service role is the only writer; browser requests and metadata cannot grant access.
create function public.apply_billing_event(
  p_provider text,p_event_id text,p_user_id uuid,p_subscription_id text,
  p_status text,p_period_end timestamptz,p_grace_until timestamptz,p_created bigint
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_provider not in ('stripe','kiwify','manual') or length(p_event_id) not between 1 and 200 then raise exception 'Invalid billing event'; end if;
  insert into public.billing_events(provider,event_id,user_id) values(p_provider,p_event_id,p_user_id) on conflict do nothing;
  if not found then return false; end if;
  insert into public.account_subscriptions(user_id,provider,provider_subscription_id,status,current_period_end,grace_until,last_event_created)
  values(p_user_id,p_provider,p_subscription_id,p_status,p_period_end,p_grace_until,p_created)
  on conflict(user_id) do update set provider=excluded.provider,provider_subscription_id=excluded.provider_subscription_id,
    status=excluded.status,current_period_end=excluded.current_period_end,grace_until=excluded.grace_until,
    last_event_created=excluded.last_event_created,updated_at=now()
  where public.account_subscriptions.last_event_created <= excluded.last_event_created;
  return found;
end $$;
revoke execute on function public.apply_billing_event(text,text,uuid,text,text,timestamptz,timestamptz,bigint) from public,anon,authenticated;
grant execute on function public.apply_billing_event(text,text,uuid,text,text,timestamptz,timestamptz,bigint) to service_role;

-- Reads remain available when subscriptions expire; no business data is deleted.
drop policy workspace_documents_own on public.workspace_documents;
create policy workspace_documents_select on public.workspace_documents for select to authenticated using ((select auth.uid())=user_id);
create policy workspace_documents_insert on public.workspace_documents for insert to authenticated with check ((select auth.uid())=user_id and (select public.account_can_write()));
create policy workspace_documents_update on public.workspace_documents for update to authenticated
using ((select auth.uid())=user_id and (select public.account_can_write())) with check ((select auth.uid())=user_id and (select public.account_can_write()));

do $$ declare p record; begin
  for p in select * from pg_policies where schemaname='public' and tablename in ('clients','leads','lead_tasks','lead_capture_forms','public_proposal_documents','proposals') and cmd in ('INSERT','UPDATE','DELETE') loop
    execute format('alter policy %I on public.%I %s %s', p.policyname,p.tablename,
      case when p.qual is not null then 'using (('||p.qual||') and (select public.account_can_write()))' else '' end,
      case when p.with_check is not null then 'with check (('||p.with_check||') and (select public.account_can_write()))' else '' end);
  end loop;
end $$;

-- Preserve the existing explicit owner-deletion operation, but do not let its
-- SECURITY DEFINER execution bypass subscription write restrictions.
create or replace function public.delete_owned_lead(p_lead_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Autenticação obrigatória'; end if;
  if not public.account_can_write() then raise exception 'A conta está em modo de leitura.' using errcode='42501'; end if;
  delete from public.leads where id=p_lead_id and user_id=v_user_id;
  return found;
end $$;
revoke execute on function public.delete_owned_lead(uuid) from public,anon;
grant execute on function public.delete_owned_lead(uuid) to authenticated;
