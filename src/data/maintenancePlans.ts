import { MaintenancePlanSelection } from '../types';
import {
  estimateMaintenanceVisitsPerYear,
  frequencyToLegacyMonths,
  getMaintenanceAnnualSalePrice,
} from '../utils/maintenance';

export const MAINTENANCE_PLANS_STORAGE_KEY = 'solamigo.maintenance-plans.v1';
export const MAINTENANCE_PLANS_UPDATED_EVENT = 'solamigo:maintenance-plans-updated';

const DEFAULT_SERVICES = [
  'Limpeza técnica dos módulos',
  'Inspeção visual dos módulos',
  'Verificação de estrutura e fixadores',
  'Inspeção de cabos e conectores',
  'Verificação visual do inversor',
  'Relatório da visita',
];

export const DEFAULT_MAINTENANCE_PLANS: MaintenancePlanSelection[] = [
  {
    id: 'maintenance-semiannual',
    code: 'MAN-SEM-01',
    enabled: true,
    active: true,
    type: 'semiannual',
    planType: 'Preventiva',
    name: 'Preventiva Semestral',
    frequencyInterval: 6,
    frequencyUnit: 'months',
    frequencyMonths: 6,
    visitsPerYear: 2,
    internalCostPerVisit: 180,
    pricingMode: 'annual_package',
    annualPrice: 900,
    includedServices: DEFAULT_SERVICES,
    notes: 'Plano preventivo com duas visitas anuais.',
  },
  {
    id: 'maintenance-annual',
    code: 'MAN-ANU-01',
    enabled: true,
    active: true,
    type: 'annual',
    planType: 'Preventiva',
    name: 'Preventiva Anual',
    frequencyInterval: 12,
    frequencyUnit: 'months',
    frequencyMonths: 12,
    visitsPerYear: 1,
    internalCostPerVisit: 220,
    pricingMode: 'annual_package',
    annualPrice: 550,
    includedServices: DEFAULT_SERVICES,
    notes: 'Plano preventivo com uma visita anual.',
  },
  {
    id: 'maintenance-quarterly',
    code: 'MAN-TRI-01',
    enabled: true,
    active: true,
    type: 'custom',
    planType: 'Completa',
    name: 'O&M Completa Trimestral',
    frequencyInterval: 3,
    frequencyUnit: 'months',
    frequencyMonths: 3,
    visitsPerYear: 4,
    internalCostPerVisit: 160,
    pricingMode: 'annual_package',
    annualPrice: 1600,
    includedServices: [
      ...DEFAULT_SERVICES,
      'Inspeção termográfica dos módulos',
      'Reaperto elétrico de conexões e quadros',
    ],
    notes: 'Plano completo de alta performance com quatro visitas anuais.',
  },
];

const normalizePlan = (plan: Partial<MaintenancePlanSelection>, index = 0): MaintenancePlanSelection => {
  const frequencyUnit = plan.frequencyUnit || 'months';
  const legacyMonths = Math.max(1, Number(plan.frequencyMonths) || 12);
  const frequencyInterval = Math.max(
    1,
    Math.floor(Number(plan.frequencyInterval) || (frequencyUnit === 'months' ? legacyMonths : 1))
  );
  const visitsPerYear = estimateMaintenanceVisitsPerYear(frequencyInterval, frequencyUnit);
  const pricingMode = plan.pricingMode || 'annual_package';
  const pricePerVisit = Math.max(0, Number(plan.pricePerVisit) || 0);
  const baseAnnualPrice = Math.max(0, Number(plan.annualPrice) || 0);

  const normalized: MaintenancePlanSelection = {
    id: plan.id || `maintenance-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    code: plan.code?.trim() || `MAN-${String(index + 1).padStart(3, '0')}`,
    enabled: true,
    active: plan.active !== false,
    type: plan.type || 'custom',
    planType: plan.planType || 'Personalizada',
    name: plan.name?.trim() || 'Plano de Manutenção',
    frequencyInterval,
    frequencyUnit,
    frequencyMonths: frequencyToLegacyMonths(frequencyInterval, frequencyUnit),
    visitsPerYear,
    internalCostPerVisit: Math.max(0, Number(plan.internalCostPerVisit) || 0),
    pricingMode,
    pricePerVisit,
    annualPrice: baseAnnualPrice,
    includedServices: Array.isArray(plan.includedServices) ? plan.includedServices.filter(Boolean) : [],
    notes: plan.notes?.trim() || '',
  };

  normalized.annualPrice = getMaintenanceAnnualSalePrice(normalized);
  return normalized;
};

export function getStoredMaintenancePlans(): MaintenancePlanSelection[] {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_MAINTENANCE_PLANS;
  try {
    const raw = localStorage.getItem(MAINTENANCE_PLANS_STORAGE_KEY);
    if (!raw) {
      saveStoredMaintenancePlans(DEFAULT_MAINTENANCE_PLANS);
      return DEFAULT_MAINTENANCE_PLANS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MAINTENANCE_PLANS;
    if (parsed.length === 2 && parsed.every((p) => p.id === 'maintenance-semiannual' || p.id === 'maintenance-annual')) {
      saveStoredMaintenancePlans(DEFAULT_MAINTENANCE_PLANS);
      return DEFAULT_MAINTENANCE_PLANS;
    }
    return parsed.map(normalizePlan);
  } catch (err) {
    console.warn('Erro ao carregar planos de manutenção:', err);
    return DEFAULT_MAINTENANCE_PLANS;
  }
}

export function saveStoredMaintenancePlans(plans: MaintenancePlanSelection[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const normalized = plans.map(normalizePlan);
  localStorage.setItem(MAINTENANCE_PLANS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(MAINTENANCE_PLANS_UPDATED_EVENT, { detail: normalized }));
}

export function addMaintenancePlan(plan: Partial<MaintenancePlanSelection> & { name: string }): MaintenancePlanSelection {
  const current = getStoredMaintenancePlans();
  const created = normalizePlan({ ...plan, id: plan.id || `maintenance-${Date.now()}` }, current.length);
  saveStoredMaintenancePlans([created, ...current]);
  return created;
}

export function updateMaintenancePlan(plan: MaintenancePlanSelection): MaintenancePlanSelection {
  const current = getStoredMaintenancePlans();
  const next = current.some((item) => item.id === plan.id)
    ? current.map((item) => item.id === plan.id ? normalizePlan(plan) : item)
    : [normalizePlan(plan), ...current];
  saveStoredMaintenancePlans(next);
  return normalizePlan(plan);
}

export function deleteMaintenancePlan(planId: string): void {
  saveStoredMaintenancePlans(getStoredMaintenancePlans().filter((item) => item.id !== planId));
}

export function restoreDefaultMaintenancePlans(): MaintenancePlanSelection[] {
  saveStoredMaintenancePlans(DEFAULT_MAINTENANCE_PLANS);
  return DEFAULT_MAINTENANCE_PLANS;
}
