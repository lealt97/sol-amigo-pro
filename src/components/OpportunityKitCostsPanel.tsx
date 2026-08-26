import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  Percent,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  WandSparkles,
  Wrench,
} from 'lucide-react';
import {
  KitEquipmentItem,
  Opportunity,
  OpportunityKitCosts,
  SolarProduct,
  ThemeConfig,
} from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface OpportunityKitCostsPanelProps {
  opportunity: Opportunity;
  products: SolarProduct[];
  theme: ThemeConfig;
  panelBg: string;
  panelAltBg: string;
  mutedText: string;
  onUpdateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  onUpdateStage: (id: string, stage: Opportunity['stage']) => void;
  onShowToast: (message: string) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const number = (value: number, decimals = 0) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));

const calculateKitCosts = (
  opportunity: Opportunity,
  base: Partial<OpportunityKitCosts> = {}
): OpportunityKitCosts => {
  const equipmentItems = base.equipmentItems ?? [];
  const installationCost = Math.max(0, Number(base.installationCost ?? 0));
  const engineeringCost = Math.max(0, Number(base.engineeringCost ?? 0));
  const utilityFee = Math.max(0, Number(base.utilityFee ?? 0));
  const freightCost = Math.max(0, Number(base.freightCost ?? 0));
  const otherCosts = Math.max(0, Number(base.otherCosts ?? 0));
  const taxesPercent = Math.max(0, Number(base.taxesPercent ?? 0));
  const commissionPercent = Math.max(0, Number(base.commissionPercent ?? 0));
  const grossSalePrice = Math.max(0, Number(base.grossSalePrice ?? 0));
  const discountValue = Math.max(0, Number(base.discountValue ?? 0));

  const equipmentCost = equipmentItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)) * Math.max(0, Number(item.unitCost || 0)),
    0
  );
  const fixedCosts = installationCost + engineeringCost + utilityFee + freightCost + otherCosts;
  const finalSalePrice = Math.max(0, grossSalePrice - discountValue);
  const taxesValue = finalSalePrice * (taxesPercent / 100);
  const commissionValue = finalSalePrice * (commissionPercent / 100);
  const totalCost = equipmentCost + fixedCosts + taxesValue + commissionValue;
  const profit = finalSalePrice - totalCost;
  const marginPercent = finalSalePrice > 0 ? (profit / finalSalePrice) * 100 : 0;
  const pricePerWp = opportunity.systemPowerKWp > 0
    ? finalSalePrice / (opportunity.systemPowerKWp * 1000)
    : 0;

  return {
    equipmentItems,
    installationCost,
    engineeringCost,
    utilityFee,
    freightCost,
    otherCosts,
    taxesPercent,
    commissionPercent,
    grossSalePrice,
    discountValue,
    equipmentCost,
    fixedCosts,
    taxesValue,
    commissionValue,
    totalCost,
    finalSalePrice,
    profit,
    marginPercent,
    pricePerWp,
    status: base.status ?? 'rascunho',
    updatedAt: new Date().toISOString(),
  };
};

const productQuantityForSizing = (product: SolarProduct, opportunity: Opportunity) => {
  const sizing = opportunity.sizing;
  if (!sizing) return 1;

  if (product.category === 'Módulo FV') return Math.max(1, sizing.modulesCount);
  if (product.category === 'Estrutura') return Math.max(1, Math.ceil(sizing.modulesCount / 4));
  if (product.category === 'Microinversor' && Number(product.powerW || 0) > 0) {
    return Math.max(1, Math.ceil((sizing.installedPowerKWp * 1000) / Number(product.powerW)));
  }
  return 1;
};

export const OpportunityKitCostsPanel: React.FC<OpportunityKitCostsPanelProps> = ({
  opportunity,
  products,
  theme,
  panelBg,
  panelAltBg,
  mutedText,
  onUpdateOpportunity,
  onUpdateStage,
  onShowToast,
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const kit = calculateKitCosts(opportunity, opportunity.kitCosts);
  const sizingReady = opportunity.sizing?.status === 'concluido' && opportunity.systemPowerKWp > 0;

  const ready = Boolean(
    sizingReady &&
      kit.equipmentItems.length > 0 &&
      kit.equipmentCost > 0 &&
      kit.finalSalePrice > 0 &&
      kit.profit > 0 &&
      kit.marginPercent > 0
  );

  const availableProducts = useMemo(
    () => products.filter((product) => product.inStock > 0),
    [products]
  );

  const persist = (changes: Partial<OpportunityKitCosts>) => {
    const next = calculateKitCosts(opportunity, {
      ...kit,
      ...changes,
      status: 'rascunho',
    });

    onUpdateOpportunity(opportunity.id, {
      kitCosts: next,
      value: next.finalSalePrice,
    });
  };

  const addProduct = (product: SolarProduct, quantity?: number) => {
    const existing = kit.equipmentItems.find((item) => item.productId === product.id);
    if (existing) {
      persist({
        equipmentItems: kit.equipmentItems.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + (quantity ?? productQuantityForSizing(product, opportunity)) }
            : item
        ),
      });
      return;
    }

    const item: KitEquipmentItem = {
      id: `kit-item-${Date.now()}-${product.id}`,
      productId: product.id,
      description: product.name,
      category: product.category,
      quantity: quantity ?? productQuantityForSizing(product, opportunity),
      unitCost: product.unitPrice,
    };

    persist({ equipmentItems: [...kit.equipmentItems, item] });
  };

  const addSelectedProduct = () => {
    const product = products.find((item) => item.id === selectedProductId);
    if (!product) {
      onShowToast('Selecione um produto do catálogo.');
      return;
    }
    addProduct(product);
    setSelectedProductId('');
  };

  const generateSuggestedKit = () => {
    if (!opportunity.sizing) return;

    const modules = products.filter((product) => product.category === 'Módulo FV' && product.inStock > 0);
    const module = [...modules].sort(
      (a, b) =>
        Math.abs(Number(a.powerW || 0) - opportunity.sizing!.modulePowerW) -
        Math.abs(Number(b.powerW || 0) - opportunity.sizing!.modulePowerW)
    )[0];

    const inverterTargetW = opportunity.sizing.installedPowerKWp * 1000;
    const inverters = products
      .filter((product) => product.category === 'Inversor' && product.inStock > 0 && Number(product.powerW || 0) > 0)
      .sort((a, b) => Number(a.powerW || 0) - Number(b.powerW || 0));
    const inverter = inverters.find((product) => Number(product.powerW || 0) >= inverterTargetW) ?? inverters.at(-1);
    const structure = products.find((product) => product.category === 'Estrutura' && product.inStock > 0);

    const suggested: KitEquipmentItem[] = [];
    if (module) {
      suggested.push({
        id: `kit-suggested-${module.id}`,
        productId: module.id,
        description: module.name,
        category: module.category,
        quantity: Math.max(1, opportunity.sizing.modulesCount),
        unitCost: module.unitPrice,
      });
    }
    if (inverter) {
      suggested.push({
        id: `kit-suggested-${inverter.id}`,
        productId: inverter.id,
        description: inverter.name,
        category: inverter.category,
        quantity: 1,
        unitCost: inverter.unitPrice,
      });
    }
    if (structure) {
      suggested.push({
        id: `kit-suggested-${structure.id}`,
        productId: structure.id,
        description: structure.name,
        category: structure.category,
        quantity: Math.max(1, Math.ceil(opportunity.sizing.modulesCount / 4)),
        unitCost: structure.unitPrice,
      });
    }

    if (suggested.length === 0) {
      onShowToast('Não há produtos disponíveis no catálogo para sugerir o kit.');
      return;
    }

    persist({ equipmentItems: suggested });
    onShowToast('Kit sugerido a partir do dimensionamento. Revise equipamentos e custos.');
  };

  const updateEquipment = (id: string, changes: Partial<KitEquipmentItem>) => {
    persist({
      equipmentItems: kit.equipmentItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    });
  };

  const removeEquipment = (id: string) => {
    persist({ equipmentItems: kit.equipmentItems.filter((item) => item.id !== id) });
  };

  const saveDraft = () => {
    const next = calculateKitCosts(opportunity, {
      ...kit,
      status: opportunity.kitCosts?.status === 'concluido' ? 'concluido' : 'rascunho',
    });
    onUpdateOpportunity(opportunity.id, { kitCosts: next, value: next.finalSalePrice });
    onShowToast('Kit e formação de preço salvos na oportunidade.');
  };

  const completeAndAdvance = () => {
    if (!ready) {
      onShowToast('Revise o kit, o preço de venda e a margem antes de avançar.');
      return;
    }

    const next = calculateKitCosts(opportunity, { ...kit, status: 'concluido' });
    onUpdateOpportunity(opportunity.id, { kitCosts: next, value: next.finalSalePrice });
    onUpdateStage(opportunity.id, 'proposta');
    onShowToast('Kit & Custos concluído. Próxima etapa: Proposta.');
  };

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: opportunity.stage === 'kit_custos' ? theme.secondary : theme.border,
        backgroundColor: panelAltBg,
      }}
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
          >
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold">5. Kit & Custos</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: mutedText }}>
              Monte os equipamentos do sistema, registre os custos da operação e forme o preço antes de gerar a proposta.
            </p>
          </div>
        </div>
        <span
          className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ borderColor: theme.border, color: kit.status === 'concluido' ? theme.accent : theme.secondary }}
        >
          {kit.status === 'concluido' ? 'Concluído' : 'Em formação'}
        </span>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Sistema dimensionado</div>
              <div className="mt-1 text-lg font-extrabold">{number(opportunity.systemPowerKWp, 2)} kWp</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Módulos calculados</div>
              <div className="mt-1 text-lg font-extrabold">{opportunity.sizing?.modulesCount ?? 0}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Geração mensal</div>
              <div className="mt-1 text-lg font-extrabold">{number(opportunity.sizing?.estimatedMonthlyGenerationKWh ?? 0)} kWh</div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-sm font-extrabold">Equipamentos do kit</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>
                  Use o catálogo de Produtos ou monte o kit sugerido automaticamente pelo dimensionamento.
                </p>
              </div>
              <button
                type="button"
                onClick={generateSuggestedKit}
                className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                style={{ borderColor: theme.border }}
              >
                <WandSparkles className="h-4 w-4" />
                Montar kit sugerido
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="crm-input flex-1"
              >
                <option value="">Selecione um produto do catálogo</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.category} · {product.name} · {money(product.unitPrice)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSelectedProduct}
                className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
                style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
              >
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {kit.equipmentItems.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-xl border p-3 lg:grid-cols-[minmax(0,1fr)_110px_150px_130px_38px] lg:items-end" style={{ borderColor: theme.border }}>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>{item.category}</div>
                    <div className="mt-1 truncate text-sm font-extrabold">{item.description}</div>
                  </div>
                  <label className="block text-[11px] font-semibold">
                    <span className="mb-1 block" style={{ color: mutedText }}>Quantidade</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity || ''}
                      onChange={(event) => updateEquipment(item.id, { quantity: Math.max(0, Number(event.target.value) || 0) })}
                      className="crm-input"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold">
                    <span className="mb-1 block" style={{ color: mutedText }}>Custo unitário</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost || ''}
                      onChange={(event) => updateEquipment(item.id, { unitCost: Math.max(0, Number(event.target.value) || 0) })}
                      className="crm-input"
                    />
                  </label>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold" style={{ color: mutedText }}>Subtotal</div>
                    <div className="flex h-10 items-center text-sm font-extrabold">{money(item.quantity * item.unitCost)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEquipment(item.id)}
                    className="btn-outline flex h-10 w-10 items-center justify-center rounded-lg border"
                    style={{ borderColor: theme.border }}
                    aria-label="Remover equipamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {kit.equipmentItems.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: theme.border, color: mutedText }}>
                  <ShoppingCart className="mx-auto h-6 w-6" />
                  <p className="mt-2 text-xs font-bold">Nenhum equipamento adicionado</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
              <div>
                <h4 className="text-sm font-extrabold">Custos complementares</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>Inclua os custos que não fazem parte diretamente do catálogo de equipamentos.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['Instalação / mão de obra', 'installationCost'],
                ['Projeto / engenharia', 'engineeringCost'],
                ['Taxas / concessionária', 'utilityFee'],
                ['Frete / logística', 'freightCost'],
                ['Outros custos', 'otherCosts'],
              ].map(([label, field]) => (
                <label key={field} className="block text-sm font-semibold">
                  <span className="mb-2 block">{label}</span>
                  <div className="relative">
                    <BadgeDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={Number(kit[field as keyof OpportunityKitCosts] || 0) || ''}
                      onChange={(event) => persist({ [field]: Math.max(0, Number(event.target.value) || 0) } as Partial<OpportunityKitCosts>)}
                      placeholder="0,00"
                      className="crm-input pl-9"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex items-start gap-3">
              <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
              <div>
                <h4 className="text-sm font-extrabold">Formação do preço</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>Informe preço, desconto, impostos e comissão. Lucro e margem são calculados automaticamente.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Preço de venda bruto</span>
                <input type="number" min="0" step="100" value={kit.grossSalePrice || ''} onChange={(event) => persist({ grossSalePrice: Math.max(0, Number(event.target.value) || 0) })} className="crm-input" />
              </label>
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Desconto</span>
                <input type="number" min="0" step="10" value={kit.discountValue || ''} onChange={(event) => persist({ discountValue: Math.max(0, Number(event.target.value) || 0) })} className="crm-input" />
              </label>
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Impostos (%)</span>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                  <input type="number" min="0" step="0.1" value={kit.taxesPercent || ''} onChange={(event) => persist({ taxesPercent: Math.max(0, Number(event.target.value) || 0) })} className="crm-input pl-9" />
                </div>
              </label>
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Comissão (%)</span>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                  <input type="number" min="0" step="0.1" value={kit.commissionPercent || ''} onChange={(event) => persist({ commissionPercent: Math.max(0, Number(event.target.value) || 0) })} className="crm-input pl-9" />
                </div>
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Resumo de custos</h4>
            <div className="mt-4 space-y-2 text-xs">
              {[
                ['Equipamentos', kit.equipmentCost],
                ['Custos complementares', kit.fixedCosts],
                ['Impostos', kit.taxesValue],
                ['Comissão', kit.commissionValue],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3 border-b py-2" style={{ borderColor: theme.border }}>
                  <span style={{ color: mutedText }}>{label}</span>
                  <strong>{money(Number(value))}</strong>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-2 text-sm">
                <strong>Custo total</strong>
                <strong>{money(kit.totalCost)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Resultado comercial</h4>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Preço final ao cliente</div>
                <div className="mt-1 text-xl font-extrabold">{money(kit.finalSalePrice)}</div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Lucro estimado</div>
                <div className="mt-1 text-xl font-extrabold" style={{ color: kit.profit > 0 ? theme.accent : '#ef4444' }}>{money(kit.profit)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <div className="text-[10px]" style={{ color: mutedText }}>Margem</div>
                  <div className="mt-1 text-base font-extrabold">{number(kit.marginPercent, 1)}%</div>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <div className="text-[10px]" style={{ color: mutedText }}>Preço/Wp</div>
                  <div className="mt-1 text-base font-extrabold">{money(kit.pricePerWp)}</div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: ready ? `color-mix(in srgb, ${theme.accent} 60%, ${theme.border})` : theme.border,
              backgroundColor: ready ? `color-mix(in srgb, ${theme.accent} 8%, ${panelBg})` : panelBg,
            }}
          >
            <div className="flex items-center gap-2">
              {ready ? <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent }} /> : <PackageCheck className="h-4 w-4" style={{ color: theme.secondary }} />}
              <p className="text-xs font-extrabold">{ready ? 'Pronto para proposta' : 'Formação incompleta'}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>
              {ready
                ? 'O kit possui equipamentos e a venda apresenta lucro positivo. Os dados podem alimentar a proposta.'
                : 'Adicione equipamentos e informe um preço de venda que resulte em margem positiva.'}
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={saveDraft}
          className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold"
          style={{ borderColor: theme.border }}
        >
          <Save className="h-4 w-4" />
          Salvar Kit & Custos
        </button>

        {opportunity.stage === 'kit_custos' && (
          <button
            type="button"
            onClick={completeAndAdvance}
            disabled={!ready}
            className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
            style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary), opacity: ready ? 1 : 0.45 }}
          >
            Concluir e gerar proposta
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
