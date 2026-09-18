import { supabase } from '../lib/supabase';
import { Lead } from '../types';

type LeadRow = Record<string, any>;

export type ProposalSystemType = 'On-Grid' | 'Híbrido';

export type ProposalDraftResult = {
  proposalId: string;
  proposalCode: string;
};

const mapLead = (row: LeadRow): Lead => ({
  id: row.id,
  userId: row.user_id,
  captureFormId: row.capture_form_id ?? undefined,
  clientId: row.client_id ?? undefined,
  name: row.name,
  phone: row.phone,
  email: row.email ?? undefined,
  city: row.city,
  state: row.state,
  street: row.street ?? undefined,
  addressNumber: row.address_number ?? undefined,
  propertyType: row.property_type,
  averageMonthlyBill: row.average_monthly_bill == null ? undefined : Number(row.average_monthly_bill),
  averageConsumptionKWh: row.average_consumption_kwh == null ? undefined : Number(row.average_consumption_kwh),
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
  archivedAt: row.archived_at ?? undefined,
  trashedAt: row.trashed_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .is('archived_at', null)
    .is('trashed_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function addLeadToClients(leadId: string): Promise<string> {
  const { data, error } = await supabase.rpc('add_lead_to_clients', { p_lead_id: leadId });
  if (error) throw error;
  if (!data) throw new Error('O cliente não foi criado.');
  return String(data);
}

export async function createProposalFromLead(
  leadId: string,
  systemType: ProposalSystemType
): Promise<ProposalDraftResult> {
  const { data, error } = await supabase.rpc('create_proposal_from_lead', {
    p_lead_id: leadId,
    p_system_type: systemType,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.proposal_id || !result?.proposal_code) throw new Error('A proposta não foi criada.');
  return { proposalId: result.proposal_id, proposalCode: result.proposal_code };
}

export async function deleteOwnedLead(leadId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_owned_lead', { p_lead_id: leadId });
  if (error) throw error;
  if (!data) throw new Error('Lead não encontrado ou sem permissão para excluir.');
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
}

export interface UpdateLeadParamsInput {
  status?: Lead['status'];
  propertyType?: Lead['propertyType'];
  propertyStatus?: Lead['propertyStatus'];
  distributor?: string;
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  installationTimeframe?: string;
  preferredContactTime?: string;
  responsible?: string;
}

export async function updateLeadParameters(
  leadId: string,
  params: UpdateLeadParamsInput
): Promise<void> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (params.status !== undefined) payload.status = params.status;
  if (params.propertyType !== undefined) payload.property_type = params.propertyType;
  if (params.propertyStatus !== undefined) payload.property_status = params.propertyStatus;
  if (params.distributor !== undefined) payload.distributor = params.distributor;
  if (params.averageMonthlyBill !== undefined) payload.average_monthly_bill = params.averageMonthlyBill;
  if (params.averageConsumptionKWh !== undefined) payload.average_consumption_kwh = params.averageConsumptionKWh;
  if (params.installationTimeframe !== undefined) payload.installation_timeframe = params.installationTimeframe;
  if (params.preferredContactTime !== undefined) payload.preferred_contact_time = params.preferredContactTime;
  if (params.responsible !== undefined) payload.responsible = params.responsible;

  const { error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', leadId);
  if (error) throw error;
}

