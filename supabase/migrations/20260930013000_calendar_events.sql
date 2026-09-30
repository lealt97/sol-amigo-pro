-- Calendário operacional do Sol Amigo PRO.
-- Mantém eventos por conta e suporta recorrência, manutenção, instalação e atividades comerciais.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  series_id text,
  occurrence_index integer check (occurrence_index is null or occurrence_index > 0),
  title text not null check (char_length(title) between 2 and 180),
  event_type text not null check (event_type in (
    'Manutenção','Instalação','Vistoria','Visita Técnica','Homologação','Reunião Comercial','Outro'
  )),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  status text not null default 'Agendado' check (status in ('Agendado','Em andamento','Concluído','Cancelado')),
  priority text not null default 'Média' check (priority in ('Alta','Média','Baixa')),
  client_id text,
  client_name text,
  proposal_code text,
  maintenance_plan_id text,
  maintenance_plan_name text,
  recurrence_months integer check (recurrence_months is null or recurrence_months between 1 and 36),
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_owner_start_idx
  on public.calendar_events (user_id, start_at);

create index if not exists calendar_events_owner_status_idx
  on public.calendar_events (user_id, status, start_at);

create index if not exists calendar_events_series_idx
  on public.calendar_events (user_id, series_id)
  where series_id is not null;

alter table public.calendar_events enable row level security;

grant select, insert, update, delete on public.calendar_events to authenticated;
revoke all on public.calendar_events from anon;

drop policy if exists "calendar_events_own" on public.calendar_events;
create policy "calendar_events_own"
  on public.calendar_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.touch_calendar_events_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_events_touch on public.calendar_events;
create trigger calendar_events_touch
before update on public.calendar_events
for each row execute function public.touch_calendar_events_updated_at();

revoke execute on function public.touch_calendar_events_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';
