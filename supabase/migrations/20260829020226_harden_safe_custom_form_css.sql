alter table public.lead_capture_forms
  drop constraint if exists lead_capture_forms_custom_css_safe_check;

alter table public.lead_capture_forms
  add constraint lead_capture_forms_custom_css_safe_check check (
    char_length(custom_css) <= 20000
    and position('@' in custom_css) = 0
    and position('<' in custom_css) = 0
    and position('>' in custom_css) = 0
    and position(chr(92) in custom_css) = 0
    and position('url' in lower(custom_css)) = 0
    and position('http' in lower(custom_css)) = 0
    and position('data:' in lower(custom_css)) = 0
    and position('expression' in lower(custom_css)) = 0
    and position('javascript' in lower(custom_css)) = 0
    and position('display:none' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('visibility:hidden' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('position:fixed' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('opacity:0' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('font-size:0' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('overflow:hidden' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
    and position('clip-path' in lower(regexp_replace(custom_css, '[[:space:]]', '', 'g'))) = 0
  );
