import type { WebsiteFormSettings } from '../types';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { ensureLeadCaptureForm } from './leads';

export interface ProfileBrandLogo {
  id: string;
  label: string;
  url: string;
  background: 'dark' | 'light';
}

const FORM_COLUMNS = [
  'id',
  'public_token',
  'name',
  'active',
  'widget_enabled',
  'allowed_origins',
  'service_states',
  'widget_mode',
  'company_name',
  'logo_url',
  'side_image_url',
  'side_image_urls',
  'side_image_rotation_enabled',
  'primary_color',
  'secondary_color',
  'headline',
  'subheadline',
  'submit_label',
  'success_message',
  'privacy_url',
  'show_powered_by',
  'custom_css_enabled',
  'custom_css',
].join(', ');

type WebsiteFormRow = {
  id: string;
  public_token: string;
  name: string;
  active: boolean;
  widget_enabled: boolean;
  allowed_origins: string[];
  service_states: string[];
  widget_mode: WebsiteFormSettings['widgetMode'];
  company_name: string;
  logo_url: string | null;
  side_image_url: string | null;
  side_image_urls: string[];
  side_image_rotation_enabled: boolean;
  primary_color: string;
  secondary_color: string;
  headline: string;
  subheadline: string;
  submit_label: string;
  success_message: string;
  privacy_url: string | null;
  show_powered_by: boolean;
  custom_css_enabled: boolean;
  custom_css: string;
};

const fromRow = (row: WebsiteFormRow): WebsiteFormSettings => ({
  id: row.id,
  publicToken: row.public_token,
  name: row.name,
  active: row.active,
  widgetEnabled: row.widget_enabled,
  allowedOrigins: row.allowed_origins ?? [],
  serviceStates: row.service_states ?? [],
  widgetMode: row.widget_mode,
  companyName: row.company_name,
  logoUrl: row.logo_url ?? '',
  sideImageUrls: row.side_image_urls?.length
    ? row.side_image_urls
    : row.side_image_url
      ? [row.side_image_url]
      : [],
  sideImageRotationEnabled: row.side_image_rotation_enabled ?? false,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  headline: row.headline,
  subheadline: row.subheadline,
  submitLabel: row.submit_label,
  successMessage: row.success_message,
  privacyUrl: row.privacy_url ?? '',
  showPoweredBy: row.show_powered_by,
  customCssEnabled: row.custom_css_enabled,
  customCss: row.custom_css ?? '',
});

const toUpdate = (settings: WebsiteFormSettings) => ({
  active: settings.active,
  widget_enabled: settings.widgetEnabled,
  allowed_origins: settings.allowedOrigins,
  service_states: settings.serviceStates,
  widget_mode: settings.widgetMode,
  company_name: settings.companyName.trim(),
  logo_url: settings.logoUrl.trim() || null,
  side_image_url: settings.sideImageUrls[0] ?? null,
  side_image_urls: settings.sideImageUrls,
  side_image_rotation_enabled: settings.sideImageRotationEnabled && settings.sideImageUrls.length > 1,
  primary_color: settings.primaryColor.toUpperCase(),
  secondary_color: settings.secondaryColor.toUpperCase(),
  headline: settings.headline.trim(),
  subheadline: settings.subheadline.trim(),
  submit_label: settings.submitLabel.trim(),
  success_message: settings.successMessage.trim(),
  privacy_url: settings.privacyUrl.trim() || null,
  show_powered_by: settings.showPoweredBy,
  custom_css_enabled: settings.customCssEnabled,
  custom_css: settings.customCss,
});

export const fetchProfileBrandLogos = async (): Promise<ProfileBrandLogo[]> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) return [];

  const stored = data.user.user_metadata?.brand_logos ?? {};
  const expectedPath = `/storage/v1/object/public/account-assets/${data.user.id}/logos/`;
  const projectHost = new URL(SUPABASE_URL).hostname;

  return (['dark', 'light'] as const).flatMap((background) =>
    [0, 1, 2].flatMap((index) => {
      const value = String(stored[background]?.[index] ?? '').trim();
      if (!value) return [];

      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.hostname !== projectHost || !url.pathname.startsWith(expectedPath)) {
          return [];
        }
      } catch {
        return [];
      }

      return [{
        id: `${background}-${index + 1}`,
        label: `${background === 'dark' ? 'Fundo escuro' : 'Fundo claro'} · Logo ${index + 1}`,
        url: value,
        background,
      }];
    })
  );
};

const FORM_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;
const FORM_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const uploadWebsiteFormImage = async (file: File, index: number): Promise<string> => {
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    throw new Error('O formulário aceita no máximo três fotos.');
  }
  if (!FORM_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use PNG, JPG ou WEBP.');
  }
  if (file.size > FORM_IMAGE_MAX_FILE_SIZE) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Sua sessão expirou. Entre novamente.');

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectPath = `${userData.user.id}/form-images/${crypto.randomUUID()}-${index + 1}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('account-assets')
    .upload(objectPath, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from('account-assets')
    .getPublicUrl(objectPath);

  return `${publicData.publicUrl}?v=${Date.now()}`;
};

export const normalizeWebsiteOrigin = (value: string): string => {
  const candidate = value.trim();
  if (!candidate) throw new Error('Informe o domínio do site.');

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error('Informe um domínio válido, como https://minhaempresa.com.br.');
  }

  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) {
    throw new Error('O site precisa usar HTTPS.');
  }
  if (url.username || url.password) throw new Error('O domínio não pode conter usuário ou senha.');
  return url.origin;
};

export const fetchWebsiteFormSettings = async (): Promise<WebsiteFormSettings> => {
  const base = await ensureLeadCaptureForm();
  const { data, error } = await supabase
    .from('lead_capture_forms')
    .select(FORM_COLUMNS)
    .eq('id', base.id)
    .single();

  if (error) throw error;
  return fromRow(data as unknown as WebsiteFormRow);
};

export const saveWebsiteFormSettings = async (
  settings: WebsiteFormSettings
): Promise<WebsiteFormSettings> => {
  const { data, error } = await supabase
    .from('lead_capture_forms')
    .update(toUpdate(settings))
    .eq('id', settings.id)
    .select(FORM_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data as unknown as WebsiteFormRow);
};

export const rotateWebsiteFormToken = async (formId: string): Promise<WebsiteFormSettings> => {
  const { data, error } = await supabase
    .from('lead_capture_forms')
    .update({ public_token: crypto.randomUUID(), widget_enabled: false })
    .eq('id', formId)
    .select(FORM_COLUMNS)
    .single();

  if (error) throw error;
  return fromRow(data as unknown as WebsiteFormRow);
};
