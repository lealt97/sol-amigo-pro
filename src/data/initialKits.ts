import { SolarKit, SolarSystemType } from '../types';

export const KITS_STORAGE_KEY = 'solarmarket_kits_catalog_v1';

// Média de Horas de Sol Pleno (HSP - kWh/m²/dia) por Unidade Federativa no Brasil (Fonte: CRESESB / INPE)
export const BRAZIL_STATE_HSP: Record<string, number> = {
  SP: 4.95,
  RJ: 5.05,
  MG: 5.25,
  ES: 4.90,
  PR: 4.30,
  SC: 4.20,
  RS: 4.25,
  BA: 5.65,
  PE: 5.55,
  CE: 5.75,
  RN: 5.80,
  PB: 5.60,
  AL: 5.40,
  SE: 5.45,
  PI: 5.65,
  MA: 5.20,
  GO: 5.35,
  MT: 5.25,
  MS: 5.15,
  DF: 5.30,
  PA: 4.75,
  AM: 4.50,
  RO: 4.65,
  AC: 4.60,
  TO: 5.30,
  RR: 4.90,
  AP: 4.70,
};

export const INITIAL_SOLAR_KITS: SolarKit[] = [];

const LEGACY_MOCK_KIT_IDS = new Set([
  'kit-1',
  'kit-2',
  'kit-3',
  'kit-4',
  'kit-5',
  'kit-6',
  'kit-7',
  'kit-8',
  'kit-9',
  'kit-10',
  'kit-11',
  'kit-12',
]);

export function getStoredKits(): SolarKit[] {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(KITS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const userKits = parsed
            .filter(
              (k): k is SolarKit =>
                Boolean(k && typeof k === 'object' && !LEGACY_MOCK_KIT_IDS.has(k.id))
            )
            .map((k, idx) => {
              const kwp = Number(k.powerKWp) || Number(k.maxPowerKWp) || 5.0;
              return {
                id: k.id || `kit-custom-${idx}`,
                name: k.name || `Kit Solar ${kwp} kWp`,
                sku: k.sku || `KIT-${idx + 1}`,
                systemType: (k.systemType === 'Híbrido' ? 'Híbrido' : 'On-Grid') as SolarSystemType,
                minPowerKWp: Number(k.minPowerKWp) || Number((kwp * 0.9).toFixed(2)),
                maxPowerKWp: Number(k.maxPowerKWp) || Number((kwp * 1.1).toFixed(2)),
                powerKWp: kwp,
                moduleModel: k.moduleModel || '',
                moduleCount: Number(k.moduleCount) || 10,
                modulePowerW: Number(k.modulePowerW) || 550,
                inverterModel: k.inverterModel || '',
                inverterPowerKW: Number(k.inverterPowerKW) || Math.max(3, Math.ceil(kwp)),
                batteryModel: k.batteryModel,
                batteryCapacityKWh: k.batteryCapacityKWh,
                batteryCount: k.batteryCount,
                structureType: k.structureType || 'Telhado Cerâmico / Fibrocimento',
                installationCost: Number(k.installationCost) || 0,
                engineeringCost: Number(k.engineeringCost) || 0,
                utilityFee: Number(k.utilityFee) || 0,
                freightCost: Number(k.freightCost) || 0,
                otherCosts: Number(k.otherCosts) || 0,
                taxesPercent: Number(k.taxesPercent) || 4.5,
                commissionPercent: Number(k.commissionPercent) || 5.0,
                targetMarginPercent: Number(k.targetMarginPercent) || 22.0,
                warrantyTerms: k.warrantyTerms || '',
                notes: k.notes || '',
                suggestedPrice: Number(k.suggestedPrice) || 0,
                equipmentCost: Number(k.equipmentCost) || 0,
                active: k.active !== false,
                items: Array.isArray(k.items) ? k.items : [],
              };
            });
          if (userKits.length !== parsed.length) {
            window.localStorage.setItem(KITS_STORAGE_KEY, JSON.stringify(userKits));
          }
          return userKits;
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar kits do armazenamento:', err);
  }
  return [];
}

export const KITS_UPDATED_EVENT = 'solar_kits_updated';

export function saveStoredKits(kits: SolarKit[]): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(KITS_STORAGE_KEY, JSON.stringify(kits));
      window.dispatchEvent(new CustomEvent(KITS_UPDATED_EVENT, { detail: kits }));
    }
  } catch (err) {
    console.error('Erro ao salvar catálogo de kits:', err);
  }
}

export function addCustomKit(newKitData: Partial<SolarKit> & { name: string; systemType: SolarSystemType }): SolarKit {
  const kits = getStoredKits();
  const kwp = newKitData.powerKWp || newKitData.maxPowerKWp || 5.0;
  const modW = newKitData.modulePowerW || 550;
  const modCount = newKitData.moduleCount || Math.ceil((kwp * 1000) / modW);

  const fullKit: SolarKit = {
    id: `kit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: newKitData.name.trim(),
    sku: newKitData.sku || `KIT-CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
    systemType: newKitData.systemType,
    minPowerKWp: newKitData.minPowerKWp || kwp * 0.9,
    maxPowerKWp: newKitData.maxPowerKWp || kwp * 1.1,
    powerKWp: Number(kwp.toFixed(2)),
    moduleModel: newKitData.moduleModel || `Módulo Solar ${modW}W Monocristalino`,
    moduleCount: modCount,
    modulePowerW: modW,
    inverterModel: newKitData.inverterModel || `Inversor Solar ${Math.max(3, Math.ceil(kwp))}kW`,
    inverterPowerKW: newKitData.inverterPowerKW || Math.max(3, Math.ceil(kwp)),
    batteryModel: newKitData.systemType === 'Híbrido' ? (newKitData.batteryModel || 'Bateria Lítio 5.12 kWh') : undefined,
    batteryCapacityKWh: newKitData.systemType === 'Híbrido' ? (newKitData.batteryCapacityKWh || 5.12) : undefined,
    batteryCount: newKitData.systemType === 'Híbrido' ? (newKitData.batteryCount || 1) : undefined,
    structureType: newKitData.structureType || 'Telhado Cerâmico / Fibrocimento',
    equipmentCost: newKitData.equipmentCost || Math.round(kwp * 2200),
    installationCost: newKitData.installationCost || Math.round(kwp * 500),
    engineeringCost: newKitData.engineeringCost || 800,
    utilityFee: newKitData.utilityFee || 350,
    freightCost: newKitData.freightCost || 500,
    otherCosts: newKitData.otherCosts || 300,
    taxesPercent: newKitData.taxesPercent || 4.5,
    commissionPercent: newKitData.commissionPercent || 5.0,
    targetMarginPercent: newKitData.targetMarginPercent || 22.0,
    suggestedPrice: newKitData.suggestedPrice || Math.round(kwp * 3100),
    warrantyTerms: newKitData.warrantyTerms || 'Módulos 12 anos / Inversor 10 anos',
    notes: newKitData.notes || 'Kit cadastrado pelo usuário no catálogo.',
    active: true,
    items: [],
  };

  const updated = [fullKit, ...kits];
  saveStoredKits(updated);
  return fullKit;
}

export function updateCustomKit(updatedKit: SolarKit): SolarKit {
  const kits = getStoredKits();
  const index = kits.findIndex((k) => k.id === updatedKit.id);
  if (index >= 0) {
    kits[index] = { ...kits[index], ...updatedKit };
  } else {
    kits.unshift(updatedKit);
  }
  saveStoredKits(kits);
  return updatedKit;
}

export function deleteCustomKit(kitId: string): void {
  const kits = getStoredKits();
  const filtered = kits.filter((k) => k.id !== kitId);
  saveStoredKits(filtered);
}

export function restoreDefaultKits(): SolarKit[] {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(KITS_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(KITS_UPDATED_EVENT, { detail: [] }));
    }
  } catch (err) {
    console.warn(err);
  }
  return [];
}
