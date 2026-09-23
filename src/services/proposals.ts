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
  notes?: string;
  createdAt: string;
}

export const PROPOSALS_STORAGE_KEY = 'solamigo.proposals.v1';
export const PROPOSALS_UPDATED_EVENT = 'solamigo:proposals-updated';

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
  'prop-5-ind',
  'prop-5-ind-2',
]);

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
      const cleaned = parsed.filter(
        (p) => !LEGACY_DEMO_IDS.has(p?.id) && !LEGACY_DEMO_CODES.has(p?.code)
      );
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
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
    window.dispatchEvent(new CustomEvent(PROPOSALS_UPDATED_EVENT, { detail: proposals }));
  } catch (err) {
    console.warn('Erro ao salvar propostas no localStorage:', err);
  }
}

export function deleteClientProposal(proposalId: string): ClientProposal[] {
  const all = getStoredProposalsLocal();
  const updated = all.filter((p) => p.id !== proposalId);
  saveStoredProposalsLocal(updated);
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
          !LEGACY_DEMO_CODES.has(row.code) &&
          !LEGACY_DEMO_IDS.has(row.id) &&
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
            createdAt: row.created_at || new Date().toISOString(),
          });
        }
      }
      return combined;
    }
  } catch {
    // ignore
  }
  return local;
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
    notes: data.notes,
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
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
  return newProposal;
}

