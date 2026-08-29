import type { WebsiteFormSettings } from '../types';
import { supabase } from '../lib/supabase';
import { ensureLeadCaptureForm } from './leads';

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
