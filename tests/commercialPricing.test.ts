import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCommercialPricing } from '../src/utils/commercialPricing';

test('precificação preserva a margem líquida informada', () => {
  const result = calculateCommercialPricing({
    equipmentItems: [{ id: 'module', description: 'Módulo', category: 'Módulo FV', quantity: 10, unitCost: 500 }],
    installationCost: 2500, engineeringCost: 1000, utilityFee: 500,
    freightCost: 750, otherCosts: 250, taxesPercent: 10, commissionPercent: 5,
    targetMarginPercent: 15, discountValue: 0, installedPowerKWp: 5.5,
  });

  assert.equal(result.equipmentCost, 5000);
  assert.equal(result.fixedCosts, 5000);
  assert.ok(Math.abs(result.marginPercent - 15) < 0.0001);
  assert.ok(Math.abs(result.finalSalePrice - 14285.714285714286) < 0.0001);
});

test('desconto é limitado a metade do preço bruto na prévia', () => {
  const result = calculateCommercialPricing({
    equipmentItems: [{ id: 'one', description: 'Item', category: 'Outros', quantity: 1, unitCost: 1000 }],
    installationCost: 0, engineeringCost: 0, utilityFee: 0, freightCost: 0,
    otherCosts: 0, taxesPercent: 0, commissionPercent: 0, targetMarginPercent: 0,
    discountValue: 900, installedPowerKWp: 1,
  });
  assert.equal(result.discountValue, 500);
  assert.equal(result.finalSalePrice, 500);
});
