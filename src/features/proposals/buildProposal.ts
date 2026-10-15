import type { Client, SolarProposal, SolarConnectionType, SolarKit, OpportunityKitCosts, MaintenancePlanSelection } from '../../types';
export interface ProposalTargetSelection {
  id: string;
  name: string;
  type: 'client' | 'lead';
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  document?: string;
  street?: string;
  addressNumber?: string;
  propertyType?: string;
  concessionaria?: string;
  monthlyConsumptionKWh?: number;
  sourceLeadId?: string;
  clientId?: string;
}

export interface WizardProposalInput {
  selectedTarget: ProposalTargetSelection;
  companyInfo?: SolarProposal['companyInfo']; clientsList: Client[];
  connectionType: SolarConnectionType; targetCoveragePercent: number; modulePowerW: number; energyTariff: number;
  backupAutonomyHours: number; selectedKit: SolarKit | null; moduleModel: string; inverterModel: string;
  batteryModel: string; batteryCount: number; batteryCapacityKWh: number; concessionaria: string;
  hsp: number; performanceRatio: number; commercialPricing: OpportunityKitCosts | null;
  maintenancePlan: MaintenancePlanSelection; paymentMethods: string; cashPaymentTerms: string; installmentPaymentTerms: string;
  deliveryTimeframe: string; warrantyTerms: string; commercialNotes: string;
  systemType: 'On-Grid' | 'Híbrido'; effectiveAverageKWh: number; installedPowerKWp: number; modulesCount: number; estimatedMonthlyGenKWh: number;
}
export function buildWizardProposal(input: WizardProposalInput): SolarProposal {
  const { selectedTarget, companyInfo, clientsList, connectionType, targetCoveragePercent, modulePowerW, energyTariff, backupAutonomyHours, selectedKit, moduleModel, inverterModel, batteryModel, batteryCount, batteryCapacityKWh, concessionaria, hsp, performanceRatio, commercialPricing, maintenancePlan, paymentMethods, cashPaymentTerms, installmentPaymentTerms, deliveryTimeframe, warrantyTerms, commercialNotes, systemType, effectiveAverageKWh, installedPowerKWp, modulesCount, estimatedMonthlyGenKWh } = input;
  for (const [label, value] of Object.entries({ Consumo: effectiveAverageKWh, Potência: installedPowerKWp, Módulos: modulesCount, HSP: hsp, Rendimento: performanceRatio, Tarifa: energyTariff })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label}: informe um valor válido maior que zero.`);
  }
  if (!Number.isInteger(modulesCount) || hsp > 12 || performanceRatio > 100 || targetCoveragePercent <= 0 || targetCoveragePercent > 150) throw new Error('Revise módulos, HSP, rendimento e cobertura do dimensionamento.');
  if (Math.abs(installedPowerKWp - modulesCount * modulePowerW / 1000) > 0.02) throw new Error('A potência instalada deve corresponder à quantidade e potência dos módulos.');
  if (!selectedTarget?.name?.trim()) throw new Error('Selecione o titular da proposta.');
  if (!moduleModel.trim() || !inverterModel.trim()) throw new Error('Informe os modelos reais do módulo e do inversor.');
  if (!commercialPricing || !Number.isFinite(commercialPricing.finalSalePrice) || commercialPricing.finalSalePrice <= 0) throw new Error('Conclua a precificação antes de gerar a proposta.');
  if (commercialPricing.validationError) throw new Error(commercialPricing.validationError);
  if (systemType === 'Híbrido' && (!batteryModel.trim() || batteryCount < 1 || batteryCapacityKWh <= 0)) throw new Error('Informe o banco de baterias do sistema híbrido.');
    const identity = crypto.randomUUID();
    const propCode = `PROP-${new Date().getFullYear()}-${identity.replaceAll('-', '').slice(0,12).toUpperCase()}`;
    const consKWh = effectiveAverageKWh;

    const isHybrid = systemType === 'Híbrido';
    const finalKWp = Number(installedPowerKWp.toFixed(2));
    const finalModules = modulesCount;
    const finalValue = commercialPricing.finalSalePrice;

    const finalMonthlyGen = estimatedMonthlyGenKWh > 0
      ? estimatedMonthlyGenKWh
      : Math.round(finalKWp * hsp * 30 * (performanceRatio / 100));

    const monthlySavings = Math.min(finalMonthlyGen, consKWh) * energyTariff;
    const simplePaybackYears = monthlySavings > 0
      ? Number((finalValue / (monthlySavings * 12)).toFixed(2))
      : 0;

    const newProp: SolarProposal = {
      id: identity,
      code: propCode,
      clientName: selectedTarget.name,
      companyInfo,
      clientId: selectedTarget.clientId || (selectedTarget.type === 'client' ? selectedTarget.id : undefined),
      leadId: selectedTarget.type === 'lead' ? selectedTarget.id : undefined,
      clientDocument: selectedTarget.document || clientsList.find(client => client.id === selectedTarget.id || client.id === selectedTarget.clientId)?.document,
      clientAddress: [selectedTarget.street, selectedTarget.addressNumber].filter(Boolean).join(', '),
      technicalOutput: { connectionType, targetCoveragePercent, modulePowerW, energyTariff, backupAutonomyHours: isHybrid ? backupAutonomyHours : undefined },
      equipmentOutput: selectedKit?.items?.length ? selectedKit.items.map(item => ({
        id: item.id, description: item.product.name, category: item.product.category,
        quantity: item.quantity, brand: item.product.brand, model: item.product.model,
        warrantyYears: item.product.warrantyYears, powerW: item.product.powerW, capacityKWh: item.product.capacityKWh,
      })) : [
        { id: 'modules', description: moduleModel, category: 'Módulo FV', quantity: finalModules, powerW: modulePowerW },
        { id: 'inverter', description: inverterModel, category: 'Inversor', quantity: 1 },
        ...(isHybrid ? [{ id: 'battery', description: batteryModel, category: 'Bateria', quantity: batteryCount, capacityKWh: batteryCapacityKWh }] : []),
      ],
      clientEmail: selectedTarget.email,
      clientPhone: selectedTarget.phone,
      propertyType: selectedTarget.propertyType || 'Residencial',
      clientCity: selectedTarget.city || '',
      clientState: selectedTarget.state || '',
      concessionaria: concessionaria || selectedTarget.concessionaria || '',
      monthlyConsumptionKWh: consKWh,
      systemPowerKWp: finalKWp,
      modulesCount: finalModules,
      moduleModel,
      inverterModel,
      batteryModel: isHybrid ? batteryModel : undefined,
      batteryCount: isHybrid ? batteryCount : undefined,
      batteryCapacityKWh: isHybrid ? Number((batteryCapacityKWh * (batteryCount || 1)).toFixed(2)) : undefined,
      estimatedMonthlyGenKWh: finalMonthlyGen,
      estimatedMonthlySavings: Math.round(monthlySavings),
      paybackYears: simplePaybackYears,
      totalValue: finalValue,
      hsp: hsp,
      performanceRatio: performanceRatio,
      selectedKitId: selectedKit?.id,
      selectedKitName: selectedKit?.name,
      pricing: commercialPricing || undefined,
      maintenancePlan,
      commercialConditions: {
        paymentMethods: paymentMethods.trim(),
        cashPaymentTerms: cashPaymentTerms.trim(),
        installmentPaymentTerms: installmentPaymentTerms.trim(),
        deliveryTimeframe: deliveryTimeframe.trim(),
        warrantyTerms: warrantyTerms.trim(),
        notes: commercialNotes.trim(),
      },
      status: 'Rascunho',
      createdAt: new Date().toISOString(),
      systemType: systemType,
    };
    return newProp;
}
