import React from 'react';
import { CalendarClock, CheckCircle2, CircleDollarSign, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { MaintenancePlanSelection, ThemeConfig } from '../types';

interface ProposalWizardMaintenanceStepProps {
  theme: ThemeConfig;
  value: MaintenancePlanSelection;
  onChange: (value: MaintenancePlanSelection) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const DEFAULT_SERVICES = [
  'Limpeza técnica dos módulos',
  'Inspeção visual dos módulos',
  'Verificação de estrutura e fixadores',
  'Inspeção de cabos e conectores',
  'Verificação visual do inversor',
  'Relatório da visita',
];

const PLAN_OPTIONS: Array<{
  id: MaintenancePlanSelection['type'];
  title: string;
  description: string;
  frequencyMonths: number;
  visitsPerYear: number;
}> = [
  {
    id: 'none',
    title: 'Sem plano',
    description: 'A proposta seguirá sem manutenção contratada.',
    frequencyMonths: 0,
    visitsPerYear: 0,
  },
  {
    id: 'annual',
    title: 'Preventiva anual',
    description: 'Uma visita preventiva por ano.',
    frequencyMonths: 12,
    visitsPerYear: 1,
  },
  {
    id: 'semiannual',
    title: 'Preventiva semestral',
    description: 'Duas visitas preventivas por ano.',
    frequencyMonths: 6,
    visitsPerYear: 2,
  },
  {
    id: 'custom',
    title: 'Plano personalizado',
    description: 'Defina periodicidade, visitas e serviços.',
    frequencyMonths: 6,
    visitsPerYear: 2,
  },
];

export const ProposalWizardMaintenanceStep: React.FC<ProposalWizardMaintenanceStepProps> = ({
  theme,
  value,
  onChange,
}) => {
  const selectPlan = (type: MaintenancePlanSelection['type']) => {
    const option = PLAN_OPTIONS.find((item) => item.id === type)!;
    if (type === 'none') {
      onChange({
        enabled: false,
        type: 'none',
        name: 'Sem plano de manutenção',
        frequencyMonths: 0,
        visitsPerYear: 0,
        internalCostPerVisit: 0,
        annualPrice: 0,
        includedServices: [],
        notes: '',
      });
      return;
    }

    onChange({
      ...value,
      enabled: true,
      type,
      name: option.title,
      frequencyMonths: option.frequencyMonths,
      visitsPerYear: option.visitsPerYear,
      includedServices: value.includedServices.length > 0 ? value.includedServices : DEFAULT_SERVICES,
    });
  };

  const toggleService = (service: string) => {
    const exists = value.includedServices.includes(service);
    onChange({
      ...value,
      includedServices: exists
        ? value.includedServices.filter((item) => item !== service)
        : [...value.includedServices, service],
    });
  };

  const annualInternalCost = value.enabled
    ? Math.max(0, value.internalCostPerVisit) * Math.max(0, value.visitsPerYear)
    : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="border-b pb-3" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <span
            className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ borderColor: theme.border, color: theme.secondary }}
          >
            Serviço opcional
          </span>
          <span className="text-xs text-[var(--muted)]">Manutenção vinculada à proposta</span>
        </div>
        <h4 className="mt-1 flex items-center gap-2 text-lg font-bold">
          <Wrench className="h-5 w-5" style={{ color: theme.secondary }} />
          Plano de Manutenção Solar
        </h4>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Escolha se esta proposta incluirá manutenção preventiva. O plano será levado para o comercial e ficará preparado para o Pós-venda.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_OPTIONS.map((option) => {
          const active = value.type === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectPlan(option.id)}
              className="rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: active ? theme.secondary : theme.border,
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--secondary) 10%, var(--primary))'
                  : theme.primary,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">{option.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{option.description}</div>
                </div>
                {active && option.id !== 'none' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {value.enabled ? (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <CalendarClock className="h-4 w-4" style={{ color: theme.secondary }} />
                Periodicidade do plano
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Nome do plano</span>
                  <input
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Intervalo</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={value.frequencyMonths}
                      onChange={(e) => onChange({ ...value, frequencyMonths: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full rounded-lg border px-3 py-2 pr-16 text-sm font-semibold outline-none"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">meses</span>
                  </div>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Visitas por ano</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={value.visitsPerYear}
                    onChange={(e) => onChange({ ...value, visitsPerYear: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="h-4 w-4" style={{ color: theme.secondary }} />
                Serviços incluídos
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEFAULT_SERVICES.map((service) => {
                  const checked = value.includedServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold"
                      style={{
                        borderColor: checked ? theme.secondary : theme.border,
                        backgroundColor: checked
                          ? 'color-mix(in srgb, var(--secondary) 8%, var(--background))'
                          : theme.background,
                      }}
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded border"
                        style={{ borderColor: checked ? theme.secondary : theme.border }}
                      >
                        {checked && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: theme.secondary }} />}
                      </span>
                      <span>{service}</span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Observações do plano</span>
                <textarea
                  rows={3}
                  value={value.notes}
                  onChange={(e) => onChange({ ...value, notes: e.target.value })}
                  placeholder="Ex.: deslocamento incluso até 50 km, limpeza condicionada à segurança de acesso..."
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                />
              </label>
            </section>
          </div>

          <aside className="h-fit rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" style={{ color: theme.secondary }} />
              <div>
                <div className="text-sm font-bold">Comercial da manutenção</div>
                <div className="text-[10px] text-[var(--muted)]">Valores definidos por você</div>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Custo interno por visita</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">R$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={value.internalCostPerVisit}
                  onChange={(e) => onChange({ ...value, internalCostPerVisit: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm font-semibold outline-none"
                  style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                />
              </div>
            </label>

            <label className="mt-3 block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Preço anual ao cliente</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">R$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={value.annualPrice}
                  onChange={(e) => onChange({ ...value, annualPrice: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm font-semibold outline-none"
                  style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                />
              </div>
            </label>

            <div className="mt-4 space-y-2 rounded-xl border p-3 text-xs" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">Custo anual estimado</span>
                <strong>{money.format(annualInternalCost)}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">Venda anual</span>
                <strong>{money.format(value.annualPrice)}</strong>
              </div>
              <div className="flex justify-between gap-3 border-t pt-2" style={{ borderColor: theme.border }}>
                <span className="text-[var(--muted)]">Resultado bruto do serviço</span>
                <strong className={value.annualPrice - annualInternalCost >= 0 ? 'text-emerald-500' : 'text-amber-500'}>
                  {money.format(value.annualPrice - annualInternalCost)}
                </strong>
              </div>
            </div>

            <div className="mt-3 flex gap-2 rounded-lg border p-3 text-[11px]" style={{ borderColor: theme.border }}>
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
              Quando o sistema instalado for ativado no Pós-venda, este plano servirá de base para criar a periodicidade de manutenção.
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: theme.border }}>
          <Wrench className="mx-auto h-7 w-7 text-[var(--muted)]" />
          <div className="mt-2 text-sm font-bold">Proposta sem manutenção contratada</div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Você pode continuar normalmente ou selecionar um plano acima para adicioná-lo à proposta.
          </p>
        </div>
      )}
    </div>
  );
};
