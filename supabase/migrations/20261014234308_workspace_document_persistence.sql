-- Additive persistence for existing modules; preserves legacy IDs and document versions.
create table public.workspace_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 180),
  value text check (value is null or octet_length(value) <= 12582912),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.workspace_documents enable row level security;
revoke all on public.workspace_documents from anon;
grant select, insert, update on public.workspace_documents to authenticated;
create policy workspace_documents_own on public.workspace_documents for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.check_workspace_revision() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and (new.user_id <> old.user_id or new.key <> old.key or new.revision <> old.revision + 1) then
    raise exception 'Invalid workspace revision' using errcode = '23514';
  end if;
  new.updated_at = now(); return new;
end $$;
create trigger workspace_revision before insert or update on public.workspace_documents for each row execute function public.check_workspace_revision();
revoke execute on function public.check_workspace_revision() from public, anon, authenticated;
