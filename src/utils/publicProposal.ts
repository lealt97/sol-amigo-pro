import type { PdfSettingsConfig, ProposalEquipmentOutput, SolarProposal, ThemeConfig } from '../types';
import type { PublicProposalResponse } from '../../supabase/functions/_shared/publicProposalResponse';
export type { PublicProposalResponse } from '../../supabase/functions/_shared/publicProposalResponse';

export interface PublicProposalDocument {
  proposal: SolarProposal;
  pdfSettings: PdfSettingsConfig;
  theme: ThemeConfig;
  response?: PublicProposalResponse | null;
}


export const PUBLIC_PROPOSAL_TOKEN = /^[a-f0-9]{64}$/;

export function createPublicProposalToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPublicProposalToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function buildPublicProposalUrl(token: string, appUrl = 'https://lealt97.github.io/sol-amigo-pro/'): string {
  if (!PUBLIC_PROPOSAL_TOKEN.test(token)) throw new Error('Identificador do link inválido.');
  const url = new URL(appUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Endereço público inválido.');
  url.search = '';
  url.hash = '';
  url.searchParams.set('proposta', token);
  return url.toString();
}

// Somente dados destinados ao cliente. Custos internos, margens e dados do CRM
// não fazem parte da cópia pública, mesmo se existirem no dimensionamento.
export function createPublicProposalDocument(proposal: SolarProposal, pdfSettings: PdfSettingsConfig, theme: ThemeConfig): PublicProposalDocument {
  const keys = [
    'id', 'code', 'clientName', 'clientDocument', 'clientAddress', 'clientEmail', 'clientPhone',
    'clientCity', 'clientState', 'propertyType', 'concessionaria', 'monthlyConsumptionKWh',
    'systemPowerKWp', 'systemType', 'estimatedMonthlyGenKWh', 'modulesCount', 'moduleModel',
    'inverterModel', 'batteryModel', 'batteryCount', 'batteryCapacityKWh', 'totalValue',
    'estimatedMonthlySavings', 'paybackYears', 'status', 'createdAt', 'validUntil',
    'co2SavedTonsYear', 'treesEquivalent', 'co2AvoidedTons', 'treesPlanted', 'hsp', 'performanceRatio',
  ] as const;
  const publicProposal = Object.fromEntries(keys.map(key => [key, proposal[key]])) as unknown as SolarProposal;
  const company = proposal.companyInfo;
  if (company) publicProposal.companyInfo = { name: company.name, representative: company.representative, document: company.document, email: company.email, phone: company.phone, description: company.description };
  const technical = proposal.technicalOutput;
  publicProposal.technicalOutput = { connectionType: technical?.connectionType, targetCoveragePercent: technical?.targetCoveragePercent, modulePowerW: technical?.modulePowerW, energyTariff: technical?.energyTariff, backupAutonomyHours: technical?.backupAutonomyHours, estimatedAreaM2: technical?.estimatedAreaM2 ?? proposal.sizing?.estimatedAreaM2, inverterCount: technical?.inverterCount ?? proposal.sizing?.inverterCount };
  const equipment = proposal.equipmentOutput?.length ? proposal.equipmentOutput : proposal.pricing?.equipmentItems;
  if (equipment?.length) publicProposal.equipmentOutput = equipment.map(item => {
    const output = item as ProposalEquipmentOutput;
    return { id: output.id, description: output.description, category: output.category, quantity: output.quantity, brand: output.brand, model: output.model, warrantyYears: output.warrantyYears, powerW: output.powerW, capacityKWh: output.capacityKWh };
  });
  const terms = proposal.commercialConditions;
  if (terms) publicProposal.commercialConditions = { paymentMethods: terms.paymentMethods, cashPaymentTerms: terms.cashPaymentTerms, installmentPaymentTerms: terms.installmentPaymentTerms, warrantyTerms: terms.warrantyTerms, deliveryTimeframe: terms.deliveryTimeframe, notes: terms.notes };
  const plan = proposal.maintenancePlan;
  if (plan?.enabled) publicProposal.maintenancePlan = { enabled: true, type: plan.type, name: plan.name, frequencyInterval: plan.frequencyInterval, frequencyUnit: plan.frequencyUnit, frequencyMonths: plan.frequencyMonths, visitsPerYear: plan.visitsPerYear, pricingMode: plan.pricingMode, pricePerVisit: plan.pricePerVisit, annualPrice: plan.annualPrice, includedServices: [...plan.includedServices], notes: plan.notes, internalCostPerVisit: 0 };
  return JSON.parse(JSON.stringify({ proposal: publicProposal, pdfSettings, theme }));
}
