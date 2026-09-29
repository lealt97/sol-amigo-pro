import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Plus, Receipt, Trash2, WalletCards } from 'lucide-react';
import {
  AdditionalProjectCost,
  OpportunityKitCosts,
  SolarKit,
  ThemeConfig,
} from '../types';
import { calculateCommercialPricing } from '../utils/commercialPricing';

interface ProposalWizardStep4CommercialProps {
  theme: ThemeConfig;
  installedPowerKWp: number;
  selectedKit: SolarKit | null;
  systemType: 'On-Grid' | 'Híbrido';
  onPricingChange: (pricing: OpportunityKitCosts) => void;
  onShowToast?: (message: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORY_OPTIONS: AdditionalProjectCost['category'][] = [
  'Obra civil',
  'Elétrica',
  'Estrutura',
  'Logística',
  'Equipamento',
  'Serviço',
  'Outros',
];

const clampPercent = (value: number) => Math.max(0, Math.min(90, Number(value) || 0));

export const ProposalWizardStep4Commercial: React.FC<ProposalWizardStep4CommercialProps> = ({
  theme,
  installedPowerKWp,
  selectedKit,
  systemType,
  onPricingChange,
  onShowToast,
}) => {
  const [equipmentCost, setEquipmentCost] = useState(
    selectedKit?.equipmentCost ?? Math.round(installedPowerKWp * 2200)
  );
  const [installationCost, setInstallationCost] = useState(
    selectedKit?.installationCost ?? Math.round(installedPowerKWp * 500)
  );
  const [engineeringCost, setEngineeringCost] = useState(selectedKit?.engineeringCost ?? 800);
  const [utilityFee, setUtilityFee] = useState(selectedKit?.utilityFee ?? 350);
  const [freightCost, setFreightCost] = useState(selectedKit?.freightCost ?? 500);
  const [taxesPercent, setTaxesPercent] = useState(selectedKit?.taxesPercent ?? 4.5);
  const [commissionPercent, setCommissionPercent] = useState(selectedKit?.commissionPercent ?? 5);
  const [targetMarginPercent, setTargetMarginPercent] = useState(selectedKit?.targetMarginPercent ?? 22);
  const [discountValue, setDiscountValue] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalProjectCost[]>([]);

  useEffect(() => {
    setEquipmentCost(selectedKit?.equipmentCost ?? Math.round(installedPowerKWp * 2200));
    setInstallationCost(selectedKit?.installationCost ?? Math.round(installedPowerKWp * 500));
    setEngineeringCost(selectedKit?.engineeringCost ?? 800);
    setUtilityFee(selectedKit?.utilityFee ?? 350);
    setFreightCost(selectedKit?.freightCost ?? 500);
    setTaxesPercent(selectedKit?.taxesPercent ?? 4.5);
    setCommissionPercent(selectedKit?.commissionPercent ?? 5);
    setTargetMarginPercent(selectedKit?.targetMarginPercent ?? 22);
  }, [selectedKit?.id, installedPowerKWp]);

  const additionalCostsTotal = useMemo(
    () => additionalCosts.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0),
    [additionalCosts]
  );

  const pricing = useMemo(() => {
    const result = calculateCommercialPricing({
      equipmentItems: [{
        id: 'equipment-base',
        description: selectedKit?.name || `Equipamentos principais ${systemType}`,
        category: 'Equipamentos',
        quantity: 1,
        unitCost: equipmentCost,
      }],
      installationCost,
      engineeringCost,
      utilityFee,
      freightCost,
      otherCosts: additionalCostsTotal,
      taxesPercent,
      commissionPercent,
      targetMarginPercent,
      discountValue,
      installedPowerKWp,
    });

    return {
      equipmentItems: [{
        id: 'equipment-base',
        description: selectedKit?.name || `Equipamentos principais ${systemType}`,
        category: 'Equipamentos',
        quantity: 1,
        unitCost: equipmentCost,
      }],
      installationCost,
      engineeringCost,
      utilityFee,
      freightCost,
      otherCosts: additionalCostsTotal,
      additionalCosts,
      taxesPercent,
      commissionPercent,
      targetMarginPercent,
      ...result,
      status: 'concluido' as const,
      updatedAt: new Date().toISOString(),
    } satisfies OpportunityKitCosts;
  }, [
    additionalCosts,
    additionalCostsTotal,
    commissionPercent,
    discountValue,
    engineeringCost,
    equipmentCost,
    freightCost,
    installationCost,
    installedPowerKWp,
    selectedKit,
    systemType,
    targetMarginPercent,
    taxesPercent,
    utilityFee,
  ]);

  useEffect(() => {
    onPricingChange(pricing);
  }, [pricing, onPricingChange]);

  const addAdditionalCost = () => {
    setAdditionalCosts((current) => [
      ...current,
      {
        id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: '',
        category: 'Serviço',
        value: 0,
      },
    ]);
  };

  const updateAdditionalCost = (id: string, patch: Partial<AdditionalProjectCost>) => {
    setAdditionalCosts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeAdditionalCost = (id: string) => {
    setAdditionalCosts((current) => current.filter((item) => item.id !== id));
  };

  const deductionsPercent = taxesPercent + commissionPercent + targetMarginPercent;
  const marginBelowTarget = pricing.marginPercent + 0.01 < targetMarginPercent;
  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-[var(--secondary)]';

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: theme.border, color: theme.secondary }}>
              Etapa Comercial
            </span>
            <span className="text-xs text-[var(--muted)]">Custos, margem e preço de venda</span>
          </div>
          <h4 className="mt-1 flex items-center gap-2 text-lg font-bold">
            <Calculator className="h-5 w-5" style={{ color: theme.secondary }} />
            Custos & Margem do Projeto
          </h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Cadastre os custos reais do projeto. Serviços fora do escopo padrão, como pedreiro para fiação embutida, entram em custos adicionais.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Receipt className="h-4 w-4" style={{ color: theme.secondary }} />
              Custos base do projeto
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['Equipamentos', equipmentCost, setEquipmentCost],
                ['Instalação elétrica', installationCost, setInstallationCost],
                ['Engenharia / projeto', engineeringCost, setEngineeringCost],
                ['Taxa concessionária', utilityFee, setUtilityFee],
                ['Frete / logística', freightCost, setFreightCost],
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{String(label)}</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={Number(value)}
                      onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(0, Number(e.target.value) || 0))}
                      className={`${inputClass} pl-9`}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">Custos adicionais do projeto</div>
                <p className="text-[11px] text-[var(--muted)]">Obra civil, adequação elétrica, andaime, plataforma, reforço estrutural, deslocamento e outros extras.</p>
              </div>
              <button
                type="button"
                onClick={addAdditionalCost}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                style={{ backgroundColor: theme.secondary, color: '#fff' }}
              >
                <Plus className="h-4 w-4" /> Adicionar custo
              </button>
            </div>

            {additionalCosts.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAdditionalCosts([{
                    id: `extra-${Date.now()}`,
                    description: 'Pedreiro — passagem de fiação embutida',
                    category: 'Obra civil',
                    value: 1200,
                  }]);
                  onShowToast?.('Exemplo de custo adicional inserido. Ajuste o valor conforme o orçamento real.');
                }}
                className="w-full rounded-xl border border-dashed p-5 text-left text-xs text-[var(--muted)]"
                style={{ borderColor: theme.border }}
              >
                Nenhum custo adicional. Clique aqui para inserir um exemplo de <strong className="text-[var(--text)]">pedreiro para fiação embutida</strong>.
              </button>
            ) : (
              <div className="space-y-2">
                {additionalCosts.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_150px_150px_40px]" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <input
                      value={item.description}
                      onChange={(e) => updateAdditionalCost(item.id, { description: e.target.value })}
                      placeholder="Descrição do serviço ou material adicional"
                      className={inputClass}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                    <select
                      value={item.category}
                      onChange={(e) => updateAdditionalCost(item.id, { category: e.target.value as AdditionalProjectCost['category'] })}
                      className={inputClass}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    >
                      {CATEGORY_OPTIONS.map((category) => <option key={category}>{category}</option>)}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.value}
                      onChange={(e) => updateAdditionalCost(item.id, { value: Math.max(0, Number(e.target.value) || 0) })}
                      className={inputClass}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                    <button type="button" onClick={() => removeAdditionalCost(item.id)} className="btn-delete flex h-10 items-center justify-center rounded-lg" title="Remover custo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end text-xs font-bold">
                  Extras: {money.format(additionalCostsTotal)}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="mb-3 text-sm font-bold">Impostos, comissão, margem e desconto</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Impostos', taxesPercent, setTaxesPercent],
                ['Comissão', commissionPercent, setCommissionPercent],
                ['Margem alvo', targetMarginPercent, setTargetMarginPercent],
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{String(label)}</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      step="0.1"
                      value={Number(value)}
                      onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(clampPercent(Number(e.target.value)))}
                      className={`${inputClass} pr-8`}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">%</span>
                  </div>
                </label>
              ))}
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Desconto comercial</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputClass} pl-9`}
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </label>
            </div>
            {deductionsPercent >= 95 && (
              <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                A soma de impostos, comissão e margem está muito alta. Revise os percentuais antes de emitir a proposta.
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border p-4 lg:sticky lg:top-0" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="mb-4 flex items-center gap-2">
            <WalletCards className="h-5 w-5" style={{ color: theme.secondary }} />
            <div>
              <div className="text-sm font-bold">Resumo comercial</div>
              <div className="text-[10px] text-[var(--muted)]">Atualização em tempo real</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Equipamentos</span><strong>{money.format(pricing.equipmentCost)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Custos fixos + extras</span><strong>{money.format(pricing.fixedCosts)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Impostos</span><strong>{money.format(pricing.taxesValue)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Comissão</span><strong>{money.format(pricing.commissionValue)}</strong></div>
            <div className="border-t pt-2" style={{ borderColor: theme.border }} />
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Custo total</span><strong>{money.format(pricing.totalCost)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Preço antes do desconto</span><strong>{money.format(pricing.grossSalePrice)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Desconto</span><strong>- {money.format(pricing.discountValue)}</strong></div>
          </div>

          <div className="mt-4 rounded-xl border p-4 text-center" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Preço final de venda</div>
            <div className="mt-1 text-2xl font-black" style={{ color: theme.secondary }}>{money.format(pricing.finalSalePrice)}</div>
            <div className="mt-1 text-[10px] text-[var(--muted)]">{money.format(pricing.pricePerWp)} / Wp</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
              <div className="text-[10px] uppercase text-[var(--muted)]">Lucro estimado</div>
              <div className="mt-1 text-sm font-black text-emerald-500">{money.format(pricing.profit)}</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
              <div className="text-[10px] uppercase text-[var(--muted)]">Margem real</div>
              <div className={`mt-1 text-sm font-black ${marginBelowTarget ? 'text-amber-500' : 'text-emerald-500'}`}>
                {pricing.marginPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {marginBelowTarget && (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Margem real abaixo da meta de {targetMarginPercent.toFixed(1)}%, principalmente por causa do desconto aplicado.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
