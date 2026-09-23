import {
  Lead,
  OpportunitySizing,
  SolarConnectionType,
  SolarSizingInputs,
  SolarSizingResults,
} from '../types';

export const SOLAR_SIZING_VERSION = 'sa-sizing-v1' as const;

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export const AVAILABILITY_COST_KWH: Record<SolarConnectionType, number> = {
  Monofásica: 30,
  Bifásica: 50,
  Trifásica: 100,
};

const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

const round = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const assertFiniteRange = (label: string, value: number, min: number, max: number) => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} deve ficar entre ${min} e ${max}.`);
  }
};

export const validateSolarSizingInputs = (inputs: SolarSizingInputs) => {
  if (inputs.monthlyConsumptionKWh.length !== 12 || inputs.monthlySunHours.length !== 12) {
    throw new Error('Informe os 12 meses de consumo e de HSP.');
  }

  inputs.monthlyConsumptionKWh.forEach((value, index) =>
    assertFiniteRange(`Consumo de ${MONTHS[index]}`, value, 0, 1_000_000)
  );
  inputs.monthlySunHours.forEach((value, index) =>
    assertFiniteRange(`HSP de ${MONTHS[index]}`, value, 0.1, 12)
  );

  assertFiniteRange('Cobertura desejada', inputs.targetCoveragePercent, 1, 150);
  assertFiniteRange('Consumo futuro', inputs.futureConsumptionKWh, 0, 1_000_000);
  assertFiniteRange('Fator de inclinação', inputs.inclinationFactor, 0.5, 1.5);
  assertFiniteRange('Perda por temperatura', inputs.temperatureLossPercent, 0, 50);
  assertFiniteRange('Outras perdas', inputs.otherLossesPercent, 0, 50);
  assertFiniteRange('Perda do transformador', inputs.transformerLossPercent, 0, 20);
  assertFiniteRange('Potência do módulo', inputs.modulePowerW, 50, 2_000);
  assertFiniteRange('Área do módulo', inputs.moduleAreaM2, 0.1, 20);
  assertFiniteRange('Potência do inversor', inputs.inverterPowerKW, 0.1, 10_000);
  assertFiniteRange('Quantidade de inversores', inputs.inverterCount, 1, 1_000);

  if (inputs.systemType === 'Híbrido') {
    if (inputs.batteryCapacityKWh != null) {
      assertFiniteRange('Capacidade da bateria', inputs.batteryCapacityKWh, 0.5, 100);
    }
    if (inputs.batteryCount != null) {
      assertFiniteRange('Quantidade de baterias', inputs.batteryCount, 1, 50);
    }
    if (inputs.batteryDepthOfDischarge != null) {
      assertFiniteRange('Profundidade de descarga (DoD)', inputs.batteryDepthOfDischarge, 10, 100);
    }
    assertFiniteRange('Reserva da bateria', inputs.batteryReservePercent ?? 10, 0, 80);
    assertFiniteRange('Eficiência da bateria', inputs.batteryEfficiencyPercent ?? 95, 1, 100);
    assertFiniteRange('Eficiência do inversor híbrido', inputs.hybridInverterEfficiencyPercent ?? 92, 1, 100);
    (inputs.hybridLoads ?? []).forEach((load) => {
      assertFiniteRange(`Quantidade de ${load.name}`, load.quantity, 1, 10_000);
      assertFiniteRange(`Potência de ${load.name}`, load.powerW, 0, 10_000_000);
      assertFiniteRange(`Pico de ${load.name}`, load.surgePowerW, 0, 10_000_000);
      assertFiniteRange(`Tempo de uso de ${load.name}`, load.usageHours, 0, 168);
    });
  }

  const totalLossPercent =
    inputs.temperatureLossPercent + inputs.otherLossesPercent + inputs.transformerLossPercent;
  if (totalLossPercent > 80) {
    throw new Error('A soma das perdas não pode ultrapassar 80%.');
  }
};

export interface OnGridMonthlySizingInput {
  monthlyConsumptionKWh: number;
  hsp: number;
  performanceRatioPercent: number;
  targetCoveragePercent: number;
  modulePowerW: number;
}

/**
 * Pré-dimensionamento mensal usado pelo Wizard comercial.
 *
 * Critério padronizado do Sol Amigo PRO:
 * P(kWp) = (consumo mensal x cobertura) / (30 dias x HSP x PR)
 *
 * O custo de disponibilidade NÃO é subtraído da energia-alvo deste
 * pré-dimensionamento. Ele permanece disponível no motor detalhado para
 * análises de compensação/faturamento.
 */
export const calculateOnGridMonthlySizing = (input: OnGridMonthlySizingInput) => {
  assertFiniteRange('Consumo mensal', input.monthlyConsumptionKWh, 0, 1_000_000);
  assertFiniteRange('HSP', input.hsp, 0.1, 12);
  assertFiniteRange('Rendimento global (PR)', input.performanceRatioPercent, 1, 100);
  assertFiniteRange('Cobertura desejada', input.targetCoveragePercent, 1, 150);
  assertFiniteRange('Potência do módulo', input.modulePowerW, 50, 2_000);

  const daysInMonth = 30;
  const performanceRatio = input.performanceRatioPercent / 100;
  const coverage = input.targetCoveragePercent / 100;
  const designConsumptionKWh = input.monthlyConsumptionKWh * coverage;
  const requiredPowerKWp =
    designConsumptionKWh === 0
      ? 0
      : designConsumptionKWh / (daysInMonth * input.hsp * performanceRatio);
  const modulesCount =
    requiredPowerKWp === 0
      ? 0
      : Math.ceil((requiredPowerKWp * 1_000) / input.modulePowerW);
  const installedPowerKWp = modulesCount * input.modulePowerW / 1_000;
  const estimatedMonthlyGenerationKWh =
    installedPowerKWp * input.hsp * daysInMonth * performanceRatio;

  return {
    daysInMonth,
    performanceRatio: round(performanceRatio, 5),
    designConsumptionKWh: round(designConsumptionKWh, 3),
    requiredPowerKWp: round(requiredPowerKWp, 4),
    modulesCount,
    installedPowerKWp: round(installedPowerKWp, 4),
    estimatedMonthlyGenerationKWh: round(estimatedMonthlyGenerationKWh, 3),
    estimatedCoveragePercent:
      designConsumptionKWh === 0
        ? 0
        : round((estimatedMonthlyGenerationKWh / designConsumptionKWh) * 100, 2),
  };
};

export const calculateSolarSizing = (inputs: SolarSizingInputs): SolarSizingResults => {
  validateSolarSizingInputs(inputs);

  const averageConsumptionKWh = average(inputs.monthlyConsumptionKWh);
  const availabilityCostKWh = AVAILABILITY_COST_KWH[inputs.connectionType];
  const compensableConsumptionKWh = Math.max(averageConsumptionKWh - availabilityCostKWh, 0);
  const designConsumptionKWh =
    compensableConsumptionKWh * (inputs.targetCoveragePercent / 100) + inputs.futureConsumptionKWh;
  const correctedSunHours = inputs.monthlySunHours.map(
    (sunHours) => sunHours * inputs.inclinationFactor
  );
  const averageCorrectedSunHours = average(correctedSunHours);
  const totalLossPercent =
    inputs.temperatureLossPercent + inputs.otherLossesPercent + inputs.transformerLossPercent;
  const performanceRatio = 1 - totalLossPercent / 100;
  const annualDesignConsumptionKWh = designConsumptionKWh * 12;
  const annualCorrectedSunHours = correctedSunHours.reduce(
    (total, sunHours, index) => total + sunHours * MONTH_DAYS[index], 0
  );
  const theoreticalPowerKWp = annualDesignConsumptionKWh === 0
    ? 0
    : annualDesignConsumptionKWh / annualCorrectedSunHours;
  const requiredPowerKWp = theoreticalPowerKWp / performanceRatio;
  const modulesCount =
    requiredPowerKWp === 0 ? 0 : Math.ceil((requiredPowerKWp * 1_000) / inputs.modulePowerW);
  const installedPowerKWp = (modulesCount * inputs.modulePowerW) / 1_000;
  const monthlyGenerationKWh = correctedSunHours.map(
    (sunHours, index) => installedPowerKWp * sunHours * MONTH_DAYS[index] * performanceRatio
  );
  const estimatedAnnualGenerationKWh = monthlyGenerationKWh.reduce(
    (total, generation) => total + generation,
    0
  );
  const estimatedMonthlyGenerationKWh = estimatedAnnualGenerationKWh / 12;
  const estimatedCoveragePercent =
    designConsumptionKWh === 0 ? 0 : (estimatedMonthlyGenerationKWh / designConsumptionKWh) * 100;
  const estimatedAreaM2 = modulesCount * inputs.moduleAreaM2;
  const totalInverterPowerKW = inputs.inverterPowerKW * inputs.inverterCount;
  const dcAcRatio = totalInverterPowerKW > 0 ? installedPowerKWp / totalInverterPowerKW : 0;

  // Hybrid battery sizing calculation
  let batteryTotalCapacityKWh: number | undefined;
  let batteryAutonomyHours: number | undefined;
  let backupEnergyKWh: number | undefined;
  let backupSimultaneousPowerKW: number | undefined;
  let backupSurgePowerKW: number | undefined;
  let requiredBatteryCapacityKWh: number | undefined;
  let requiredBatteryCount: number | undefined;
  let installedUsableBatteryKWh: number | undefined;
  let minimumHybridInverterPowerKW: number | undefined;
  let hybridWarnings: string[] | undefined;

  if (inputs.systemType === 'Híbrido') {
    const batCap = inputs.batteryCapacityKWh ?? 5.12;
    const batCount = inputs.batteryCount ?? 1;
    const dod = (inputs.batteryDepthOfDischarge ?? 90) / 100;
    const reserve = 1 - (inputs.batteryReservePercent ?? 10) / 100;
    const batteryEfficiency = (inputs.batteryEfficiencyPercent ?? 95) / 100;
    const inverterEfficiency = (inputs.hybridInverterEfficiencyPercent ?? 92) / 100;
    batteryTotalCapacityKWh = round(batCap * batCount, 2);
    const loads = inputs.hybridLoads ?? [];
    backupEnergyKWh = round(loads.reduce(
      (total, load) => total + load.powerW * load.quantity * load.usageHours / 1_000, 0
    ), 3);
    backupSimultaneousPowerKW = round(loads.filter((load) => load.simultaneous).reduce(
      (total, load) => total + load.powerW * load.quantity / 1_000, 0
    ), 3);
    const largestAdditionalSurgeKW = loads.reduce(
      (largest, load) => Math.max(largest, load.surgePowerW * load.quantity / 1_000), 0
    );
    backupSurgePowerKW = round(backupSimultaneousPowerKW + largestAdditionalSurgeKW, 3);
    requiredBatteryCapacityKWh = round(
      backupEnergyKWh / (dod * reserve * batteryEfficiency * inverterEfficiency), 3
    );
    requiredBatteryCount = Math.max(1, Math.ceil(requiredBatteryCapacityKWh / batCap));
    installedUsableBatteryKWh = round(
      batteryTotalCapacityKWh * dod * reserve * batteryEfficiency * inverterEfficiency, 3
    );
    const requestedHours = inputs.backupAutonomyHours ?? 4;
    const averageBackupPowerKW = requestedHours > 0 ? backupEnergyKWh / requestedHours : 0;
    batteryAutonomyHours = averageBackupPowerKW > 0
      ? round(installedUsableBatteryKWh / averageBackupPowerKW, 1)
      : 0;
    minimumHybridInverterPowerKW = round(Math.max(
      backupSimultaneousPowerKW * 1.2,
      backupSurgePowerKW
    ), 3);
    hybridWarnings = [];
    if (loads.length === 0) hybridWarnings.push('Adicione cargas prioritárias para calcular o backup com segurança.');
    if ((inputs.hybridInverterPowerKW ?? inputs.inverterPowerKW) < backupSimultaneousPowerKW * 1.2) {
      hybridWarnings.push('A potência contínua do inversor híbrido está abaixo da carga simultânea com margem.');
    }
    if ((inputs.hybridInverterSurgePowerKW ?? (inputs.inverterPowerKW * 2)) < backupSurgePowerKW) {
      hybridWarnings.push('A potência de surto informada pode não suportar a partida das cargas.');
    }
    if (batCount < requiredBatteryCount) {
      hybridWarnings.push(`O banco informado é insuficiente; o cálculo recomenda ao menos ${requiredBatteryCount} bateria(s).`);
    }
  }

  return {
    averageConsumptionKWh: round(averageConsumptionKWh, 3),
    availabilityCostKWh,
    compensableConsumptionKWh: round(compensableConsumptionKWh, 3),
    designConsumptionKWh: round(designConsumptionKWh, 3),
    averageCorrectedSunHours: round(averageCorrectedSunHours, 4),
    totalLossPercent: round(totalLossPercent, 2),
    performanceRatio: round(performanceRatio, 5),
    theoreticalPowerKWp: round(theoreticalPowerKWp, 4),
    requiredPowerKWp: round(requiredPowerKWp, 4),
    modulesCount,
    installedPowerKWp: round(installedPowerKWp, 4),
    estimatedMonthlyGenerationKWh: round(estimatedMonthlyGenerationKWh, 3),
    estimatedAnnualGenerationKWh: round(estimatedAnnualGenerationKWh, 3),
    estimatedCoveragePercent: round(estimatedCoveragePercent, 2),
    estimatedAreaM2: round(estimatedAreaM2, 3),
    dcAcRatio: round(dcAcRatio, 4),
    dcAcStatus: dcAcRatio >= 0.75 && dcAcRatio <= 1.3 ? 'ok' : 'atencao',
    monthlyGenerationKWh: monthlyGenerationKWh.map((value) => round(value, 3)),
    batteryTotalCapacityKWh,
    batteryAutonomyHours,
    backupEnergyKWh,
    backupSimultaneousPowerKW,
    backupSurgePowerKW,
    requiredBatteryCapacityKWh,
    requiredBatteryCount,
    installedUsableBatteryKWh,
    minimumHybridInverterPowerKW,
    hybridWarnings,
  };
};

export const createInitialSolarSizingInputs = (lead: Lead): SolarSizingInputs => {
  const leadAny = lead as any;
  const rawConsumption =
    lead.averageConsumptionKWh ||
    leadAny.average_consumption_kwh ||
    (lead.averageMonthlyBill ? Math.round(Number(lead.averageMonthlyBill) / 0.95) : 0) ||
    (leadAny.average_monthly_bill ? Math.round(Number(leadAny.average_monthly_bill) / 0.95) : 0);

  const monthlyConsumption = rawConsumption > 0 ? rawConsumption : 450;

  // Auto-size inverter to match estimated demand (dcAc ratio ~ 1.0 - 1.25)
  const estimatedPowerKWp = monthlyConsumption / (30 * 5 * 0.786);
  let inverterKW = 5;
  if (estimatedPowerKWp <= 3.5) inverterKW = 3.0;
  else if (estimatedPowerKWp <= 5.5) inverterKW = 5.0;
  else if (estimatedPowerKWp <= 8.5) inverterKW = 7.5;
  else if (estimatedPowerKWp <= 12) inverterKW = 10.0;
  else inverterKW = Math.ceil(estimatedPowerKWp / 5) * 5;

  const propType = lead.propertyType || leadAny.property_type;

  return {
    systemType: 'On-Grid',
    connectionType: (propType === 'Industrial' ? 'Trifásica' : 'Bifásica') as SolarConnectionType,
    monthlyConsumptionKWh: Array.from({ length: 12 }, () => monthlyConsumption),
    monthlySunHours: Array.from({ length: 12 }, () => 5),
    targetCoveragePercent: 100,
    futureConsumptionKWh: 0,
    inclinationFactor: 1,
    temperatureLossPercent: 11.39,
    otherLossesPercent: 10,
    transformerLossPercent: 0,
    modulePowerW: 550,
    moduleAreaM2: 2.6,
    inverterPowerKW: inverterKW,
    inverterCount: 1,
    batteryCapacityKWh: 5.12,
    batteryCount: 1,
    batteryDepthOfDischarge: 90,
    hybridLoads: [],
    backupAutonomyHours: 4,
    batteryReservePercent: 10,
    batteryEfficiencyPercent: 95,
    hybridInverterEfficiencyPercent: 92,
    hybridInverterPowerKW: inverterKW,
    hybridInverterSurgePowerKW: inverterKW * 2,
    installationCity: lead.city,
    installationState: lead.state,
    roofType: 'Cerâmico',
    roofOrientation: 'Norte',
    roofShading: 'Nenhum',
    hspSource: 'padrao',
    notes: 'Pré-dimensionamento gerado automaticamente com base nos dados do formulário.',
  };
};

export const generateAutoOpportunitySizing = (lead: Lead): OpportunitySizing => {
  const inputs = createInitialSolarSizingInputs(lead);
  const results = calculateSolarSizing(inputs);

  return {
    id: `auto-${lead.id}`,
    leadId: lead.id,
    calculationVersion: SOLAR_SIZING_VERSION,
    connectionType: inputs.connectionType,
    monthlyConsumptionKWh: inputs.monthlyConsumptionKWh,
    monthlySunHours: inputs.monthlySunHours,
    targetCoveragePercent: inputs.targetCoveragePercent,
    futureConsumptionKWh: inputs.futureConsumptionKWh,
    inclinationFactor: inputs.inclinationFactor,
    temperatureLossPercent: inputs.temperatureLossPercent,
    otherLossesPercent: inputs.otherLossesPercent,
    transformerLossPercent: inputs.transformerLossPercent,
    modulePowerW: inputs.modulePowerW,
    moduleAreaM2: inputs.moduleAreaM2,
    inverterPowerKW: inputs.inverterPowerKW,
    inverterCount: inputs.inverterCount,
    systemType: inputs.systemType,
    batteryCapacityKWh: inputs.batteryCapacityKWh,
    batteryCount: inputs.batteryCount,
    batteryDepthOfDischarge: inputs.batteryDepthOfDischarge,
    hybridLoads: inputs.hybridLoads,
    backupAutonomyHours: inputs.backupAutonomyHours,
    batteryReservePercent: inputs.batteryReservePercent,
    batteryEfficiencyPercent: inputs.batteryEfficiencyPercent,
    hybridInverterEfficiencyPercent: inputs.hybridInverterEfficiencyPercent,
    hybridInverterPowerKW: inputs.hybridInverterPowerKW,
    hybridInverterSurgePowerKW: inputs.hybridInverterSurgePowerKW,
    installationCity: inputs.installationCity,
    installationState: inputs.installationState,
    roofType: inputs.roofType,
    roofOrientation: inputs.roofOrientation,
    roofShading: inputs.roofShading,
    hspSource: inputs.hspSource,
    notes: inputs.notes,
    status: 'rascunho',
    ...results,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
