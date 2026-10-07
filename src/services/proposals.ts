import { MaintenancePlanSelection, SolarProposal } from '../types';

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

const LEGACY_DEMO_CODES = new Set([
  'PROP-2026-084',
  'PROP-2026-089',
  'PROP-2026-083',
  'PROP-2026-095',
  'PROP-2026-082',
  'PROP-2026-091',
  'PROP-2026-081',
  'PROP-2026-092',
  'PROP-2026-098',
  'PROP-2026-075',
  'PROP-2026-088',
  'PROP-2026-456',
  'PROP-2026-351',
]);

const LEGACY_DEMO_NAMES = new Set([
  'maurício campos da hora',
  'mauricio campos da hora',
  'renan leal',
  'fazenda santa rita',
  'mercado bom preço ltda',
  'mercado bom preco ltda',
  'carlos eduardo ferreira',
  'residência carlos eduardo',
  'residencia carlos eduardo',
]);

const LEGACY_DEMO_IDS = new Set([
  'prop-1',
  'prop-1-b',
  'prop-2',
  'prop-2-b',
  'prop-3',
  'prop-3-b',
  'prop-4',
  'prop-4-b',
  'prop-4-c',
  'prop-5',
  'prop-5-ind',
  'prop-5-ind-2',
  'prop-6',
  'prop-7',
  'prop-8',
]);

export function isDemoProposal(p: { id?: string; code?: string; clientName?: string; client_name?: string }): boolean {
  if (!p) return false;
  if (p.id && LEGACY_DEMO_IDS.has(p.id)) return true;
  if (p.code && LEGACY_DEMO_CODES.has(p.code)) return true;
  const name = (p.clientName || p.client_name || '').trim().toLowerCase();
  if (name && LEGACY_DEMO_NAMES.has(name)) return true;
  return false;
}

export function getStoredProposalsLocal(): ClientProposal[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove permanentemente quaisquer propostas legadas de demonstração
      const cleaned = parsed.filter((p) => !isDemoProposal(p));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(cleaned));
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
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(PROPOSALS_UPDATED_EVENT, { detail: filtered }));
  } catch (err) {
    console.warn('Erro ao salvar propostas no localStorage:', err);
  }
}

export function deleteClientProposal(proposalId: string): ClientProposal[] {
  const all = getStoredProposalsLocal();
  const updated = all.filter((p) => p.id !== proposalId);
  saveStoredProposalsLocal(updated);
  try {
    import('../lib/supabase')
      .then(({ supabase }) => {
        supabase.from('proposals').delete().eq('id', proposalId).then();
        supabase.from('public_proposal_documents').delete().eq('source_id', proposalId).then();
      })
      .catch(() => {});
  } catch {}
  return updated;
}

export async function fetchAllClientProposals(): Promise<ClientProposal[]> {
  const local = getStoredProposalsLocal();
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
      return finalClean;
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
  const codeNum = Math.floor(100 + Math.random() * 899);
  const newProposal: ClientProposal = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: data.code || `PROP-2026-${codeNum}`,
    clientId: data.clientId,
    clientName: data.clientName,
    title: data.title || `Nova Proposta (${data.systemPowerKWp || 15} kWp)`,
    systemPowerKWp: Number(data.systemPowerKWp || 15),
    systemType: data.systemType || 'On-Grid',
    totalValue: Number(data.totalValue || 52000),
    status: data.status || 'Pendente',
    modulesCount: data.modulesCount,
    moduleModel: data.moduleModel,
    inverterModel: data.inverterModel,
    estimatedMonthlyGenKWh: data.estimatedMonthlyGenKWh,
    estimatedMonthlySavings: data.estimatedMonthlySavings,
    maintenancePlan: data.maintenancePlan,
    notes: data.notes,
    documentSnapshot: data.documentSnapshot,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
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
            systemPowerKWp: 12.0,
            systemType: (sp.systemType as any) || 'On-Grid',
            totalValue: sp.totalValue || 45000,
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
  const codeNum = Math.floor(100 + Math.random() * 899);
  const newProposal: ClientProposal = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: data?.code || `PROP-2026-${codeNum}`,
    clientId: targetId,
    clientName: targetName,
    title: data?.title || `Proposta Comercial (${data?.systemPowerKWp || 12} kWp)`,
    systemPowerKWp: Number(data?.systemPowerKWp || 12),
    systemType: data?.systemType || 'On-Grid',
    totalValue: Number(data?.totalValue || 42000),
    status: data?.status || 'Em negociação',
    modulesCount: data?.modulesCount || 20,
    moduleModel: data?.moduleModel || 'Canadian Solar 585W TOPCon',
    inverterModel: data?.inverterModel || 'Inversor Deye 12kW',
    maintenancePlan: data?.maintenancePlan,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
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

export function getPublicProposalUrl(codeOrId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}?proposta=${encodeURIComponent(codeOrId)}`;
}

export function clientProposalToSolarProposal(
  p: ClientProposal,
  clientExtra?: { document?: string; street?: string; addressNumber?: string; city?: string; state?: string; concessionaria?: string }
): SolarProposal {
  return {
    id: p.id,
    code: p.code,
    clientName: p.clientName,
    clientDocument: clientExtra?.document,
    clientAddress: [clientExtra?.street, clientExtra?.addressNumber].filter(Boolean).join(', '),
    clientCity: clientExtra?.city || 'Campinas',
    clientState: clientExtra?.state || 'SP',
    concessionaria: clientExtra?.concessionaria || 'CPFL Paulista',
    monthlyConsumptionKWh: p.estimatedMonthlyGenKWh || 1200,
    systemPowerKWp: p.systemPowerKWp,
    systemType: p.systemType === 'Híbrido' ? 'Híbrido' : 'On-Grid',
    estimatedMonthlyGenKWh: p.estimatedMonthlyGenKWh || Math.round(p.systemPowerKWp * 120),
    modulesCount: p.modulesCount || Math.ceil((p.systemPowerKWp * 1000) / 585),
    moduleModel: p.moduleModel || 'Canadian Solar 585W TOPCon Bi-facial',
    inverterModel: p.inverterModel || 'Inversor Deye Trifásico',
    batteryModel: p.batteryModel,
    batteryCount: p.batteryCount,
    totalValue: p.totalValue,
    estimatedMonthlySavings: p.estimatedMonthlySavings || Math.round(p.totalValue * 0.025),
    paybackYears:
      p.estimatedMonthlySavings && p.estimatedMonthlySavings > 0
        ? p.totalValue / (p.estimatedMonthlySavings * 12)
        : 0,
    ...p.documentSnapshot,
    status: p.status,
    maintenancePlan: p.maintenancePlan,
    createdAt: p.createdAt,
  };
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


