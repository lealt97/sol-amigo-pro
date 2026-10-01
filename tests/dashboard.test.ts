import assert from 'node:assert/strict';
import test from 'node:test';
import {
  averageApprovedTicket,
  buildDashboardBuckets,
  getDashboardDateRange,
  normalizeProposalStatus,
  percentageChange,
  proposalConversionPercent,
  proposalStatusCounts,
  sumApprovedPower,
  sumApprovedRevenue,
} from '../src/utils/dashboardAnalytics';
import { ClientProposal } from '../src/services/proposals';

const proposals: ClientProposal[] = [
  {
    id: '1',
    code: 'P-1',
    clientId: 'c1',
    clientName: 'Cliente 1',
    title: 'Proposta 1',
    systemPowerKWp: 5,
    systemType: 'On-Grid',
    totalValue: 20000,
    status: 'Aprovada',
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: '2',
    code: 'P-2',
    clientId: 'c2',
    clientName: 'Cliente 2',
    title: 'Proposta 2',
    systemPowerKWp: 8,
    systemType: 'On-Grid',
    totalValue: 30000,
    status: 'Aprovada',
    createdAt: '2026-09-15T12:00:00.000Z',
  },
  {
    id: '3',
    code: 'P-3',
    clientId: 'c3',
    clientName: 'Cliente 3',
    title: 'Proposta 3',
    systemPowerKWp: 10,
    systemType: 'Híbrido',
    totalValue: 50000,
    status: 'Recusada',
    createdAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: '4',
    code: 'P-4',
    clientId: 'c4',
    clientName: 'Cliente 4',
    title: 'Proposta 4',
    systemPowerKWp: 6,
    systemType: 'On-Grid',
    totalValue: 25000,
    status: 'Em negociação',
    createdAt: '2026-09-25T12:00:00.000Z',
  },
];

test('normaliza status de proposta independentemente da capitalização', () => {
  assert.equal(normalizeProposalStatus('aprovada'), 'approved');
  assert.equal(normalizeProposalStatus('Aprovada'), 'approved');
  assert.equal(normalizeProposalStatus('Visualizada'), 'sent');
  assert.equal(normalizeProposalStatus('Em negociação'), 'negotiation');
  assert.equal(normalizeProposalStatus('Recusada'), 'refused');
  assert.equal(normalizeProposalStatus('Rascunho'), 'pending');
});

test('calcula receita, potência, ticket e conversão somente com dados aprovados quando aplicável', () => {
  assert.equal(sumApprovedRevenue(proposals), 50000);
  assert.equal(sumApprovedPower(proposals), 13);
  assert.equal(averageApprovedTicket(proposals), 25000);
  assert.equal(proposalConversionPercent(proposals), 50);
});

test('distribuição de propostas por status preserva todas as categorias', () => {
  assert.deepEqual(proposalStatusCounts(proposals), {
    approved: 2,
    negotiation: 1,
    sent: 0,
    refused: 1,
    pending: 0,
  });
});

test('comparação percentual trata base zero sem inventar crescimento', () => {
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(10, 0), null);
});

test('período de 30 dias cobre exatamente 30 dias e gera cinco barras', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  const range = getDashboardDateRange('30d', now);
  assert.equal(range.start?.toISOString().slice(0, 10), '2026-09-02');
  assert.equal(range.end.toISOString().slice(0, 10), '2026-10-01');

  const buckets = buildDashboardBuckets('30d', now);
  assert.equal(buckets.length, 5);
  assert.equal(buckets[0].start.toISOString().slice(0, 10), '2026-09-02');
  assert.equal(buckets[4].end.toISOString().slice(0, 10), '2026-10-01');
});

test('ano gera doze barras mensais', () => {
  const buckets = buildDashboardBuckets('year', new Date('2026-10-01T12:00:00.000Z'));
  assert.equal(buckets.length, 12);
  assert.equal(buckets.at(-1)?.label.toLocaleLowerCase('pt-BR'), 'out');
});
