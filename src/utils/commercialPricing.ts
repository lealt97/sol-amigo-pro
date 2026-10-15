import { KitEquipmentItem } from '../types';

export interface CommercialPricingInput {
  equipmentItems: KitEquipmentItem[];
  installationCost: number;
  engineeringCost: number;
  utilityFee: number;
  freightCost: number;
  otherCosts: number;
  taxesPercent: number;
  commissionPercent: number;
  targetMarginPercent: number;
  discountValue: number;
  installedPowerKWp: number;
  additionalDirectCost?: number;
  additionalSaleValue?: number;
}

const nonNegative = (value: number) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export const calculateCommercialPricing = (input: CommercialPricingInput) => {
  const equipmentCost = input.equipmentItems.reduce(
    (sum, item) => sum + nonNegative(item.quantity) * nonNegative(item.unitCost),
    0
  );
  const fixedCosts = nonNegative(input.installationCost) + nonNegative(input.engineeringCost)
    + nonNegative(input.utilityFee) + nonNegative(input.freightCost) + nonNegative(input.otherCosts);
  const baseDirectCost = equipmentCost + fixedCosts;
  const additionalDirectCost = nonNegative(input.additionalDirectCost ?? 0);
  const additionalSaleValue = nonNegative(input.additionalSaleValue ?? 0);
  const directCost = baseDirectCost + additionalDirectCost;
  const deductionsPercent = nonNegative(input.taxesPercent) + nonNegative(input.commissionPercent)
    + nonNegative(input.targetMarginPercent);
  const invalidPercent = [input.taxesPercent, input.commissionPercent, input.targetMarginPercent].some(value => !Number.isFinite(value) || value < 0 || value > 100);
  const validationError = invalidPercent || deductionsPercent >= 100
    ? 'A soma de impostos, comissão e margem deve ser menor que 100%, com percentuais válidos.' : '';
  const divisor = 1 - deductionsPercent / 100;
  const baseGrossSalePrice = !validationError && baseDirectCost > 0 ? baseDirectCost / divisor : 0;
  const grossSalePrice = baseGrossSalePrice + additionalSaleValue;
  const discountValue = Math.min(nonNegative(input.discountValue), grossSalePrice * 0.5);
  const finalSalePrice = validationError ? 0 : Math.max(0, grossSalePrice - discountValue);
  const taxesValue = finalSalePrice * nonNegative(input.taxesPercent) / 100;
  const commissionValue = finalSalePrice * nonNegative(input.commissionPercent) / 100;
  const totalCost = directCost + taxesValue + commissionValue;
  const profit = finalSalePrice - totalCost;
  const marginPercent = finalSalePrice > 0 ? profit / finalSalePrice * 100 : 0;
  const installedPowerWp = nonNegative(input.installedPowerKWp) * 1000;

  return {
    validationError, equipmentCost, fixedCosts, additionalDirectCost, additionalSaleValue,
    grossSalePrice, discountValue, finalSalePrice,
    taxesValue, commissionValue, totalCost, profit, marginPercent,
    pricePerWp: installedPowerWp > 0 ? finalSalePrice / installedPowerWp : 0,
  };
};
