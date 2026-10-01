import {
  MaintenanceFrequencyUnit,
  MaintenancePlanSelection,
  MaintenancePricingMode,
} from '../types';

export interface MaintenanceFrequency {
  interval: number;
  unit: MaintenanceFrequencyUnit;
}

const UNIT_LABELS: Record<MaintenanceFrequencyUnit, { singular: string; plural: string }> = {
  days: { singular: 'dia', plural: 'dias' },
  weeks: { singular: 'semana', plural: 'semanas' },
  months: { singular: 'mês', plural: 'meses' },
};

export function getMaintenanceFrequencyMax(unit: MaintenanceFrequencyUnit): number {
  if (unit === 'days') return 365;
  if (unit === 'weeks') return 52;
  return 36;
}

export function normalizeMaintenanceInterval(
  intervalInput: number,
  unit: MaintenanceFrequencyUnit
): number {
  return Math.max(1, Math.min(getMaintenanceFrequencyMax(unit), Math.floor(Number(intervalInput) || 1)));
}

export function getMaintenanceFrequency(
  plan: Pick<MaintenancePlanSelection, 'frequencyInterval' | 'frequencyUnit' | 'frequencyMonths'>
): MaintenanceFrequency {
  const unit = plan.frequencyUnit || 'months';
  const fallbackMonths = Math.max(1, Number(plan.frequencyMonths) || 1);
  const interval = normalizeMaintenanceInterval(
    Number(plan.frequencyInterval) || (unit === 'months' ? fallbackMonths : 1),
    unit
  );
  return { interval, unit };
}

export function estimateMaintenanceVisitsPerYear(
  intervalInput: number,
  unit: MaintenanceFrequencyUnit
): number {
  const interval = normalizeMaintenanceInterval(intervalInput, unit);
  if (unit === 'days') return Math.max(1, Math.round(365 / interval));
  if (unit === 'weeks') return Math.max(1, Math.round(52 / interval));
  return Math.max(1, Math.round(12 / interval));
}

export function frequencyToLegacyMonths(intervalInput: number, unit: MaintenanceFrequencyUnit): number {
  const interval = normalizeMaintenanceInterval(intervalInput, unit);
  if (unit === 'months') return Math.max(1, Math.round(interval));
  if (unit === 'weeks') return Math.max(1, Math.round((interval * 7) / 30.4375));
  return Math.max(1, Math.round(interval / 30.4375));
}

export function formatMaintenanceFrequency(
  planOrFrequency:
    | Pick<MaintenancePlanSelection, 'frequencyInterval' | 'frequencyUnit' | 'frequencyMonths'>
    | MaintenanceFrequency
): string {
  const frequency = 'unit' in planOrFrequency
    ? planOrFrequency
    : getMaintenanceFrequency(planOrFrequency);
  const label = UNIT_LABELS[frequency.unit];
  return `a cada ${frequency.interval} ${frequency.interval === 1 ? label.singular : label.plural}`;
}

export function getMaintenancePricingMode(
  plan: Pick<MaintenancePlanSelection, 'pricingMode'>
): MaintenancePricingMode {
  return plan.pricingMode || 'annual_package';
}

export function getMaintenanceAnnualSalePrice(
  plan: Pick<MaintenancePlanSelection, 'pricingMode' | 'pricePerVisit' | 'annualPrice' | 'visitsPerYear'>
): number {
  if (getMaintenancePricingMode(plan) === 'per_visit') {
    return Math.max(0, Number(plan.pricePerVisit) || 0) * Math.max(1, Number(plan.visitsPerYear) || 1);
  }
  return Math.max(0, Number(plan.annualPrice) || 0);
}

export function formatMaintenancePriceSummary(
  plan: Pick<MaintenancePlanSelection, 'pricingMode' | 'pricePerVisit' | 'annualPrice' | 'visitsPerYear'>
): string {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  if (getMaintenancePricingMode(plan) === 'per_visit') {
    return `${currency.format(Math.max(0, Number(plan.pricePerVisit) || 0))}/visita · ${currency.format(getMaintenanceAnnualSalePrice(plan))}/ano estimado`;
  }
  return `${currency.format(getMaintenanceAnnualSalePrice(plan))}/ano`;
}
