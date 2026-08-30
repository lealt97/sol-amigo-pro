import {
  Lead,
  LeadActivity,
  LeadActivityType,
  LeadCaptureForm,
  LeadStage,
  LeadTask,
  LeadTaskStatus,
} from '../types';
import { supabase } from '../lib/supabase';

type LeadRow = {
  id: string;
  user_id: string;
  capture_form_id: string | null;
  client_id: string | null;
  consumer_unit_id: string | null;
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
  qualified_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
};

type LeadTaskRow = {
  id: string;
  user_id: string;
  lead_id: string;
  title: string;
  due_at: string;
  status: LeadTaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type LeadActivityRow = {
  id: string;
  user_id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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
  clientId: row.client_id ?? undefined,
  consumerUnitId: row.consumer_unit_id ?? undefined,
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
  qualifiedAt: row.qualified_at ?? undefined,
  lostAt: row.lost_at ?? undefined,
  lostReason: row.lost_reason ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const taskFromRow = (row: LeadTaskRow): LeadTask => ({
  id: row.id,
  userId: row.user_id,
  leadId: row.lead_id,
  title: row.title,
  dueAt: row.due_at,
  status: row.status,
  completedAt: row.completed_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const activityFromRow = (row: LeadActivityRow): LeadActivity => ({
  id: row.id,
  userId: row.user_id,
  leadId: row.lead_id,
  activityType: row.activity_type,
  title: row.title,
  description: row.description ?? undefined,
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
});

const captureFormFromRow = (row: LeadCaptureFormRow): LeadCaptureForm => ({
  id: row.id,
  publicToken: row.public_token,
  name: row.name,
  active: row.active,
});

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sessão inválida.');
  return data.user.id;
};

const leadFromRpc = async (
  functionName: string,
  parameters: Record<string, unknown>
): Promise<Lead> => {
  const { data, error } = await supabase.rpc(functionName, parameters).single();
  if (error) throw error;
  return leadFromRow(data as LeadRow);
};

export const fetchLeads = async (): Promise<Lead[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as LeadRow[]).map(leadFromRow);
};

export const updateLeadStage = async (id: string, status: LeadStage): Promise<Lead> =>
  leadFromRpc('set_lead_stage', { p_lead_id: id, p_status: status });

export const saveLeadDetails = async (
  id: string,
  responsible: string,
  notes: string
): Promise<Lead> =>
  leadFromRpc('save_lead_details', {
    p_lead_id: id,
    p_responsible: responsible,
    p_notes: notes,
  });

export const registerLeadContact = async (
  id: string,
  channel: string,
  summary: string,
  nextActivityAt?: string
): Promise<Lead> =>
  leadFromRpc('register_lead_contact', {
    p_lead_id: id,
    p_channel: channel,
    p_summary: summary,
    p_next_activity_at: nextActivityAt ?? null,
  });

export const qualifyLead = async (
  id: string,
  responsible: string,
  notes: string
): Promise<Lead> =>
  leadFromRpc('qualify_lead', {
    p_lead_id: id,
    p_responsible: responsible,
    p_notes: notes,
  });

export const markLeadLost = async (id: string, reason: string): Promise<Lead> =>
  leadFromRpc('mark_lead_lost', { p_lead_id: id, p_reason: reason });

export const fetchLeadTasks = async (leadId: string): Promise<LeadTask[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('lead_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('status', { ascending: false })
    .order('due_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as LeadTaskRow[]).map(taskFromRow);
};

export const fetchLeadActivities = async (leadId: string): Promise<LeadActivity[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as LeadActivityRow[]).map(activityFromRow);
};

export const createLeadTask = async (
  leadId: string,
  title: string,
  dueAt: string
): Promise<LeadTask> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('lead_tasks')
    .insert({ user_id: userId, lead_id: leadId, title, due_at: dueAt })
    .select('*')
    .single();

  if (error) throw error;
  return taskFromRow(data as LeadTaskRow);
};

export const completeLeadTask = async (taskId: string): Promise<LeadTask> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('lead_tasks')
    .update({ status: 'concluida', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return taskFromRow(data as LeadTaskRow);
};

export const ensureLeadCaptureForm = async (): Promise<LeadCaptureForm> => {
  const userId = await getCurrentUserId();
  const { data: existing, error: selectError } = await supabase
    .from('lead_capture_forms')
    .select('id, public_token, name, active')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return captureFormFromRow(existing as LeadCaptureFormRow);

  const { data, error } = await supabase
    .from('lead_capture_forms')
    .insert({ user_id: userId, name: 'Formulário principal' })
    .select('id, public_token, name, active')
    .single();

  if (error) {
    // Duas abas podem tentar criar o formulário ao mesmo tempo. Nesse caso, lê o já criado.
    if (error.code === '23505') {
      const { data: concurrentForm, error: concurrentError } = await supabase
        .from('lead_capture_forms')
        .select('id, public_token, name, active')
        .eq('user_id', userId)
        .single();
      if (concurrentError) throw concurrentError;
      return captureFormFromRow(concurrentForm as LeadCaptureFormRow);
    }
    throw error;
  }

  return captureFormFromRow(data as LeadCaptureFormRow);
};
