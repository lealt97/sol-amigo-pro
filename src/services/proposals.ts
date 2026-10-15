export { clientProposalToSolarProposal } from '../features/proposals/document';
import { accountStorage, saveWorkspace } from '../platform/workspace/workspace';
import { MaintenancePlanSelection, SolarProposal } from '../types';
import { buildPublicProposalUrl } from '../utils/publicProposal';
import { mergePublicProposalSignals } from '../utils/publicProposalSignals';
import { fetchPublicProposalSignals, type PublicProposalSignal } from './publicProposals';

export interface ProposalApprovalDetails {
  approvedBy?: string;
  approvedAt?: string;
  approvalDocument?: string;
  approvalNotes?: string;
  refusedAt?: string;
  refusalReason?: string;
  refusalNotes?: string;
  viewedAt?: string;
}

export interface ClientProposal {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  title: string;
  systemPowerKWp: number;
  systemType: 'On-Grid' | 'Híbrido' | 'Off-Grid';
  totalValue: number;
  status: 'Aprovada' | 'Em negociação' | 'Pendente' | 'Recusada' | 'Enviada' | 'Visualizada' | 'Rascunho';
  modulesCount?: number;
  moduleModel?: string;
  inverterModel?: string;
  batteryModel?: string;
  batteryCount?: number;
  estimatedMonthlyGenKWh?: number;
  estimatedMonthlySavings?: number;
  maintenancePlan?: MaintenancePlanSelection;
  notes?: string;
  documentSnapshot?: SolarProposal;
  approvalDetails?: ProposalApprovalDetails;
  createdAt: string;
}

export const PROPOSALS_STORAGE_KEY = 'solamigo.proposals.v1';
export const PROPOSALS_UPDATED_EVENT = 'solamigo:proposals-updated';

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === PROPOSALS_STORAGE_KEY) {
      const local = getStoredProposalsLocal();
      window.dispatchEvent(
        new CustomEvent(PROPOSALS_UPDATED_EVENT, { detail: local })
      );
    }
  });
}

export const INITIAL_CLIENT_PROPOSALS: ClientProposal[] = [];

export function isDemoProposal(p: { isDemo?: boolean; id?: string; code?: string; clientName?: string; client_name?: string }): boolean {
  return p?.isDemo === true;
}

export function getStoredProposalsLocal(): ClientProposal[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = accountStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove permanentemente quaisquer propostas legadas de demonstração
      const cleaned = parsed.filter((p) => !isDemoProposal(p));
      if (cleaned.length !== parsed.length) {
        accountStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('Erro ao carregar propostas do localStorage:', err);
  }

  return [];
}

export function saveStoredProposalsLocal(proposals: ClientProposal[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const filtered = proposals.filter((p) => !isDemoProposal(p));
    accountStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(PROPOSALS_UPDATED_EVENT, { detail: filtered }));
  } catch (err) {
    console.warn('Erro ao salvar propostas no localStorage:', err);
  }
}

export async function deleteClientProposal(proposalId: string): Promise<ClientProposal[]> {
  const { supabase } = await import('../lib/supabase');
  // Revoke public snapshots first. A failed revocation must not report deletion success.
  const { error: linkError } = await supabase.from('public_proposal_documents').delete().eq('source_id', proposalId);
  if (linkError) throw new Error('Não foi possível desativar os links desta proposta.');
  if (/^[0-9a-f-]{36}$/i.test(proposalId)) {
    const { error } = await supabase.from('proposals').delete().eq('id', proposalId);
    if (error) throw new Error('Não foi possível excluir a proposta.');
  }
  const updated = getStoredProposalsLocal().filter(proposal => proposal.id !== proposalId);
  saveStoredProposalsLocal(updated);
  await saveWorkspace();
  return updated;
}

export async function fetchAllClientProposals(): Promise<ClientProposal[]> {
  let local = getStoredProposalsLocal();
  let publicSignals: PublicProposalSignal[] = [];
  try { publicSignals = await fetchPublicProposalSignals(); local = applyPublicProposalSignals(publicSignals); } catch { /* Use the local cache while offline. */ }
  try {
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const combined = [...local];
      for (const row of data) {
        if (
          !isDemoProposal(row) &&
          !combined.some((p) => p.id === row.id || p.code === row.code)
        ) {
          combined.push({
            id: row.id,
            code: row.code,
            clientId: row.client_id || row.lead_id || '',
            clientName: row.client_name || row.title || 'Cliente',
            title: row.title || `Proposta ${row.code}`,
            systemPowerKWp: Number(row.system_power_kwp || row.power_kwp || 0),
            systemType: row.system_type || 'On-Grid',
            totalValue: Number(row.total_value || row.value || 0),
            status: row.status || 'Pendente',
            modulesCount: row.modules_count,
            moduleModel: row.module_model,
            inverterModel: row.inverter_model,
            maintenancePlan: row.maintenance_plan || undefined,
            createdAt: row.created_at || new Date().toISOString(),
          });
        }
      }
      const finalClean = combined.filter((p) => !isDemoProposal(p));
      return mergePublicProposalSignals(finalClean, publicSignals);
    }
  } catch {
    // ignore
  }
  return local.filter((p) => !isDemoProposal(p));
}

export async function fetchProposalsForClient(
  clientId: string,
  clientName?: string
): Promise<ClientProposal[]> {
  const all = getStoredProposalsLocal();
  return all.filter((p) => {
    if (p.clientId === clientId) return true;
    if (clientName && p.clientName.trim().toLowerCase() === clientName.trim().toLowerCase()) {
      return true;
    }
    return false;
  });
}

export async function createQuickProposalForClient(
  data: Partial<ClientProposal> & { clientId: string; clientName: string }
): Promise<ClientProposal> {
  const all = getStoredProposalsLocal();
  const codeNum = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const newProposal: ClientProposal = {
    id: data.id || crypto.randomUUID(),
    code: data.code || data.documentSnapshot?.code || `PROP-${new Date().getFullYear()}-${codeNum}`,
    clientId: data.clientId,
    clientName: data.clientName,
    title: data.title || `Nova Proposta (${data.systemPowerKWp ?? 0} kWp)`,
    systemPowerKWp: Number(data.systemPowerKWp ?? 0),
    systemType: data.systemType || 'On-Grid',
    totalValue: Number(data.totalValue ?? 0),
    status: data.status || 'Pendente',
    modulesCount: data.modulesCount,
    moduleModel: data.moduleModel,
    inverterModel: data.inverterModel,
    estimatedMonthlyGenKWh: data.estimatedMonthlyGenKWh,
    estimatedMonthlySavings: data.estimatedMonthlySavings,
    batteryModel: data.batteryModel,
    batteryCount: data.batteryCount,
    maintenancePlan: data.maintenancePlan ?? data.documentSnapshot?.maintenancePlan,
    notes: data.notes,
    documentSnapshot: data.documentSnapshot,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
  await saveWorkspace();
  return newProposal;
}

/**
 * Busca todas as propostas vinculadas a um interessado (lead) ou cliente
 */
export async function fetchProposalsForTarget(
  targetType: 'lead' | 'client',
  targetId: string,
  targetName?: string
): Promise<ClientProposal[]> {
  const all = getStoredProposalsLocal();
  const normalizedName = (targetName || '').trim().toLowerCase();

  const matches: ClientProposal[] = all.filter((p) => {
    if (p.clientId === targetId || (p as any).leadId === targetId) return true;
    if (normalizedName && p.clientName && p.clientName.trim().toLowerCase() === normalizedName) {
      return true;
    }
    return false;
  });

  // Se for interessado (lead), verifica se existem propostas no Supabase
  if (targetType === 'lead') {
    try {
      const { fetchLeadProposals } = await import('./leads');
      const supabaseProposals = await fetchLeadProposals(targetId, { clientName: targetName });
      for (const sp of supabaseProposals) {
        if (!matches.some((m) => m.id === sp.id || m.code === sp.code)) {
          matches.push({
            id: sp.id,
            code: sp.code,
            clientId: targetId,
            clientName: targetName || 'Interessado',
            title: sp.title || `Proposta ${sp.code} (${sp.systemType || 'On-Grid'})`,
            systemPowerKWp: 0,
            systemType: (sp.systemType as any) || 'On-Grid',
            totalValue: sp.totalValue ?? 0,
            status: (sp.status as any) || 'Pendente',
            createdAt: sp.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // Se for cliente e não tiver nenhuma proposta, aproveita a lógica de fetchProposalsForClient
  if (targetType === 'client' && matches.length === 0) {
    return fetchProposalsForClient(targetId, targetName);
  }

  return matches;
}

/**
 * Cadastra uma proposta rápida para um interessado (lead) ou cliente
 */
export async function createQuickProposalForTarget(
  targetType: 'lead' | 'client',
  targetId: string,
  targetName: string,
  data?: Partial<ClientProposal>
): Promise<ClientProposal> {
  const all = getStoredProposalsLocal();
  const codeNum = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const newProposal: ClientProposal = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: data?.code || `PROP-${new Date().getFullYear()}-${codeNum}`,
    clientId: targetId,
    clientName: targetName,
    title: data?.title || `Proposta Comercial (${data?.systemPowerKWp ?? 0} kWp)`,
    systemPowerKWp: Number(data?.systemPowerKWp ?? 0),
    systemType: data?.systemType || 'On-Grid',
    totalValue: Number(data?.totalValue ?? 0),
    status: data?.status || 'Em negociação',
    modulesCount: data?.modulesCount ?? 0,
    moduleModel: data?.moduleModel || '',
    inverterModel: data?.inverterModel || '',
    maintenancePlan: data?.maintenancePlan,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
  await saveWorkspace();
  return newProposal;
}

/**
 * Atualiza o nome do cliente associado às propostas locais
 */
export function updateProposalsClientName(
  oldName: string,
  newName: string,
  clientId?: string
): void {
  const all = getStoredProposalsLocal();
  let changed = false;
  const updated = all.map((p) => {
    const matchId = clientId && p.clientId === clientId;
    const matchName =
      oldName &&
      p.clientName &&
      p.clientName.trim().toLowerCase() === oldName.trim().toLowerCase();
    if (matchId || matchName) {
      changed = true;
      return { ...p, clientName: newName };
    }
    return p;
  });
  if (changed) {
    saveStoredProposalsLocal(updated);
  }
}

export function getPublicProposalUrl(publicToken: string): string {
  return buildPublicProposalUrl(publicToken, import.meta.env.VITE_PUBLIC_APP_URL || undefined);
}

export function applyPublicProposalSignals(signals: PublicProposalSignal[]): ClientProposal[] {
  const local = getStoredProposalsLocal();
  const updated = mergePublicProposalSignals(local, signals);
  if (updated.some((proposal, index) => proposal !== local[index])) saveStoredProposalsLocal(updated);
  return updated;
}

export async function fetchProposalByCodeOrId(codeOrId: string): Promise<ClientProposal | null> {
  const normalized = (codeOrId || '').trim();
  if (!normalized) return null;

  const local = getStoredProposalsLocal();
  const match = local.find(
    (p) =>
      p.code?.toLowerCase() === normalized.toLowerCase() ||
      p.id?.toLowerCase() === normalized.toLowerCase()
  );
  if (match) return match;

  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .or(`code.eq.${normalized},id.eq.${normalized}`)
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        code: data.code,
        clientId: data.client_id || data.lead_id || '',
        clientName: data.client_name || data.title || 'Cliente',
        title: data.title || `Proposta ${data.code}`,
        systemPowerKWp: Number(data.system_power_kwp || data.power_kwp || 0),
        systemType: data.system_type || 'On-Grid',
        totalValue: Number(data.total_value || data.value || 0),
        status: data.status || 'Pendente',
        modulesCount: data.modules_count,
        moduleModel: data.module_model,
        inverterModel: data.inverter_model,
        maintenancePlan: data.maintenance_plan || undefined,
        createdAt: data.created_at || new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function updateProposalStatus(
  codeOrId: string,
  newStatus: ClientProposal['status'],
  extraDetails?: ProposalApprovalDetails
): Promise<ClientProposal | null> {
  const normalized = (codeOrId || '').trim().toLowerCase();
  if (!normalized) return null;

  const all = getStoredProposalsLocal();
  const index = all.findIndex(
    (p) => p.code?.toLowerCase() === normalized || p.id?.toLowerCase() === normalized
  );

  let updatedProposal: ClientProposal | null = null;
  if (index !== -1) {
    const current = all[index];
    updatedProposal = {
      ...current,
      status: newStatus,
      approvalDetails: {
        ...current.approvalDetails,
        ...extraDetails,
      },
      notes:
        extraDetails?.approvalNotes ||
        extraDetails?.refusalNotes ||
        current.notes,
    };
    all[index] = updatedProposal;
    saveStoredProposalsLocal(all);
  } else {
    // Se não existia no local, tenta buscar no supabase antes ou criar
    const found = await fetchProposalByCodeOrId(codeOrId);
    if (found) {
      updatedProposal = {
        ...found,
        status: newStatus,
        approvalDetails: {
          ...found.approvalDetails,
          ...extraDetails,
        },
      };
      saveStoredProposalsLocal([updatedProposal, ...all]);
    }
  }

  // Tenta sincronizar com Supabase se a tabela proposals estiver disponível
  try {
    const { supabase } = await import('../lib/supabase');
    await supabase
      .from('proposals')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`code.eq.${codeOrId},id.eq.${codeOrId}`);
  } catch {
    // ignore
  }

  return updatedProposal;
}


