import type { SolarProposal } from '../../types';
import type { ClientProposal } from '../../services/proposals';

export function clientProposalToSolarProposal(
  p: ClientProposal,
  clientExtra?: { document?: string; street?: string; addressNumber?: string; city?: string; state?: string; concessionaria?: string; email?: string; phone?: string }
): SolarProposal {
  return {
    clientName: p.clientName,
    clientEmail: clientExtra?.email,
    clientPhone: clientExtra?.phone,
    clientDocument: clientExtra?.document,
    clientAddress: [clientExtra?.street, clientExtra?.addressNumber].filter(Boolean).join(', '),
    clientCity: clientExtra?.city || '',
    clientState: clientExtra?.state || '',
    concessionaria: clientExtra?.concessionaria || '',
    monthlyConsumptionKWh: p.documentSnapshot?.monthlyConsumptionKWh ?? 0,
    systemPowerKWp: p.systemPowerKWp,
    systemType: p.systemType,
    estimatedMonthlyGenKWh: p.estimatedMonthlyGenKWh ?? 0,
    modulesCount: p.modulesCount ?? 0,
    moduleModel: p.moduleModel || '',
    inverterModel: p.inverterModel || '',
    batteryModel: p.batteryModel,
    batteryCount: p.batteryCount,
    totalValue: p.totalValue,
    estimatedMonthlySavings: p.estimatedMonthlySavings ?? 0,
    paybackYears:
      p.estimatedMonthlySavings && p.estimatedMonthlySavings > 0
        ? p.totalValue / (p.estimatedMonthlySavings * 12)
        : 0,
    ...p.documentSnapshot,
    id: p.id,
    code: p.code,
    status: p.status,
    maintenancePlan: p.maintenancePlan ?? p.documentSnapshot?.maintenancePlan,
    createdAt: p.createdAt,
  };
}


export function assertPublishableProposal(proposal: SolarProposal): void {
  if (!proposal.clientName?.trim()) throw new Error('Preencha o titular antes de publicar a proposta.');
  const required = { 'potência instalada': proposal.systemPowerKWp, investimento: proposal.totalValue, consumo: proposal.monthlyConsumptionKWh, módulos: proposal.modulesCount };
  for (const [label, value] of Object.entries(required)) if (!Number.isFinite(value) || value <= 0) throw new Error(`Complete ${label} no dimensionamento antes de publicar a proposta.`);
  if (!proposal.moduleModel?.trim() || !proposal.inverterModel?.trim()) throw new Error('Informe os equipamentos reais antes de publicar a proposta.');
}
