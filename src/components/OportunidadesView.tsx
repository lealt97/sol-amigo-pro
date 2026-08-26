import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  GripVertical,
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<OpportunityStage | null>(null);

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

  const handleDragStart = (event: React.DragEvent<HTMLElement>, opp: Opportunity) => {
    setDraggedId(opp.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', opp.id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropStage(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>, stage: OpportunityStage) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggedId;
    const opp = opportunities.find((item) => item.id === id);

    setDropStage(null);
    setDraggedId(null);

    if (!opp || opp.stage === stage) return;

    onUpdateStage(opp.id, stage);
    onShowToast(`Oportunidade movida para “${getStageLabel(stage)}”`);
  };

  return (
    <div id="oportunidades-page" className="mx-auto max-w-[1600px] space-y-5" style={{ color: theme.text }}>
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
            Organize o funil comercial por etapas e arraste cada oportunidade para avançar ou retornar no processo de venda.
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

      <div className="overflow-x-auto pb-2">
        <section className="grid min-w-[1500px] grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const tone = stageColor(stage.key);
            const items = filtered.filter((opp) => opp.stage === stage.key);
            const total = items.reduce((sum, opp) => sum + (opp.value || 0), 0);
            const isDropTarget = dropStage === stage.key && draggedId !== null;

            return (
              <div
                key={stage.key}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDropStage(stage.key);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDropStage((current) => current === stage.key ? null : current);
                  }
                }}
                onDrop={(event) => handleDrop(event, stage.key)}
                className="flex min-h-[560px] min-w-0 flex-col rounded-xl border p-3 transition-all"
                style={{
                  backgroundColor: isDropTarget
                    ? `color-mix(in srgb, ${theme.secondary} 13%, ${panelBg})`
                    : panelBg,
                  borderColor: isDropTarget ? theme.secondary : theme.border,
                  boxShadow: isDropTarget
                    ? `0 0 0 2px color-mix(in srgb, ${theme.secondary} 28%, transparent)`
                    : 'none',
                }}
              >
                <div className="mb-3 border-b pb-3" style={{ borderColor: theme.border }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                        <h2 className="truncate text-sm font-extrabold" title={stage.label}>{stage.label}</h2>
                      </div>
                      <p className="mt-1 text-[11px]" style={{ color: mutedText }}>
                        {formatMoney(total)} no estágio
                      </p>
                    </div>
                    <span
                      className="flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-extrabold"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      {items.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((opp) => {
                    const expanded = expandedIds.has(opp.id);
                    const isDragging = draggedId === opp.id;

                    return (
                      <article
                        key={opp.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, opp)}
                        onDragEnd={handleDragEnd}
                        className="overflow-hidden rounded-xl border transition-all"
                        style={{
                          backgroundColor: expanded ? panelAltBg : panelBg,
                          borderColor: expanded
                            ? `color-mix(in srgb, ${theme.secondary} 55%, ${theme.border})`
                            : theme.border,
                          opacity: isDragging ? 0.45 : 1,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          boxShadow: expanded
                            ? `0 8px 22px color-mix(in srgb, ${theme.primary} 16%, transparent)`
                            : `0 3px 10px color-mix(in srgb, ${theme.primary} 8%, transparent)`,
                        }}
                      >
                        <div className="h-1 w-full" style={{ backgroundColor: tone }} />

                        <div className="p-3.5">
                          <div className="flex items-start gap-2.5">
                            <div
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
                                color: theme.secondary,
                              }}
                              title="Arraste este card"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-extrabold" title={opp.title}>{opp.title}</h3>
                              <p className="mt-1 truncate text-xs" style={{ color: mutedText }} title={opp.clientName}>
                                {opp.clientName}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: mutedText }}>
                              Valor estimado
                            </p>
                            <p className="mt-1 text-xl font-extrabold tracking-tight">{formatMoney(opp.value)}</p>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border p-2" style={{ borderColor: theme.border }}>
                              <Zap className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                              <p className="mt-1.5 text-[10px]" style={{ color: mutedText }}>Potência</p>
                              <p className="mt-0.5 truncate text-xs font-bold">{opp.systemPowerKWp || 0} kWp</p>
                            </div>
                            <div className="rounded-lg border p-2" style={{ borderColor: theme.border }}>
                              <CalendarDays className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                              <p className="mt-1.5 text-[10px]" style={{ color: mutedText }}>Fechamento</p>
                              <p className="mt-0.5 truncate text-xs font-bold">{formatDate(opp.expectedCloseDate)}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                            <UserRound className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate" title={opp.assignedTo}>{opp.assignedTo || 'Não atribuído'}</span>
                          </div>

                          <div className="mt-3 border-t pt-3" style={{ borderColor: theme.border }}>
                            <button
                              type="button"
                              draggable={false}
                              onClick={() => toggleExpanded(opp.id)}
                              className="btn-outline inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold"
                              style={{ borderColor: theme.border, color: theme.text }}
                            >
                              {expanded ? 'Recolher detalhes' : 'Ver detalhes'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t p-3.5" style={{ borderColor: theme.border }}>
                            <h4 className="text-sm font-extrabold">Detalhes</h4>
                            <p className="mt-1 text-[11px]" style={{ color: mutedText }}>
                              Dados comerciais desta oportunidade.
                            </p>

                            <div className="mt-3 space-y-2">
                              <div className="rounded-lg border p-2.5" style={{ borderColor: theme.border }}>
                                <p className="text-[10px] font-semibold" style={{ color: mutedText }}>Responsável comercial</p>
                                <p className="mt-1 truncate text-xs font-bold" title={opp.assignedTo}>{opp.assignedTo || 'Não atribuído'}</p>
                              </div>
                              <div className="rounded-lg border p-2.5" style={{ borderColor: theme.border }}>
                                <p className="text-[10px] font-semibold" style={{ color: mutedText }}>Previsão de fechamento</p>
                                <p className="mt-1 text-xs font-bold">{formatDate(opp.expectedCloseDate)}</p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold">
                                <Clock3 className="h-3.5 w-3.5" style={{ color: theme.secondary }} />
                                Etapa comercial
                              </div>
                              <select
                                value={opp.stage}
                                onChange={(event) => onUpdateStage(opp.id, event.target.value as OpportunityStage)}
                                className="h-9 w-full rounded-lg border bg-transparent px-2.5 text-xs font-semibold outline-none"
                                style={{ borderColor: theme.border, color: theme.text }}
                              >
                                {STAGES.map((item) => (
                                  <option key={item.key} value={item.key}>{item.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {items.length === 0 && (
                    <div
                      className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center"
                      style={{
                        borderColor: isDropTarget ? theme.secondary : theme.border,
                        color: mutedText,
                      }}
                    >
                      <Target className="h-6 w-6" />
                      <p className="mt-2 text-xs font-semibold">
                        {isDropTarget ? 'Solte o card aqui' : 'Nenhuma oportunidade'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: mutedText }}>
        <span>{filtered.length} de {opportunities.length} oportunidades</span>
        <span>Arraste os cards entre as colunas para alterar a etapa</span>
      </div>

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
