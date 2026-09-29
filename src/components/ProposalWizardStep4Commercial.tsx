import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Package, Plus, Trash2, WalletCards } from 'lucide-react';
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
  const selectedKitEquipmentCost = useMemo(() => {
    if (!selectedKit) return 0;
    const direct = Math.max(0, Number(selectedKit.equipmentCost) || 0);
    if (direct > 0) return direct;
    return (selectedKit.items || []).reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.product?.unitCost) || 0),
      0
    );
  }, [selectedKit]);

  const selectedKitBaseCosts = useMemo(() => ({
    equipmentCost: selectedKitEquipmentCost,
    installationCost: Math.max(0, Number(selectedKit?.installationCost) || 0),
    engineeringCost: Math.max(0, Number(selectedKit?.engineeringCost) || 0),
    utilityFee: Math.max(0, Number(selectedKit?.utilityFee) || 0),
    freightCost: Math.max(0, Number(selectedKit?.freightCost) || 0),
    otherCosts: Math.max(0, Number(selectedKit?.otherCosts) || 0),
  }), [selectedKit, selectedKitEquipmentCost]);

  const [taxesPercent, setTaxesPercent] = useState(selectedKit?.taxesPercent ?? 0);
  const [commissionPercent, setCommissionPercent] = useState(selectedKit?.commissionPercent ?? 0);
  const [targetMarginPercent, setTargetMarginPercent] = useState(selectedKit?.targetMarginPercent ?? 0);
  const [discountValue, setDiscountValue] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalProjectCost[]>([]);

  useEffect(() => {
    setTaxesPercent(selectedKit?.taxesPercent ?? 0);
    setCommissionPercent(selectedKit?.commissionPercent ?? 0);
    setTargetMarginPercent(selectedKit?.targetMarginPercent ?? 0);
    setDiscountValue(0);
  }, [selectedKit?.id]);

  const additionalCostsTotal = useMemo(
    () => additionalCosts.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0),
    [additionalCosts]
  );

  const pricing = useMemo(() => {
    const result = calculateCommercialPricing({
      equipmentItems: selectedKit ? [{
        id: 'equipment-base',
        description: selectedKit.name,
        category: 'Kit solar',
        quantity: 1,
        unitCost: selectedKitBaseCosts.equipmentCost,
      }] : [],
      installationCost: selectedKitBaseCosts.installationCost,
      engineeringCost: selectedKitBaseCosts.engineeringCost,
      utilityFee: selectedKitBaseCosts.utilityFee,
      freightCost: selectedKitBaseCosts.freightCost,
      otherCosts: selectedKitBaseCosts.otherCosts + additionalCostsTotal,
      taxesPercent,
      commissionPercent,
      targetMarginPercent,
      discountValue,
      installedPowerKWp,
    });

    return {
      equipmentItems: selectedKit ? [{
        id: 'equipment-base',
        description: selectedKit.name,
        category: 'Kit solar',
        quantity: 1,
        unitCost: selectedKitBaseCosts.equipmentCost,
      }] : [],
      installationCost: selectedKitBaseCosts.installationCost,
      engineeringCost: selectedKitBaseCosts.engineeringCost,
      utilityFee: selectedKitBaseCosts.utilityFee,
      freightCost: selectedKitBaseCosts.freightCost,
      otherCosts: selectedKitBaseCosts.otherCosts + additionalCostsTotal,
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
    installedPowerKWp,
    selectedKit,
    selectedKitBaseCosts,
    targetMarginPercent,
    taxesPercent,
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
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Package className="mt-0.5 h-4 w-4" style={{ color: theme.secondary }} />
                <div>
                  <div className="text-sm font-bold">Kit selecionado no Dimensionamento</div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    O custo do kit vem automaticamente da etapa Dimensionamento & Kits e entra direto na margem.
                  </p>
                </div>
              </div>
              {selectedKit && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold text-emerald-500" style={{ borderColor: theme.border }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizado
                </span>
              )}
            </div>

            {selectedKit ? (
              <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-[var(--text)]">{selectedKit.name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {selectedKit.sku ? `${selectedKit.sku} • ` : ''}
                      {(selectedKit.powerKWp || selectedKit.maxPowerKWp || installedPowerKWp).toFixed(2)} kWp • {selectedKit.systemType}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold uppercase text-[var(--muted)]">Custo base utilizado</div>
                    <div className="text-lg font-black" style={{ color: theme.secondary }}>
                      {money.format(
                        selectedKitBaseCosts.equipmentCost +
                        selectedKitBaseCosts.installationCost +
                        selectedKitBaseCosts.engineeringCost +
                        selectedKitBaseCosts.utilityFee +
                        selectedKitBaseCosts.freightCost +
                        selectedKitBaseCosts.otherCosts
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)] sm:grid-cols-3">
                  <span>Equipamentos: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.equipmentCost)}</strong></span>
                  <span>Instalação: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.installationCost)}</strong></span>
                  <span>Engenharia: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.engineeringCost)}</strong></span>
                  <span>Concessionária: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.utilityFee)}</strong></span>
                  <span>Frete: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.freightCost)}</strong></span>
                  <span>Outros do kit: <strong className="text-[var(--text)]">{money.format(selectedKitBaseCosts.otherCosts)}</strong></span>
                </div>
                {selectedKitBaseCosts.equipmentCost <= 0 && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Este kit não possui custo de equipamentos cadastrado. Atualize o kit na aba Kits para calcular a margem corretamente.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Nenhum kit foi selecionado. Volte para “Dimensionamento & Kits” e escolha um kit; ele será trazido automaticamente para esta etapa.
              </div>
            )}
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">Custos adicionais do projeto</div>
                <p className="text-[11px] text-[var(--muted)]">Adicione somente o que não estiver incluído no kit: pedreiro, eletroduto extra, adequação elétrica, andaime, reforço estrutural, deslocamento etc.</p>
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
              <div className="rounded-xl border border-dashed p-5 text-center text-xs text-[var(--muted)]" style={{ borderColor: theme.border }}>
                Nenhum custo adicional incluído. Use <strong className="text-[var(--text)]">+ Adicionar custo</strong> somente quando houver algo fora do kit selecionado.
              </div>
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

          {!selectedKit ? (
            <div className="rounded-xl border border-dashed p-4 text-center text-xs text-[var(--muted)]" style={{ borderColor: theme.border }}>
              Selecione um kit em <strong className="text-[var(--text)]">Dimensionamento & Kits</strong> para iniciar o resumo comercial.
            </div>
          ) : (
            <>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--muted)]">Kit selecionado</span>
                  <strong>{money.format(
                    selectedKitBaseCosts.equipmentCost +
                    selectedKitBaseCosts.installationCost +
                    selectedKitBaseCosts.engineeringCost +
                    selectedKitBaseCosts.utilityFee +
                    selectedKitBaseCosts.freightCost +
                    selectedKitBaseCosts.otherCosts
                  )}</strong>
                </div>

                {additionalCosts.filter((item) => Number(item.value) > 0).map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-[var(--muted)]" title={item.description || item.category}>
                      {item.description || item.category}
                    </span>
                    <strong className="shrink-0">{money.format(item.value)}</strong>
                  </div>
                ))}

                {pricing.taxesValue > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">Impostos ({taxesPercent.toFixed(1)}%)</span>
                    <strong>{money.format(pricing.taxesValue)}</strong>
                  </div>
                )}

                {pricing.commissionValue > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">Comissão ({commissionPercent.toFixed(1)}%)</span>
                    <strong>{money.format(pricing.commissionValue)}</strong>
                  </div>
                )}

                <div className="border-t pt-2" style={{ borderColor: theme.border }} />
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--muted)]">Custo total</span>
                  <strong>{money.format(pricing.totalCost)}</strong>
                </div>

                {pricing.grossSalePrice > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">Preço antes do desconto</span>
                    <strong>{money.format(pricing.grossSalePrice)}</strong>
                  </div>
                )}

                {pricing.discountValue > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--muted)]">Desconto</span>
                    <strong>- {money.format(pricing.discountValue)}</strong>
                  </div>
                )}
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
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
