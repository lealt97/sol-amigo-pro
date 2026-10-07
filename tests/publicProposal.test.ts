import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicProposalUrl, createPublicProposalDocument, createPublicProposalToken, hashPublicProposalToken, PUBLIC_PROPOSAL_TOKEN } from '../src/utils/publicProposal';
import type { SolarProposal } from '../src/types';
import { DEFAULT_PDF_SETTINGS, DEFAULT_THEME } from '../src/utils/themeEngine';

test('public links use unguessable tokens and preserve the published subpath', async () => {
  const token = createPublicProposalToken();
  assert.match(token, PUBLIC_PROPOSAL_TOKEN);
  assert.notEqual(token, createPublicProposalToken());
  const url = new URL(buildPublicProposalUrl(token, 'https://example.com/sol-amigo-pro/?old=1#dashboard'));
  assert.equal(url.pathname, '/sol-amigo-pro/');
  assert.equal(url.searchParams.get('proposta'), token);
  assert.equal(url.searchParams.has('old'), false);
  assert.equal(url.hash, '');
  assert.notEqual(await hashPublicProposalToken(token), token);
  assert.throws(() => buildPublicProposalUrl('PROP-2026-128'));
  assert.throws(() => buildPublicProposalUrl(token, 'javascript:alert(1)'));
});

test('public document keeps proposal outputs but excludes internal costs and CRM payloads', () => {
  const proposal = {
    id: 'local-128', code: 'PROP-2026-128', clientName: 'Cliente de teste', totalValue: 24000,
    publicToken: 'private-old-token',
    pricing: { equipmentItems: [{ id: 'panel', description: 'Módulo 600 W', quantity: 12, category: 'Módulos', unitCost: 999 }], margin: 30, profit: 5000 },
    sizing: { secretInternalData: 'private', inverterCount: 2, estimatedAreaM2: 45 },
    maintenancePlan: { enabled: true, type: 'annual', name: 'Preventiva', frequencyMonths: 12, visitsPerYear: 1, internalCostPerVisit: 450, annualPrice: 800, includedServices: ['Inspeção'], notes: 'Agendar previamente' },
    commercialConditions: { cashPaymentTerms: '50% na assinatura', deliveryTimeframe: '30 dias' },
  } as unknown as SolarProposal;
  const document = createPublicProposalDocument(proposal, DEFAULT_PDF_SETTINGS, DEFAULT_THEME);
  assert.equal(document.proposal.clientName, proposal.clientName);
  assert.equal(document.proposal.totalValue, 24000);
  assert.equal(document.proposal.commercialConditions?.cashPaymentTerms, '50% na assinatura');
  assert.equal(document.proposal.equipmentOutput?.[0].quantity, 12);
  assert.equal(document.proposal.maintenancePlan?.annualPrice, 800);
  assert.equal(document.proposal.maintenancePlan?.internalCostPerVisit, 0);
  assert.equal(document.proposal.pricing, undefined);
  assert.equal(document.proposal.sizing, undefined);
  assert.equal(document.proposal.technicalOutput?.inverterCount, 2);
  assert.equal(document.proposal.technicalOutput?.estimatedAreaM2, 45);
  assert.equal(document.proposal.publicToken, undefined);
  assert.equal('unitCost' in document.proposal.equipmentOutput![0], false);
  assert.equal(document.pdfSettings.template, DEFAULT_PDF_SETTINGS.template);
  document.theme.primary = '#000000';
  assert.notEqual(DEFAULT_THEME.primary, '#000000');
});
