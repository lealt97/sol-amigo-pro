-- Expande recorrência do calendário para dias, semanas e meses.
-- Compatível com eventos antigos que usavam apenas recurrence_months.

alter table public.calendar_events
  add column if not exists recurrence_interval integer,
  add column if not exists recurrence_unit text;

alter table public.calendar_events
  drop constraint if exists calendar_events_recurrence_interval_check;

alter table public.calendar_events
  add constraint calendar_events_recurrence_interval_check
  check (recurrence_interval is null or recurrence_interval between 1 and 365);

alter table public.calendar_events
  drop constraint if exists calendar_events_recurrence_unit_check;

alter table public.calendar_events
  add constraint calendar_events_recurrence_unit_check
  check (recurrence_unit is null or recurrence_unit in ('days','weeks','months'));

update public.calendar_events
set
  recurrence_interval = coalesce(recurrence_interval, recurrence_months),
  recurrence_unit = coalesce(recurrence_unit, case when recurrence_months is not null then 'months' end)
where recurrence_months is not null
  and (recurrence_interval is null or recurrence_unit is null);

notify pgrst, 'reload schema';
