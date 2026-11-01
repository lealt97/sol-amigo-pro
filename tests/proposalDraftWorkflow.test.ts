import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWizardProposal } from '../src/features/proposals/buildProposal';

test('buildWizardProposal cria proposta final com status Pendente por padrão', () => {
  const proposal = buildWizardProposal({
    selectedTarget: { id: 'c-1', name: 'Cliente Teste', type: 'client' },
    clientsList: [],
    connectionType: 'Bifásica',
    targetCoveragePercent: 100,
    modulePowerW: 550,
    energyTariff: 0.92,
    backupAutonomyHours: 4,
    selectedKit: null,
    moduleModel: 'Modulo Solar 550W',
    inverterModel: 'Inversor 5kW',
    batteryModel: '',
    batteryCount: 0,
    batteryCapacityKWh: 0,
    concessionaria: 'CPFL',
    hsp: 5.0,
    performanceRatio: 80,
    commercialPricing: { finalSalePrice: 25000 } as any,
    maintenancePlan: { enabled: false } as any,
    paymentMethods: 'À vista ou financiado',
    cashPaymentTerms: '100% no pedido',
    installmentPaymentTerms: 'Em até 60x',
    deliveryTimeframe: '30 dias',
    warrantyTerms: '10 anos de inversor',
    commercialNotes: 'Observações comerciais',
    systemType: 'On-Grid',
    effectiveAverageKWh: 600,
    installedPowerKWp: 5.5,
    modulesCount: 10,
    estimatedMonthlyGenKWh: 660,
  });

  assert.equal(proposal.status, 'Pendente', 'Proposta concluída deve ter status Pendente');
  assert.equal(proposal.systemPowerKWp, 5.5);
  assert.equal(proposal.totalValue, 25000);
});

test('proposta recusada ao ser editada e reenviada recebe status "Em negociação" e se recusada volta a "Recusada"', async () => {
  const store: Record<string, string> = {};
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  const { configureWorkspaceRepository, workspace } = await import('../src/platform/workspace/workspace');
  configureWorkspaceRepository({
    list: async () => [],
    write: async () => 1,
  });
  await workspace.open('test-account-renegotiation');
  const { updateProposalStatus, saveStoredProposalsLocal } = await import('../src/services/proposals');

  const initialProp = {
    id: 'prop-test-workflow-1',
    code: 'PROP-2026-WORKFLOW1',
    clientId: 'c-test-1',
    clientName: 'Cliente Renegociacao',
    title: '5.5 kWp • Cliente Renegociacao',
    systemPowerKWp: 5.5,
    systemType: 'On-Grid' as const,
    totalValue: 25000,
    status: 'Recusada' as const,
    wasRejected: true,
    createdAt: new Date().toISOString(),
  };

  saveStoredProposalsLocal([initialProp]);

  // 1. Proposta recusada ao ser reenviada tem status "Em negociação"
  const sentResult = await updateProposalStatus(initialProp.id, 'Enviada');
  assert.equal(sentResult?.status, 'Em negociação', 'Proposta recusada reenviada deve ter status "Em negociação"');
  assert.equal(sentResult?.wasRejected, true);

  // 2. Se for recusada novamente, o status volta para "Recusada"
  const refusedAgain = await updateProposalStatus(initialProp.id, 'Recusada');
  assert.equal(refusedAgain?.status, 'Recusada', 'Ao ser recusada novamente, o status volta para "Recusada"');
  assert.equal(refusedAgain?.wasRejected, true);

  // 3. Ao editar e reenviar novamente, o status volta para "Em negociação"
  const sentAgain = await updateProposalStatus(initialProp.id, 'Enviada');
  assert.equal(sentAgain?.status, 'Em negociação', 'Ao ser reenviada novamente, status deve ser "Em negociação"');
});

test('rascunho de proposta ao ser emitido é promovido a Pendente e limpa metadados de rascunho', async () => {
  const { createQuickProposalForClient, getStoredProposalsLocal, saveStoredProposalsLocal } = await import('../src/services/proposals');

  const draftProp = {
    id: 'prop-draft-emit-1',
    code: 'PROP-2026-DRAFT1',
    clientId: 'c-draft-1',
    clientName: 'Cliente Rascunho',
    title: '5.5 kWp • Cliente Rascunho',
    systemPowerKWp: 5.5,
    systemType: 'On-Grid' as const,
    totalValue: 26000,
    status: 'Rascunho' as const,
    draftStep: 'sizing_hardware',
    draftData: { currentStep: 'sizing_hardware' },
    createdAt: new Date().toISOString(),
  };

  saveStoredProposalsLocal([draftProp]);

  // Emissão da proposta
  const emitted = await createQuickProposalForClient({
    ...draftProp,
    status: 'Pendente',
  });

  assert.equal(emitted.status, 'Pendente', 'Proposta emitida deve ter status Pendente');
  assert.equal(emitted.draftStep, undefined, 'draftStep deve ser removido');

  const stored = getStoredProposalsLocal();
  const found = stored.find(p => p.id === draftProp.id);
  assert.ok(found, 'Proposta deve constar no armazenamento');
  assert.equal(found.status, 'Pendente', 'Status armazenado deve ser Pendente');
  assert.equal(found.draftStep, undefined, 'draftStep não deve existir no armazenamento');
});


