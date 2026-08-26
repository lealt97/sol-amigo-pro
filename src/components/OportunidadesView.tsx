import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Handshake,
  Plus,
  Search,
  Target,
  UserRound,
  Zap,
  X,
} from 'lucide-react';
import { Opportunity, OpportunityStage, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface OportunidadesViewProps {
  opportunities: Opportunity[];
  theme: ThemeConfig;
  onUpdateStage: (id: string, newStage: OpportunityStage) => void;
  onAddOpportunity: (opp: Opportunity) => void;
  onShowToast: (msg: string) => void;
}

const STAGES: Array<{ key: OpportunityStage; label: string }> = [
  { key: 'prospeccao', label: 'Prospecção inicial' },
  { key: 'visita_tecnica', label: 'Visita técnica / análise' },
  { key: 'proposta_enviada', label: 'Proposta enviada' },
  { key: 'negociacao', label: 'Em negociação' },
  { key: 'fechado', label: 'Fechado / ganho' },
];

const getStageLabel = (stage: OpportunityStage) =>
  STAGES.find((item) => item.key === stage)?.label ?? stage;

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) => {
  if (!value) return 'Não informado';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};

export const OportunidadesView: React.FC<OportunidadesViewProps> = ({
  opportunities,
  theme,
  onUpdateStage,
  onAddOpportunity,
  onShowToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'Todas' | OpportunityStage>('Todas');

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [value, setValue] = useState(0);
  const [systemPowerKWp, setSystemPowerKWp] = useState(0);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const panelStyle = {
    backgroundColor: panelBg,
    borderColor: theme.border,
    color: theme.text,
  };

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return opportunities.filter((opp) => {
      const matchesSearch =
        !normalized ||
        opp.title.toLowerCase().includes(normalized) ||
        opp.clientName.toLowerCase().includes(normalized) ||
        opp.assignedTo.toLowerCase().includes(normalized);
      const matchesStage = stageFilter === 'Todas' || opp.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [opportunities, search, stageFilter]);

  const metrics = useMemo(() => {
    const pipelineValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const negotiation = opportunities.filter((opp) => opp.stage === 'negociacao').length;
    const closed = opportunities.filter((opp) => opp.stage === 'fechado').length;
    return {
      total: opportunities.length,
      pipelineValue,
      negotiation,
      closed,
    };
  }, [opportunities]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setTitle('');
    setClientName('');
    setValue(0);
    setSystemPowerKWp(0);
    setExpectedCloseDate('');
    setAssignedTo('');
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !clientName.trim()) return;

    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: title.trim(),
      clientName: clientName.trim(),
      value: Number(value) || 0,
      stage: 'prospeccao',
      expectedCloseDate,
      systemPowerKWp: Number(systemPowerKWp) || 0,
      assignedTo: assignedTo.trim() || 'Não atribuído',
    };

    onAddOpportunity(newOpp);
    setExpandedIds((current) => new Set(current).add(newOpp.id));
    setModalOpen(false);
    resetForm();
    onShowToast(`Oportunidade “${newOpp.title}” criada com sucesso!`);
  };

  const stageColor = (stage: OpportunityStage) => {
    switch (stage) {
      case 'prospeccao':
        return theme.secondary;
      case 'visita_tecnica':
        return `color-mix(in srgb, ${theme.secondary} 55%, ${theme.accent})`;
      case 'proposta_enviada':
        return theme.primary;
      case 'negociacao':
        return theme.accent;
      case 'fechado':
        return `color-mix(in srgb, ${theme.accent} 58%, ${theme.primary})`;
      default:
        return theme.secondary;
    }
  };

  return (
    <div id="oportunidades-page" className="mx-auto max-w-[1480px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: mutedText }}
          >
            <Target className="h-4 w-4" />
            CRM · Gestão de oportunidades
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Oportunidades</h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: mutedText }}>
            Acompanhe cada negociação do primeiro contato até o fechamento, mantendo valor, potência, responsável e etapa comercial em um único lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-filled inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm"
          style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
        >
          <Plus className="h-4 w-4" />
          Nova oportunidade
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total de oportunidades', value: metrics.total, icon: Target },
          { label: 'Pipeline estimado', value: formatMoney(metrics.pipelineValue), icon: BadgeDollarSign },
          { label: 'Em negociação', value: metrics.negotiation, icon: Handshake },
          { label: 'Fechadas', value: metrics.closed, icon: CheckCircle2 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border p-4" style={panelStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p>
                  <p className="mt-2 truncate text-2xl font-extrabold">{metric.value}</p>
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
                    color: theme.secondary,
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border p-3" style={panelStyle}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: mutedText }}
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por oportunidade, cliente ou responsável..."
              className="h-10 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div className="flex h-10 items-center gap-2 rounded-lg border px-3" style={{ borderColor: theme.border }}>
            <Filter className="h-4 w-4" style={{ color: mutedText }} />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as 'Todas' | OpportunityStage)}
              className="bg-transparent text-sm outline-none"
              style={{ color: theme.text }}
            >
              <option value="Todas">Todas as etapas</option>
              {STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((opp) => {
            const expanded = expandedIds.has(opp.id);
            const tone = stageColor(opp.stage);

            return (
              <article
                key={opp.id}
                className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${expanded ? 'md:col-span-2 xl:col-span-3' : ''}`}
                style={{
                  borderColor: expanded
                    ? `color-mix(in srgb, ${theme.secondary} 58%, ${theme.border})`
                    : theme.border,
                  backgroundColor: expanded ? panelAltBg : panelBg,
                  boxShadow: expanded
                    ? `0 12px 30px color-mix(in srgb, ${theme.primary} 18%, transparent)`
                    : `0 4px 14px color-mix(in srgb, ${theme.primary} 8%, transparent)`,
                }}
              >
                <div className="h-1 w-full" style={{ backgroundColor: tone }} />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
                          color: theme.secondary,
                        }}
                      >
                        <Target className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-extrabold" title={opp.title}>{opp.title}</h2>
                        <p className="mt-1 truncate text-xs" style={{ color: mutedText }} title={opp.clientName}>
                          {opp.clientName}
                        </p>
                      </div>
                    </div>

                    <span
                      className="inline-flex max-w-[165px] shrink-0 truncate rounded-full border px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`,
                        borderColor: `color-mix(in srgb, ${tone} 42%, ${theme.border})`,
                        color: theme.text,
                      }}
                    >
                      {getStageLabel(opp.stage)}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: mutedText }}>
                      Valor estimado
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight">{formatMoney(opp.value)}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-2.5" style={{ borderColor: theme.border }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                      <p className="mt-2 text-[10px] font-semibold" style={{ color: mutedText }}>Potência</p>
                      <p className="mt-0.5 truncate text-xs font-bold">{opp.systemPowerKWp || 0} kWp</p>
                    </div>
                    <div className="rounded-lg border p-2.5" style={{ borderColor: theme.border }}>
                      <CalendarDays className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                      <p className="mt-2 text-[10px] font-semibold" style={{ color: mutedText }}>Fechamento</p>
                      <p className="mt-0.5 truncate text-xs font-bold">{formatDate(opp.expectedCloseDate)}</p>
                    </div>
                    <div className="rounded-lg border p-2.5" style={{ borderColor: theme.border }}>
                      <UserRound className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                      <p className="mt-2 text-[10px] font-semibold" style={{ color: mutedText }}>Responsável</p>
                      <p className="mt-0.5 truncate text-xs font-bold" title={opp.assignedTo}>{opp.assignedTo || 'Não atribuído'}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-3" style={{ borderColor: theme.border }}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(opp.id)}
                      aria-expanded={expanded}
                      className="btn-outline inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      {expanded ? 'Recolher detalhes' : 'Ver detalhes'}
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t p-4 md:p-5" style={{ borderColor: theme.border }}>
                    <div>
                      <h3 className="text-base font-extrabold">Detalhes da oportunidade</h3>
                      <p className="mt-1 text-xs" style={{ color: mutedText }}>
                        Visão comercial consolidada para acompanhamento da negociação.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: 'Cliente / empresa', value: opp.clientName, icon: UserRound },
                        { label: 'Responsável comercial', value: opp.assignedTo || 'Não atribuído', icon: UserRound },
                        { label: 'Potência prevista', value: `${opp.systemPowerKWp || 0} kWp`, icon: Zap },
                        { label: 'Previsão de fechamento', value: formatDate(opp.expectedCloseDate), icon: CalendarDays },
                      ].map((detail) => {
                        const Icon = detail.icon;
                        return (
                          <div
                            key={detail.label}
                            className="rounded-lg border p-3"
                            style={{ borderColor: theme.border, backgroundColor: panelBg }}
                          >
                            <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: mutedText }}>
                              <Icon className="h-3.5 w-3.5" />
                              {detail.label}
                            </div>
                            <p className="mt-2 truncate text-sm font-bold" title={detail.value}>{detail.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="mt-4 flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                      style={{ borderColor: theme.border, backgroundColor: panelBg }}
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <Clock3 className="h-4 w-4" style={{ color: theme.secondary }} />
                          Etapa comercial
                        </div>
                        <p className="mt-1 text-xs" style={{ color: mutedText }}>
                          Atualize a oportunidade conforme o avanço da negociação.
                        </p>
                      </div>

                      <select
                        value={opp.stage}
                        onChange={(event) => onUpdateStage(opp.id, event.target.value as OpportunityStage)}
                        className="h-10 min-w-[220px] rounded-lg border bg-transparent px-3 text-sm font-semibold outline-none"
                        style={{ borderColor: theme.border, color: theme.text }}
                      >
                        {STAGES.map((stage) => (
                          <option key={stage.key} value={stage.key}>{stage.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-xl border px-4 text-center" style={panelStyle}>
            <Target className="h-10 w-10" style={{ color: mutedText }} />
            <h3 className="mt-3 text-sm font-extrabold">Nenhuma oportunidade encontrada</h3>
            <p className="mt-1 text-xs" style={{ color: mutedText }}>
              Ajuste os filtros ou cadastre uma nova oportunidade.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: mutedText }}>
          <span>{filtered.length} de {opportunities.length} oportunidades</span>
          <span>Pipeline comercial</span>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
          >
            <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: theme.border }}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: mutedText }}>
                  CRM · Nova oportunidade
                </div>
                <h2 className="mt-1 text-xl font-extrabold">Cadastrar oportunidade</h2>
                <p className="mt-1 text-sm" style={{ color: mutedText }}>
                  Registre os dados essenciais para iniciar o acompanhamento comercial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-outline flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                style={{ borderColor: theme.border }}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Título da oportunidade</span>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Sistema solar residencial 10 kWp"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Cliente / empresa</span>
                  <input
                    required
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Nome do cliente ou empresa"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Valor estimado (R$)</span>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(event) => setValue(Number(event.target.value))}
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Potência estimada (kWp)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={systemPowerKWp}
                    onChange={(event) => setSystemPowerKWp(Number(event.target.value))}
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Responsável</span>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    placeholder="Responsável comercial"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Previsão de fechamento</span>
                  <input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(event) => setExpectedCloseDate(event.target.value)}
                    className="crm-input"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  style={{ borderColor: theme.border }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
                >
                  <Plus className="h-4 w-4" />
                  Criar oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
