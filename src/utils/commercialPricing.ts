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
}

const nonNegative = (value: number) => Math.max(0, Number(value) || 0);

export const calculateCommercialPricing = (input: CommercialPricingInput) => {
  const equipmentCost = input.equipmentItems.reduce(
    (sum, item) => sum + nonNegative(item.quantity) * nonNegative(item.unitCost),
    0
  );
  const fixedCosts = nonNegative(input.installationCost) + nonNegative(input.engineeringCost)
    + nonNegative(input.utilityFee) + nonNegative(input.freightCost) + nonNegative(input.otherCosts);
  const directCost = equipmentCost + fixedCosts;
  const deductionsPercent = nonNegative(input.taxesPercent) + nonNegative(input.commissionPercent)
    + nonNegative(input.targetMarginPercent);
  const divisor = Math.max(0.05, 1 - deductionsPercent / 100);
  const grossSalePrice = directCost > 0 ? directCost / divisor : 0;
  const discountValue = Math.min(nonNegative(input.discountValue), grossSalePrice * 0.5);
  const finalSalePrice = Math.max(0, grossSalePrice - discountValue);
  const taxesValue = finalSalePrice * nonNegative(input.taxesPercent) / 100;
  const commissionValue = finalSalePrice * nonNegative(input.commissionPercent) / 100;
  const totalCost = directCost + taxesValue + commissionValue;
  const profit = finalSalePrice - totalCost;
  const marginPercent = finalSalePrice > 0 ? profit / finalSalePrice * 100 : 0;
  const installedPowerWp = nonNegative(input.installedPowerKWp) * 1000;

  return {
    equipmentCost, fixedCosts, grossSalePrice, discountValue, finalSalePrice,
    taxesValue, commissionValue, totalCost, profit, marginPercent,
    pricePerWp: installedPowerWp > 0 ? finalSalePrice / installedPowerWp : 0,
  };
};
