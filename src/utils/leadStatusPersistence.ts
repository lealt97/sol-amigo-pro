import { LeadStage } from '../types';

const STORAGE_KEY = 'solamigo_lead_status_overrides';
export const LEAD_STATUS_CHANGED_EVENT = 'solamigo:lead-status-changed';

function getOverridesMap(): Record<string, LeadStage> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverridesMap(map: Record<string, LeadStage>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignora potenciais restrições de cota no localStorage
  }
}

export function getStoredLeadStatus(leadId: string): LeadStage | undefined {
  const map = getOverridesMap();
  return map[leadId];
}

export function setStoredLeadStatus(leadId: string, status: LeadStage): void {
  const map = getOverridesMap();
  map[leadId] = status;
  saveOverridesMap(map);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LEAD_STATUS_CHANGED_EVENT, {
        detail: { leadId, status },
      })
    );
  }
}

export function removeStoredLeadStatus(leadId: string): void {
  const map = getOverridesMap();
  if (leadId in map) {
    delete map[leadId];
    saveOverridesMap(map);
  }
}

export function isLegacyStatusTransitionError(error: unknown): boolean {
  if (!error) return false;
  const errObj = typeof error === 'object' ? (error as Record<string, any>) : {};
  const code = String(errObj.code || '');
  const message = String(errObj.message || errObj.details || error || '');

  if (code === '22023' || code === '23514' || code === '42501' || code === 'P0001') return true;
  if (
    message.includes('Transição inválida') ||
    message.includes('Transi') ||
    message.includes('Conclua a qualificação') ||
    message.includes('qualificação') ||
    message.includes('Dimensionamento concluído') ||
    message.includes('A proposta precisa estar aprovada') ||
    message.includes('status') ||
    message.includes('leads_status_check') ||
    message.includes('enforce_lead_status_transition')
  ) {
    return true;
  }
  return false;
}
