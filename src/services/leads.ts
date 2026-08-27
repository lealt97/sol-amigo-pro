import { Lead, LeadCaptureForm, LeadStage } from '../types';
import { supabase } from '../lib/supabase';

type LeadRow = {
  id: string;
  user_id: string;
  capture_form_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  state: string;
  property_type: Lead['propertyType'];
  average_monthly_bill: number | string | null;
  average_consumption_kwh: number | string | null;
  distributor: string | null;
  property_status: Lead['propertyStatus'] | null;
  installation_timeframe: string | null;
  preferred_contact_time: string | null;
  status: LeadStage;
  responsible: string | null;
  source: string;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  consent_at: string;
  next_activity_at: string | null;
  last_submission_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type LeadCaptureFormRow = {
  id: string;
  public_token: string;
  name: string;
  active: boolean;
};

export const leadFromRow = (row: LeadRow): Lead => ({
  id: row.id,
  userId: row.user_id,
  captureFormId: row.capture_form_id ?? undefined,
  name: row.name,
  phone: row.phone,
  email: row.email ?? undefined,
  city: row.city,
  state: row.state,
  propertyType: row.property_type,
  averageMonthlyBill:
    row.average_monthly_bill == null ? undefined : Number(row.average_monthly_bill),
  averageConsumptionKWh:
    row.average_consumption_kwh == null ? undefined : Number(row.average_consumption_kwh),
  distributor: row.distributor ?? undefined,
  propertyStatus: row.property_status ?? undefined,
  installationTimeframe: row.installation_timeframe ?? undefined,
  preferredContactTime: row.preferred_contact_time ?? undefined,
  status: row.status,
  responsible: row.responsible ?? undefined,
  source: row.source,
  landingPage: row.landing_page ?? undefined,
  utmSource: row.utm_source ?? undefined,
  utmMedium: row.utm_medium ?? undefined,
  utmCampaign: row.utm_campaign ?? undefined,
  consentAt: row.consent_at,
  nextActivityAt: row.next_activity_at ?? undefined,
  lastSubmissionAt: row.last_submission_at,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const captureFormFromRow = (row: LeadCaptureFormRow): LeadCaptureForm => ({
  id: row.id,
  publicToken: row.public_token,
  name: row.name,
  active: row.active,
});

export const fetchLeads = async (): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as LeadRow[]).map(leadFromRow);
};

export const updateLeadStage = async (id: string, status: LeadStage): Promise<Lead> => {
  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return leadFromRow(data as LeadRow);
};

export const ensureLeadCaptureForm = async (): Promise<LeadCaptureForm> => {
  const { data: existing, error: selectError } = await supabase
    .from('lead_capture_forms')
    .select('id, public_token, name, active')
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return captureFormFromRow(existing as LeadCaptureFormRow);

  const { data, error } = await supabase
    .from('lead_capture_forms')
    .insert({ name: 'Formulário principal' })
    .select('id, public_token, name, active')
    .single();

  if (error) {
    // Duas abas podem tentar criar o formulário ao mesmo tempo. Nesse caso, lê o já criado.
    if (error.code === '23505') {
      const { data: concurrentForm, error: concurrentError } = await supabase
        .from('lead_capture_forms')
        .select('id, public_token, name, active')
        .single();
      if (concurrentError) throw concurrentError;
      return captureFormFromRow(concurrentForm as LeadCaptureFormRow);
    }
    throw error;
  }

  return captureFormFromRow(data as LeadCaptureFormRow);
};
