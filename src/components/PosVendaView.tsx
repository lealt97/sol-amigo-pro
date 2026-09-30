import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { MaintenancePlanSelection, PageKey, ThemeConfig } from '../types';
import {
  addMaintenancePlan,
  deleteMaintenancePlan,
  getStoredMaintenancePlans,
  restoreDefaultMaintenancePlans,
  updateMaintenancePlan,
} from '../data/maintenancePlans';

interface PosVendaViewProps {
  theme: ThemeConfig;
  onNavigate?: (page: PageKey, filter?: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const SERVICES = [
  'Limpeza técnica dos módulos',
  'Inspeção visual dos módulos',
  'Verificação de estrutura e fixadores',
  'Inspeção de cabos e conectores',
  'Verificação visual do inversor',
  'Inspeção das proteções CC/CA',
  'Verificação de aterramento',
  'Relatório da visita',
];

const blankPlan = (): MaintenancePlanSelection => ({
  enabled: true,
  active: true,
  type: 'custom',
  planType: 'Preventiva',
  name: '',
  code: '',
  frequencyMonths: 6,
  visitsPerYear: 2,
  internalCostPerVisit: 0,
  annualPrice: 0,
  includedServices: [
    'Limpeza técnica dos módulos',
    'Inspeção visual dos módulos',
    'Verificação de estrutura e fixadores',
    'Inspeção de cabos e conectores',
    'Verificação visual do inversor',
    'Relatório da visita',
  ],
  notes: '',
});

export const PosVendaView: React.FC<PosVendaViewProps> = ({ theme }) => {
  const [plans, setPlans] = useState<MaintenancePlanSelection[]>(() => getStoredMaintenancePlans());
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<MaintenancePlanSelection>(blankPlan());

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    if (!q) return plans;
    return plans.filter((plan) =>
      [plan.name, plan.code, plan.planType, plan.notes, ...plan.includedServices]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(q))
    );
  }, [plans, search]);

  const activeCount = plans.filter((plan) => plan.active !== false).length;
  const avgTicket = activeCount > 0
    ? plans.filter((plan) => plan.active !== false).reduce((sum, plan) => sum + plan.annualPrice, 0) / activeCount
    : 0;
  const avgMargin = activeCount > 0
    ? plans.filter((plan) => plan.active !== false).reduce((sum, plan) => {
        const cost = plan.internalCostPerVisit * plan.visitsPerYear;
        return sum + (plan.annualPrice > 0 ? ((plan.annualPrice - cost) / plan.annualPrice) * 100 : 0);
      }, 0) / activeCount
    : 0;

  const openNew = () => {
    setEditing(blankPlan());
    setShowEditor(true);
  };

  const openEdit = (plan: MaintenancePlanSelection) => {
    setEditing({ ...plan, includedServices: [...plan.includedServices] });
    setShowEditor(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing.name.trim()) return;
    const payload: MaintenancePlanSelection = {
      ...editing,
      enabled: true,
      active: editing.active !== false,
      name: editing.name.trim(),
      code: editing.code?.trim() || undefined,
      frequencyMonths: Math.max(1, Number(editing.frequencyMonths) || 1),
      visitsPerYear: Math.max(1, Number(editing.visitsPerYear) || 1),
      internalCostPerVisit: Math.max(0, Number(editing.internalCostPerVisit) || 0),
      annualPrice: Math.max(0, Number(editing.annualPrice) || 0),
    };

    if (payload.id) updateMaintenancePlan(payload);
    else addMaintenancePlan(payload);
    setPlans(getStoredMaintenancePlans());
    setShowEditor(false);
  };

  const toggleActive = (plan: MaintenancePlanSelection) => {
    updateMaintenancePlan({ ...plan, active: plan.active === false });
    setPlans(getStoredMaintenancePlans());
  };

  const remove = (plan: MaintenancePlanSelection) => {
    if (!plan.id) return;
    if (!window.confirm(`Excluir o plano "${plan.name}" do catálogo?`)) return;
    deleteMaintenancePlan(plan.id);
    setPlans(getStoredMaintenancePlans());
  };

  const toggleService = (service: string) => {
    setEditing((current) => ({
      ...current,
      includedServices: current.includedServices.includes(service)
        ? current.includedServices.filter((item) => item !== service)
        : [...current.includedServices, service],
    }));
  };

  return (
    <div id="pos-venda-page" className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: theme.border }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dim)]">Pós-venda</div>
          <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Planos de Manutenção</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Cadastre planos reutilizáveis de limpeza e manutenção fotovoltaica. Eles ficam disponíveis junto aos Kits durante o dimensionamento da proposta.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm"
          style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
        >
          <Plus className="h-4 w-4" />
          Novo plano
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Planos cadastrados', value: `${activeCount} ativos (${plans.length} total)`, Icon: Wrench },
          { label: 'Ticket anual médio', value: money.format(avgTicket), Icon: CircleDollarSign },
          { label: 'Margem bruta média', value: `${avgMargin.toFixed(1)}%`, Icon: CheckCircle2 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted)]">{label}</span>
              <Icon className="h-4 w-4" style={{ color: theme.secondary }} />
            </div>
            <div className="mt-2 text-xl font-black text-[var(--text)]">{String(value)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código, tipo ou serviço..."
            className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-4 text-sm outline-none focus:border-[var(--secondary)]"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const defaults = restoreDefaultMaintenancePlans();
            setPlans([...defaults]);
          }}
          className="btn-outline inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold"
          style={{ borderColor: theme.border }}
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar modelos
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: theme.border }}>
          <Wrench className="mx-auto h-9 w-9 text-[var(--muted)]" />
          <h3 className="mt-3 text-base font-bold text-[var(--text)]">Nenhum plano encontrado</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Crie um plano para disponibilizá-lo no dimensionamento das propostas.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
          >
            <Plus className="h-4 w-4" /> Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plan) => {
            const annualCost = plan.internalCostPerVisit * plan.visitsPerYear;
            const profit = plan.annualPrice - annualCost;
            const margin = plan.annualPrice > 0 ? (profit / plan.annualPrice) * 100 : 0;
            return (
              <article key={plan.id || plan.code || plan.name} className="rounded-2xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: theme.border, color: theme.secondary }}>
                        {plan.planType || 'Manutenção'}
                      </span>
                      <span className={`text-[10px] font-bold ${plan.active === false ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {plan.active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-black text-[var(--text)]">{plan.name}</h3>
                    <div className="mt-1 text-[10px] font-mono text-[var(--muted)]">{plan.code || 'SEM-CÓDIGO'}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg border text-[var(--dim)] hover:text-[var(--secondary)] hover:border-[var(--secondary)]/40 transition-colors cursor-pointer flex items-center justify-center"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                      title="Editar plano"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      data-delete-btn="true"
                      onClick={() => remove(plan)}
                      className="btn-delete p-1.5 rounded-lg border text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors cursor-pointer flex items-center justify-center"
                      style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}
                      title="Excluir plano"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="text-[10px] uppercase text-[var(--muted)]">Periodicidade</div>
                    <div className="mt-1 font-bold">A cada {plan.frequencyMonths} meses</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="text-[10px] uppercase text-[var(--muted)]">Visitas / ano</div>
                    <div className="mt-1 font-bold">{plan.visitsPerYear}</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="text-[10px] uppercase text-[var(--muted)]">Custo anual</div>
                    <div className="mt-1 font-bold">{money.format(annualCost)}</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="text-[10px] uppercase text-[var(--muted)]">Preço anual</div>
                    <div className="mt-1 font-black text-emerald-500">{money.format(plan.annualPrice)}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">Margem bruta do plano</span>
                  <strong className={margin >= 0 ? 'text-emerald-500' : 'text-amber-500'}>{margin.toFixed(1)}%</strong>
                </div>

                <div className="mt-3 border-t pt-3" style={{ borderColor: theme.border }}>
                  <div className="text-[10px] font-bold uppercase text-[var(--muted)]">Serviços incluídos</div>
                  <div className="mt-2 space-y-1">
                    {plan.includedServices.slice(0, 4).map((service) => (
                      <div key={service} className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="truncate">{service}</span>
                      </div>
                    ))}
                    {plan.includedServices.length > 4 && (
                      <div className="text-[10px] font-bold" style={{ color: theme.secondary }}>+ {plan.includedServices.length - 4} serviço(s)</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleActive(plan)}
                  className="mt-4 w-full rounded-lg border px-3 py-2 text-xs font-bold"
                  style={{ borderColor: theme.border }}
                >
                  {plan.active === false ? 'Ativar plano' : 'Desativar plano'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: theme.border }}>
              <div>
                <h3 className="text-lg font-black text-[var(--text)]">{editing.id ? 'Editar plano de manutenção' : 'Novo plano de manutenção'}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Cadastre uma vez e reutilize o plano em qualquer proposta.</p>
              </div>
              <button type="button" onClick={() => setShowEditor(false)} className="rounded-lg p-1.5"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Nome do plano *</span>
                  <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Código</span>
                  <input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="MAN-SEM-01" className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Tipo</span>
                  <select value={editing.planType || 'Preventiva'} onChange={(e) => setEditing({ ...editing, planType: e.target.value as MaintenancePlanSelection['planType'] })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    {['Limpeza', 'Preventiva', 'Inspeção', 'Completa', 'Personalizada'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Periodicidade (meses)</span>
                  <input type="number" min="1" max="36" value={editing.frequencyMonths} onChange={(e) => setEditing({ ...editing, frequencyMonths: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Visitas por ano</span>
                  <input type="number" min="1" max="12" value={editing.visitsPerYear} onChange={(e) => setEditing({ ...editing, visitsPerYear: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Custo interno por visita</span>
                  <input type="number" min="0" step="10" value={editing.internalCostPerVisit} onChange={(e) => setEditing({ ...editing, internalCostPerVisit: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Preço anual ao cliente</span>
                  <input type="number" min="0" step="10" value={editing.annualPrice} onChange={(e) => setEditing({ ...editing, annualPrice: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-[var(--muted)]">Serviços incluídos</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {SERVICES.map((service) => {
                    const selected = editing.includedServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs"
                        style={{
                          borderColor: selected ? theme.secondary : theme.border,
                          backgroundColor: selected ? 'color-mix(in srgb, var(--secondary) 8%, var(--background))' : theme.background,
                        }}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${selected ? '' : 'opacity-25'}`} style={{ color: selected ? theme.secondary : theme.text }} />
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Observações</span>
                <textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="w-full resize-none rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
              </label>

              <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: theme.border }}>
                <button type="button" onClick={() => setShowEditor(false)} className="btn-cancel px-4 py-2 text-xs font-bold">Cancelar</button>
                <button type="submit" className="rounded-xl px-4 py-2 text-xs font-bold" style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}>Salvar plano</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
