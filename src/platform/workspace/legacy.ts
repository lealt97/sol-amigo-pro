export const LEGACY_DATASETS = [
  ['solamigo.clients.v2', 'Clientes'],
  ['solamigo.pdf', 'Personalização do PDF'],
  ['solamigo.theme', 'Tema da plataforma'],
  ['solamigo.proposals.v1', 'Propostas e dimensionamentos'],
  ['sol_amigo_manual_leads_cache', 'Leads manuais'],
  ['solamigo.calendar-events.v1', 'Agenda'],
  ['solarmarket_kits_catalog_v1', 'Kits'],
  ['solamigo.maintenance-plans.v1', 'Planos de manutenção'],
  ['solamigo_lead_notes_overrides', 'Anotações'],
  ['solamigo_lead_status_overrides', 'Status de leads'],
  ['solamigo.deleted-clients.v1', 'Clientes excluídos'],
] as const;
export function inspectLegacy(storage: Pick<Storage, 'getItem'>, owner: string) {
  const candidates: [string, string][] = [...LEGACY_DATASETS.map(([key, label]) => [key, label] as [string, string]), [`solamigo.pdf-cover-models.v1.${owner}`, 'Modelos de capa desta conta']];
  return candidates.flatMap(([key, label]) => {
    const value = storage.getItem(key);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') return [];
      return [{ key, label, count: Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length, value }];
    } catch { return []; }
  });
}

export function canImportInto(value: string | null): boolean {
  if (value === null) return true;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length === 0 : Boolean(parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0);
  } catch { return false; }
}
