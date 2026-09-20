import { supabase } from '../lib/supabase';
import { Lead, LeadStage } from '../types';
import {
  getStoredLeadStatus,
  setStoredLeadStatus,
  removeStoredLeadStatus,
  isLegacyStatusTransitionError,
} from '../utils/leadStatusPersistence';

type LeadRow = Record<string, any>;

export type ProposalSystemType = 'On-Grid' | 'Híbrido';

export type ProposalDraftResult = {
  proposalId: string;
  proposalCode: string;
};

const mapLead = (row: LeadRow): Lead => {
  const localStatus = getStoredLeadStatus(row.id);
  return {
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
    status: localStatus || row.status,
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
  };
};

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
  removeStoredLeadStatus(leadId);
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

  try {
    const userResponse = await supabase.auth.getUser();
    const userId = userResponse.data?.user?.id;
    if (userId) {
      await supabase.from('lead_activities').insert({
        user_id: userId,
        lead_id: leadId,
        activity_type: 'nota',
        title: 'Anotação atualizada',
        description: notes.slice(0, 300),
      });
    }
  } catch {
    // Non-blocking
  }
}

export interface UpdateLeadParamsInput {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
  status?: Lead['status'];
  propertyType?: Lead['propertyType'];
  propertyStatus?: Lead['propertyStatus'];
  distributor?: string;
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  installationTimeframe?: string;
  preferredContactTime?: string;
  responsible?: string;
  notes?: string;
}

export async function updateLeadParameters(
  leadId: string,
  params: UpdateLeadParamsInput
): Promise<void> {
  if (params.status !== undefined) {
    setStoredLeadStatus(leadId, params.status);
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) payload.name = params.name;
  if (params.phone !== undefined) payload.phone = params.phone;
  if (params.email !== undefined) payload.email = params.email;
  if (params.street !== undefined) payload.street = params.street;
  if (params.addressNumber !== undefined) payload.address_number = params.addressNumber;
  if (params.city !== undefined) payload.city = params.city;
  if (params.state !== undefined) payload.state = params.state;
  if (params.status !== undefined) payload.status = params.status;
  if (params.propertyType !== undefined) payload.property_type = params.propertyType;
  if (params.propertyStatus !== undefined) payload.property_status = params.propertyStatus;
  if (params.distributor !== undefined) payload.distributor = params.distributor;
  if (params.averageMonthlyBill !== undefined) payload.average_monthly_bill = params.averageMonthlyBill;
  if (params.averageConsumptionKWh !== undefined) payload.average_consumption_kwh = params.averageConsumptionKWh;
  if (params.installationTimeframe !== undefined) payload.installation_timeframe = params.installationTimeframe;
  if (params.preferredContactTime !== undefined) payload.preferred_contact_time = params.preferredContactTime;
  if (params.responsible !== undefined) payload.responsible = params.responsible;
  if (params.notes !== undefined) payload.notes = params.notes;

  const { error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', leadId);

  if (error) {
    if (params.status !== undefined && isLegacyStatusTransitionError(error)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.status;
      const { error: fallbackError } = await supabase
        .from('leads')
        .update(fallbackPayload)
        .eq('id', leadId);
      if (fallbackError) throw fallbackError;
      return;
    }
    throw error;
  }
}

export async function updateLeadStatus(leadId: string, status: LeadStage): Promise<void> {
  // 1. Sempre persiste o status selecionado de imediato no armazenamento local
  setStoredLeadStatus(leadId, status);

  // 2. Tenta atualizar remotamente na tabela leads
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.warn('Aviso: atualização remota de status encontrou restrição (status mantido localmente):', error);
      // Tenta ao menos atualizar o timestamp para registrar atividade sem estourar restrição de status
      try {
        await supabase
          .from('leads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } catch {
        // Ignora erro secundário
      }
    }
  } catch (err) {
    console.warn('Falha de rede ao sincronizar status do lead:', err);
  }
}

export interface LeadProposalItem {
  id: string;
  code: string;
  systemType: string;
  status: string;
  createdAt: string;
  clientId?: string | null;
}

export async function fetchLeadProposals(leadId: string): Promise<LeadProposalItem[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('id, code, system_type, status, created_at, client_id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Erro ao carregar propostas do lead:', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    systemType: row.system_type || 'On-Grid',
    status: row.status,
    createdAt: row.created_at,
    clientId: row.client_id,
  }));
}

export async function deleteLeadProposal(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId);
  if (error) throw error;
}

export interface LeadDocumentItem {
  id: string;
  leadId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  objectPath: string;
  documentType: string;
  createdAt: string;
}

export async function fetchLeadEnergyBills(leadId: string): Promise<LeadDocumentItem[]> {
  const { data, error } = await supabase
    .from('lead_documents')
    .select('id, lead_id, original_name, mime_type, size_bytes, object_path, document_type, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Erro ao carregar documentos do lead:', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    leadId: row.lead_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    objectPath: row.object_path,
    documentType: row.document_type,
    createdAt: row.created_at,
  }));
}

export async function getEnergyBillSignedUrl(objectPath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('lead-energy-bills')
      .createSignedUrl(objectPath, 3600);
    if (error || !data?.signedUrl) {
      console.warn('Erro ao gerar URL assinada da conta de luz:', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Falha na criação de URL assinada:', err);
    return null;
  }
}

export async function fetchLeadNotesCount(leadId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('lead_activities')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('activity_type', 'nota');
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}


