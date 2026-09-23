import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOnGridMonthlySizing, calculateSolarSizing } from '../src/utils/solarSizing';

test('dimensionamento desconta custo de disponibilidade e aplica perdas como eficiência', () => {
  const result = calculateSolarSizing({
    connectionType: 'Bifásica',
    monthlyConsumptionKWh: Array(12).fill(600),
    monthlySunHours: Array(12).fill(5),
    targetCoveragePercent: 100,
    futureConsumptionKWh: 0,
    inclinationFactor: 1,
    temperatureLossPercent: 10,
    otherLossesPercent: 10,
    transformerLossPercent: 0,
    modulePowerW: 550,
    moduleAreaM2: 2.2,
    inverterPowerKW: 5,
    inverterCount: 1,
    notes: '',
  });

  assert.equal(result.availabilityCostKWh, 50);
  assert.equal(result.compensableConsumptionKWh, 550);
  assert.equal(result.performanceRatio, 0.8);
  assert.equal(result.modulesCount, 9);
  assert.equal(result.installedPowerKWp, 4.95);
  assert.equal(result.estimatedMonthlyGenerationKWh, 602.25);
});

test('referência On-Grid do wizard: 658 kWh, HSP 5.56, PR 80%, módulo 550 W', () => {
  const result = calculateOnGridMonthlySizing({
    monthlyConsumptionKWh: 658,
    connectionType: 'Bifásica',
    hsp: 5.56,
    performanceRatioPercent: 80,
    targetCoveragePercent: 100,
    modulePowerW: 550,
  });

  assert.equal(result.daysInMonth, 30);
  assert.equal(result.availabilityCostKWh, 50);
  assert.equal(result.compensableConsumptionKWh, 608);
  assert.equal(result.dailyGenerationTargetKWh, 20.267);
  assert.equal(result.requiredPowerKWp, 4.5564);
  assert.equal(result.modulesCount, 9);
  assert.equal(result.installedPowerKWp, 4.95);
  assert.equal(result.estimatedMonthlyGenerationKWh, 660.528);
});

test('dimensionamento rejeita doze meses incompletos', () => {
  assert.throws(() => calculateSolarSizing({
    connectionType: 'Monofásica', monthlyConsumptionKWh: [500], monthlySunHours: [5],
    targetCoveragePercent: 100, futureConsumptionKWh: 0, inclinationFactor: 1,
    temperatureLossPercent: 10, otherLossesPercent: 10, transformerLossPercent: 0,
    modulePowerW: 550, moduleAreaM2: 2.2, inverterPowerKW: 5, inverterCount: 1, notes: '',
  }), /12 meses/);
});

test('dimensionamento híbrido usa cargas prioritárias, eficiências e pico de partida', () => {
  const result = calculateSolarSizing({
    systemType: 'Híbrido',
    connectionType: 'Trifásica',
    monthlyConsumptionKWh: Array(12).fill(720), // 720 kWh / mês = 24 kWh/dia = 1 kW contínuo
    monthlySunHours: Array(12).fill(5),
    targetCoveragePercent: 100,
    futureConsumptionKWh: 0,
    inclinationFactor: 1,
    temperatureLossPercent: 8,
    otherLossesPercent: 7,
    transformerLossPercent: 0,
    modulePowerW: 550,
    moduleAreaM2: 2.2,
    inverterPowerKW: 6,
    inverterCount: 1,
    batteryCapacityKWh: 5.12,
    batteryCount: 2, // 10.24 kWh total
    batteryDepthOfDischarge: 90,
    batteryReservePercent: 10,
    batteryEfficiencyPercent: 95,
    hybridInverterEfficiencyPercent: 92,
    backupAutonomyHours: 4,
    hybridInverterPowerKW: 3,
    hybridInverterSurgePowerKW: 6,
    hybridLoads: [{
      id: 'carga-1', name: 'Carga crítica', quantity: 1, powerW: 1000,
      surgePowerW: 2000, usageHours: 4, simultaneous: true,
    }],
    notes: 'Estudo para sistema híbrido com backup',
  });

  assert.equal(result.availabilityCostKWh, 100);
  assert.equal(result.batteryTotalCapacityKWh, 10.24);
  assert.equal(result.backupEnergyKWh, 4);
  assert.equal(result.backupSimultaneousPowerKW, 1);
  assert.equal(result.backupSurgePowerKW, 3);
  assert.equal(result.requiredBatteryCount, 2);
  assert.equal(result.minimumHybridInverterPowerKW, 3);
  assert.equal(result.batteryAutonomyHours, 7.2);
});

test('dimensionamento rejeita perdas combinadas superiores a 80%', () => {
  assert.throws(() => calculateSolarSizing({
    connectionType: 'Monofásica',
    monthlyConsumptionKWh: Array(12).fill(400),
    monthlySunHours: Array(12).fill(5),
    targetCoveragePercent: 100,
    futureConsumptionKWh: 0,
    inclinationFactor: 1,
    temperatureLossPercent: 45,
    otherLossesPercent: 40,
    transformerLossPercent: 0,
    modulePowerW: 550,
    moduleAreaM2: 2.2,
    inverterPowerKW: 3,
    inverterCount: 1,
    notes: '',
  }), /A soma das perdas não pode ultrapassar 80%/);
});
