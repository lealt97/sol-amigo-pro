alter table public.lead_capture_forms
  add column if not exists side_image_urls text[] not null default '{}'::text[],
  add column if not exists side_image_rotation_enabled boolean not null default false;

update public.lead_capture_forms
set side_image_urls = array[side_image_url]
where side_image_url is not null
  and cardinality(side_image_urls) = 0;

alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_side_image_urls_limit_check,
  add constraint lead_capture_forms_side_image_urls_limit_check
    check (
      cardinality(side_image_urls) <= 3
      and array_position(side_image_urls, null) is null
    );

comment on column public.lead_capture_forms.side_image_urls is
  'Até três fotos exibidas na lateral esquerda do formulário em telas grandes.';

comment on column public.lead_capture_forms.side_image_rotation_enabled is
  'Alterna automaticamente as fotos laterais usando transição de opacidade.';
