import {
  Lead,
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

  const totalLossPercent =
    inputs.temperatureLossPercent + inputs.otherLossesPercent + inputs.transformerLossPercent;
  if (totalLossPercent > 80) {
    throw new Error('A soma das perdas não pode ultrapassar 80%.');
  }
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
  const theoreticalPowerKWp =
    designConsumptionKWh === 0
      ? 0
      : designConsumptionKWh / 30 / averageCorrectedSunHours;
  const requiredPowerKWp = theoreticalPowerKWp / performanceRatio;
  const modulesCount =
    requiredPowerKWp === 0 ? 0 : Math.ceil((requiredPowerKWp * 1_000) / inputs.modulePowerW);
  const installedPowerKWp = (modulesCount * inputs.modulePowerW) / 1_000;
  const monthlyGenerationKWh = correctedSunHours.map(
    (sunHours) => installedPowerKWp * sunHours * 30 * performanceRatio
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
  };
};

export const createInitialSolarSizingInputs = (lead: Lead): SolarSizingInputs => {
  const monthlyConsumption = lead.averageConsumptionKWh ?? 0;

  return {
    connectionType: 'Bifásica',
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
    inverterPowerKW: 5,
    inverterCount: 1,
    notes: '',
  };
};
