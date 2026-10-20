import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useProposalTargetDefaults } from '../src/features/proposals/useProposalTargetDefaults';
import { ProposalWizardStep3 } from '../src/components/ProposalWizardStep3';
import { calculateOnGridMonthlySizing } from '../src/utils/solarSizing';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

test('avançar com histórico mensal não restaura HSP nem substitui a média direta editada', async () => {
  let hsp = 0, consumption = 0;
  const setHsp = (value: number) => { hsp = value; };
  const setConsumption = (value: number) => { consumption = value; };
  const setDistributor = () => {};
  const target = { id: 'test-rj', name: 'Teste', type: 'lead' as const, state: 'RJ', monthlyConsumptionKWh: 450 };
  function Harness({ contact }: { contact: typeof target | null }) {
    useProposalTargetDefaults(contact, setConsumption, setDistributor, setHsp);
    return null;
  }
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(Harness, { contact: target })); });
  assert.equal(hsp, 5.05);
  hsp = 5;
  consumption = 700;
  const months = [850,800,750,650,600,550,600,650,700,750,700,800];
  const monthlyAverage = months.reduce((sum, value) => sum + value, 0) / months.length;
  assert.equal(monthlyAverage, consumption);
  // The actual next-step handler copies the computed average onto the same contact.
  await act(async () => { renderer.update(React.createElement(Harness, {
    contact: { ...target, monthlyConsumptionKWh: monthlyAverage },
  })); });
  assert.equal(hsp, 5, 'HSP manual deve continuar 5,00 ao avançar');
  assert.equal(consumption, 700);
  const sizing = (average: number) => calculateOnGridMonthlySizing({
    monthlyConsumptionKWh: average, connectionType: 'Bifásica', hsp,
    performanceRatioPercent: 80, targetCoveragePercent: 100, modulePowerW: 550,
  });
  assert.deepEqual(sizing(monthlyAverage), sizing(consumption));
  assert.equal(sizing(monthlyAverage).estimatedMonthlyGenerationKWh, 660);
  // A genuinely different contact must still receive its defaults.
  await act(async () => { renderer.update(React.createElement(Harness, {
    contact: { ...target, id: 'other-client', state: 'SP' },
  })); });
  assert.equal(hsp, 4.95);
  assert.equal(consumption, 450);
  await act(async () => { renderer.unmount(); });
});

test('kit selecionado recalcula geração ao editar HSP/PR e ao reabrir a etapa', async () => {
  const oldWindow = globalThis.window;
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {} };
  const noop = () => {};
  let generation = 667;
  const props: any = {
    theme: { primary: '#183956', secondary: '#0076DD', background: '#0E2337', border: '#35536E', text: '#FFFFFF' },
    effectiveAverageKWh: 700, systemType: 'On-Grid', connectionType: 'Bifásica', backupAutonomyHours: 4,
    hsp: 5.05, performanceRatio: 80, targetCoveragePercent: 100, modulePowerW: 550,
    moduleModel: 'Teste 550W', modulesCount: 10, installedPowerKWp: 5.5, inverterModel: 'Teste 6kW',
    batteryModel: '', batteryCount: 1, batteryCapacityKWh: 5.12,
    selectedKit: { id: 'test-kit', name: 'Teste', powerKWp: 5.5, moduleCount: 10, modulePowerW: 550 },
    selectedMaintenancePlan: null, estimatedMonthlyGenKWh: generation, totalKitPrice: 20000,
    setEstimatedMonthlyGenKWh: (value: number) => { generation = value; },
  };
  for (const key of ['Hsp','PerformanceRatio','TargetCoveragePercent','ModulePowerW','ModuleModel','ModulesCount',
    'InstalledPowerKWp','InverterModel','BatteryModel','BatteryCount','BatteryCapacityKWh','SelectedKit',
    'SelectedMaintenancePlan','TotalKitPrice']) props[`set${key}`] = noop;
  let renderer: ReturnType<typeof create> | undefined;
  try {
    await act(async () => { renderer = create(React.createElement(ProposalWizardStep3, props)); });
    assert.equal(generation, 667);
    await act(async () => { renderer!.update(React.createElement(ProposalWizardStep3, { ...props, hsp: 5 })); });
    assert.equal(generation, 660);
    await act(async () => { renderer!.update(React.createElement(ProposalWizardStep3, { ...props, hsp: 5, performanceRatio: 75 })); });
    assert.equal(generation, 619);
    await act(async () => { renderer!.unmount(); });
    renderer = undefined;
    generation = 667;
    await act(async () => { renderer = create(React.createElement(ProposalWizardStep3, { ...props, hsp: 5 })); });
    assert.equal(generation, 660, 'reabrir etapa deve eliminar geração antiga');
  } finally {
    if (renderer) await act(async () => { renderer!.unmount(); });
    if (oldWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = oldWindow;
  }
});
