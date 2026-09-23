import { supabase } from '../lib/supabase';
import { Lead, LeadStage } from '../types';
import { parseLeadNotes } from '../utils/leadNotes';
import {
  getStoredLeadStatus,
  setStoredLeadStatus,
  removeStoredLeadStatus,
  isLegacyStatusTransitionError,
} from '../utils/leadStatusPersistence';

type LeadRow = Record<string, any>;

const MANUAL_LEADS_STORAGE_KEY = 'sol_amigo_manual_leads_cache';

export function getStoredManualLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_LEADS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredManualLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MANUAL_LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // Non-blocking
  }
}

export type ProposalSystemType = 'On-Grid' | 'Híbrido';

export const LEADS_UPDATED_EVENT = 'solamigo:leads-updated';

export const isLeadConverted = (lead?: Lead | Partial<Lead> | null): boolean => {
  if (!lead) return false;
  return Boolean(lead.clientId || (lead.status as string) === 'Cliente');
};

export const isActiveLead = (lead: Lead): boolean => {
  return !isLeadConverted(lead);
};

export type ProposalDraftResult = {
  proposalId: string;
  proposalCode: string;
};

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  street?: string;
  addressNumber?: string;
  propertyType?: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  distributor?: string;
  propertyStatus?: 'Próprio' | 'Alugado' | 'Em construção' | 'Outro';
  status?: LeadStage;
  responsible?: string;
  notes?: string;
}

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
  let dbLeads: Lead[] = [];
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .is('archived_at', null)
      .is('trashed_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) {
      dbLeads = data.map(mapLead);
    }
  } catch (err) {
    console.warn('Erro ao buscar leads remotos:', err);
  }

  const manualLeads = getStoredManualLeads();
  const dbIds = new Set(dbLeads.map((l) => l.id));
  const uniqueManual = manualLeads.filter((l) => !dbIds.has(l.id));
  const combined = [...uniqueManual, ...dbLeads];
  combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return combined;
}

export async function createManualLead(input: CreateLeadInput): Promise<Lead> {
  const normPhone = input.phone.replace(/\D/g, '');
  const propType = input.propertyType || 'Residencial';
  const stateCode = (input.state || 'SP').trim().toUpperCase().slice(0, 2);
  const nowIso = new Date().toISOString();

  let createdLead: Lead | null = null;

  // 1. Tenta criar via RPC no Supabase
  try {
    const { data, error } = await supabase.rpc('create_manual_lead', {
      p_name: input.name.trim(),
      p_phone: input.phone.trim(),
      p_email: input.email?.trim() || null,
      p_city: input.city.trim(),
      p_state: stateCode,
      p_property_type: propType,
      p_average_monthly_bill: input.averageMonthlyBill ?? null,
      p_average_consumption_kwh: input.averageConsumptionKWh ?? null,
      p_distributor: input.distributor?.trim() || null,
      p_property_status: input.propertyStatus || null,
      p_notes: input.notes?.trim() || null,
      p_responsible: input.responsible?.trim() || null,
    });

    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.id) {
        if (input.street || input.addressNumber) {
          try {
            await supabase
              .from('leads')
              .update({
                street: input.street?.trim() || null,
                address_number: input.addressNumber?.trim() || null,
              })
              .eq('id', row.id);
            row.street = input.street?.trim() || null;
            row.address_number = input.addressNumber?.trim() || null;
          } catch {
            // Non-blocking
          }
        }
        createdLead = mapLead(row);
      }
    }
  } catch (err) {
    console.warn('Tentativa via RPC create_manual_lead falhou, gerando lead resiliente:', err);
  }

  // 2. Se a RPC não foi executada ou falhou (ex: ambiente offline/dev), cria objeto completo
  if (!createdLead) {
    const newId = `lead-${Date.now()}`;
    createdLead = {
      id: newId,
      userId: 'local-user',
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      city: input.city.trim(),
      state: stateCode,
      street: input.street?.trim() || undefined,
      addressNumber: input.addressNumber?.trim() || undefined,
      propertyType: propType,
      averageMonthlyBill: input.averageMonthlyBill,
      averageConsumptionKWh: input.averageConsumptionKWh,
      distributor: input.distributor?.trim() || undefined,
      propertyStatus: input.propertyStatus || undefined,
      status: input.status || 'novo',
      responsible: input.responsible?.trim() || undefined,
      source: 'Atendimento manual',
      consentAt: nowIso,
      lastSubmissionAt: nowIso,
      notes: input.notes?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  // Se o usuário especificou um status diferente de 'novo'
  if (input.status && input.status !== 'novo') {
    createdLead.status = input.status;
    setStoredLeadStatus(createdLead.id, input.status);
  }

  // Salva no storage local resiliente
  const localList = getStoredManualLeads();
  saveStoredManualLeads([createdLead, ...localList.filter((l) => l.id !== createdLead!.id)]);

  // Emite evento para sincronizar toda a aplicação
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LEADS_UPDATED_EVENT, { detail: { newLead: createdLead } })
    );
  }

  return createdLead;
}

export async function addLeadToClients(leadId: string): Promise<string> {
  const { data, error } = await supabase.rpc('add_lead_to_clients', { p_lead_id: leadId });
  if (error) throw error;
  if (!data) throw new Error('O cliente não foi criado.');
  return String(data);
}

export async function createProposalFromLead(
  leadId: string,
  systemType: ProposalSystemType,
  extra?: { clientId?: string | null; clientName?: string | null }
): Promise<ProposalDraftResult> {
  try {
    const { data, error } = await supabase.rpc('create_proposal_from_lead', {
      p_lead_id: leadId,
      p_system_type: systemType,
    });
    if (!error && data) {
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.proposal_id && result?.proposal_code) {
        return { proposalId: result.proposal_id, proposalCode: result.proposal_code };
      }
    }
  } catch (err) {
    console.warn('RPC create_proposal_from_lead falhou, gerando proposta local:', err);
  }

  // Fallback seguro caso seja um cliente sem lead no backend Supabase
  try {
    const { createQuickProposalForClient } = await import('./proposals');
    const targetClientId = (extra?.clientId || leadId).trim();
    const targetClientName = (extra?.clientName || 'Cliente').trim();
    const quick = await createQuickProposalForClient({
      clientId: targetClientId,
      clientName: targetClientName,
      systemType: systemType === 'Híbrido' ? 'Híbrido' : 'On-Grid',
    });
    return { proposalId: quick.id, proposalCode: quick.code };
  } catch (err) {
    console.warn('Erro ao gerar proposta rápida fallback:', err);
    throw new Error('A proposta não pôde ser criada.');
  }
}

export async function deleteOwnedLead(leadId: string): Promise<void> {
  removeStoredLeadStatus(leadId);
  const localList = getStoredManualLeads();
  saveStoredManualLeads(localList.filter((l) => l.id !== leadId));
  try {
    const { data, error } = await supabase.rpc('delete_owned_lead', { p_lead_id: leadId });
    if (error) {
      console.warn('Aviso RPC delete_owned_lead:', error);
    }
  } catch (err) {
    console.warn('Erro ao deletar lead no Supabase:', err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEADS_UPDATED_EVENT, { detail: { deletedLeadId: leadId } }));
  }
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (!error) {
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
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar notas no Supabase leads:', err);
  }

  // Sincroniza também no registro do cliente se aplicável
  try {
    const { updateClientNotes } = await import('./clients');
    await updateClientNotes(leadId, notes);
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

  try {
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
        if (fallbackError) console.warn('Aviso ao atualizar lead fallback:', fallbackError);
      }
    }
  } catch (err) {
    console.warn('Erro ao atualizar leads no Supabase (pode ser cliente cadastrado diretamente):', err);
  }

  // Atualiza também nos clientes se o leadId for um cliente ou sourceLeadId
  try {
    const { updateClient } = await import('./clients');
    await updateClient(leadId, {
      name: params.name,
      phone: params.phone,
      email: params.email,
      street: params.street,
      addressNumber: params.addressNumber,
      city: params.city,
      state: params.state,
      propertyType: params.propertyType,
      type: params.propertyType,
      concessionaria: params.distributor,
      avgConsumptionKWh: params.averageConsumptionKWh,
      avgMonthlyBill: params.averageMonthlyBill,
      responsible: params.responsible,
      notes: params.notes,
    });
  } catch {
    // Non-blocking
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
  title?: string;
  totalValue?: number;
}

export async function fetchLeadProposals(
  leadId: string,
  extra?: { clientId?: string | null; clientName?: string | null }
): Promise<LeadProposalItem[]> {
  const items: LeadProposalItem[] = [];

  const cleanLeadId = (leadId || '').trim();
  const cleanClientId = (extra?.clientId || '').trim();
  const cleanName = (extra?.clientName || '').trim().toLowerCase();

  try {
    const orClauses: string[] = [];
    if (cleanLeadId) {
      orClauses.push(`lead_id.eq.${cleanLeadId}`, `client_id.eq.${cleanLeadId}`);
    }
    if (cleanClientId && cleanClientId !== cleanLeadId) {
      orClauses.push(`client_id.eq.${cleanClientId}`, `lead_id.eq.${cleanClientId}`);
    }

    if (orClauses.length > 0) {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, code, system_type, status, created_at, client_id, title, total_value')
        .or(orClauses.join(','))
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        items.push(
          ...data.map((row: any) => ({
            id: row.id,
            code: row.code,
            systemType: row.system_type || 'On-Grid',
            status: row.status,
            createdAt: row.created_at,
            clientId: row.client_id,
            title: row.title,
            totalValue: row.total_value,
          }))
        );
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar propostas do Supabase:', err);
  }

  // Verifica propostas armazenadas localmente
  try {
    const { getStoredProposalsLocal } = await import('./proposals');
    const localProposals = getStoredProposalsLocal();
    const matches = localProposals.filter((p) => {
      if (cleanLeadId && (p.clientId === cleanLeadId || (p as any).leadId === cleanLeadId)) {
        return true;
      }
      if (cleanClientId && (p.clientId === cleanClientId || (p as any).leadId === cleanClientId)) {
        return true;
      }
      if (cleanName && p.clientName && p.clientName.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    });

    for (const lp of matches) {
      if (!items.some((i) => i.id === lp.id || i.code === lp.code)) {
        items.push({
          id: lp.id,
          code: lp.code,
          systemType: lp.systemType || 'On-Grid',
          status: lp.status,
          createdAt: lp.createdAt,
          clientId: lp.clientId,
          title: lp.title,
          totalValue: lp.totalValue,
        });
      }
    }
  } catch {
    // Non-blocking
  }

  return items;
}

export async function deleteLeadProposal(proposalId: string): Promise<void> {
  try {
    const { getStoredProposalsLocal, saveStoredProposalsLocal } = await import('./proposals');
    const local = getStoredProposalsLocal();
    const filtered = local.filter((p) => p.id !== proposalId);
    if (filtered.length !== local.length) {
      saveStoredProposalsLocal(filtered);
    }
  } catch {
    // ignore
  }

  try {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId);
    if (error) console.warn('Aviso ao deletar proposta do Supabase:', error);
  } catch (err) {
    console.warn('Falha de rede ao excluir proposta:', err);
  }
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
    const { data, error } = await supabase
      .from('leads')
      .select('notes')
      .eq('id', leadId)
      .maybeSingle();
    if (!error && data) {
      return parseLeadNotes(data.notes).length;
    }
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('notes')
      .eq('id', leadId)
      .maybeSingle();
    if (!clientErr && clientData) {
      return parseLeadNotes(clientData.notes).length;
    }
    return 0;
  } catch {
    return 0;
  }
}


