alter table public.lead_capture_forms
  add column if not exists service_states text[] not null default array[
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
    'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ]::text[];

alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_service_states_check;

alter table public.lead_capture_forms
  add constraint lead_capture_forms_service_states_check check (
    cardinality(service_states) between 1 and 27
    and service_states <@ array[
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
      'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ]::text[]
  );

comment on column public.lead_capture_forms.service_states is
  'UFs brasileiras em que o integrador aceita novos leads pelo formulário público.';
