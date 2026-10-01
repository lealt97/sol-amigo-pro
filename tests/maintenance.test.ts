import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateMaintenanceVisitsPerYear,
  formatMaintenanceFrequency,
  getMaintenanceAnnualSalePrice,
  getMaintenanceFrequency,
  normalizeMaintenanceInterval,
} from '../src/utils/maintenance';

test('plano quinzenal estima 24 visitas por ano', () => {
  assert.equal(estimateMaintenanceVisitsPerYear(15, 'days'), 24);
});

test('frequência antiga em meses continua compatível', () => {
  const frequency = getMaintenanceFrequency({
    frequencyMonths: 6,
  });

  assert.deepEqual(frequency, { interval: 6, unit: 'months' });
  assert.equal(formatMaintenanceFrequency({ frequencyMonths: 6 }), 'a cada 6 meses');
});

test('preço por visita calcula valor anual efetivo', () => {
  const annual = getMaintenanceAnnualSalePrice({
    pricingMode: 'per_visit',
    pricePerVisit: 250,
    annualPrice: 0,
    visitsPerYear: 24,
  });

  assert.equal(annual, 6000);
});

test('limites de intervalo variam por unidade', () => {
  assert.equal(normalizeMaintenanceInterval(999, 'days'), 365);
  assert.equal(normalizeMaintenanceInterval(999, 'weeks'), 52);
  assert.equal(normalizeMaintenanceInterval(999, 'months'), 36);
});
