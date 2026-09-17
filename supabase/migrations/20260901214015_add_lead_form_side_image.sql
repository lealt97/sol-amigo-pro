alter table public.lead_capture_forms
  add column if not exists side_image_url text;

alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_side_image_url_check,
  add constraint lead_capture_forms_side_image_url_check
    check (
      side_image_url is null
      or (
        char_length(side_image_url) <= 700
        and side_image_url ~ '^https://'
      )
    );

comment on column public.lead_capture_forms.side_image_url is
  'Foto opcional exibida na lateral esquerda do formulário somente em telas grandes.';
