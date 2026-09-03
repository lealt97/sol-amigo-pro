alter table public.lead_capture_forms
  add column if not exists color_mode text not null default 'automatic',
  add column if not exists surface_color text not null default '#F4F7FA',
  add column if not exists theme_colors jsonb not null default '{}'::jsonb;

alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_color_mode_check,
  add constraint lead_capture_forms_color_mode_check
    check (color_mode in ('automatic', 'detailed')),
  drop constraint if exists lead_capture_forms_surface_color_check,
  add constraint lead_capture_forms_surface_color_check
    check (surface_color ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists lead_capture_forms_theme_colors_check,
  add constraint lead_capture_forms_theme_colors_check
    check (
      jsonb_typeof(theme_colors) = 'object'
      and octet_length(theme_colors::text) <= 2000
    );

update public.lead_capture_forms
set custom_css_enabled = false,
    custom_css = ''
where custom_css_enabled = true
   or custom_css <> '';

comment on column public.lead_capture_forms.color_mode is
  'Modo do motor de cores: automatic gera o tema a partir de três cores; detailed usa os tokens semânticos.';

comment on column public.lead_capture_forms.surface_color is
  'Cor-base do fundo usada pelo modo automático do formulário.';

comment on column public.lead_capture_forms.theme_colors is
  'Tokens semânticos validados pelo aplicativo para o modo detalhado do formulário.';

comment on column public.lead_capture_forms.custom_css is
  'Campo legado desativado. O formulário usa somente o motor de cores semântico.';
