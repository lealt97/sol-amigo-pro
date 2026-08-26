import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  FileText,
  Mail,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Target,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { Opportunity, OpportunityStage, ThemeConfig } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { getContrastFg } from '../utils/themeEngine';
import { OpportunityQualificationPanel } from './OpportunityQualificationPanel';
import { OpportunityEnergySurveyPanel } from './OpportunityEnergySurveyPanel';
import { OpportunitySizingPanel } from './OpportunitySizingPanel';
import { OpportunityKitCostsPanel } from './OpportunityKitCostsPanel';

interface OportunidadesViewProps {
  opportunities: Opportunity[];
  theme: ThemeConfig;
  onUpdateStage: (id: string, newStage: OpportunityStage) => void;
  onUpdateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  onAddOpportunity: (opp: Opportunity) => void;
  onShowToast: (msg: string) => void;
}

type FlowStage = Exclude<
  OpportunityStage,
  'perdido' | 'prospeccao' | 'visita_tecnica' | 'proposta_enviada'
>;

const FLOW: Array<{
  key: FlowStage;
  label: string;
  short: string;
  description: string;
  icon: React.ElementType;
}> = [
  { key: 'lead', label: 'Cliente / Lead', short: 'Lead', description: 'Contato e origem da oportunidade.', icon: UserRound },
  { key: 'qualificacao', label: 'Qualificação', short: 'Qualificação', description: 'Entender necessidade, interesse e potencial da venda.', icon: ClipboardCheck },
  { key: 'levantamento', label: 'Levantamento', short: 'Levantamento', description: 'Conta de energia, consumo médio ou levantamento detalhado.', icon: WalletCards },
  { key: 'dimensionamento', label: 'Dimensionamento FV', short: 'Dimensionamento', description: 'Potência, geração e solução fotovoltaica recomendada.', icon: Zap },
  { key: 'kit_custos', label: 'Kit & Custos', short: 'Kit & Custos', description: 'Equipamentos, custos, preço, margem e lucro.', icon: PackageCheck },
  { key: 'proposta', label: 'Proposta', short: 'Proposta', description: 'Proposta técnica e comercial gerada a partir dos dados anteriores.', icon: FileText },
  { key: 'negociacao', label: 'Negociação', short: 'Negociação', description: 'Follow-up, condições comerciais e decisão do cliente.', icon: UsersRound },
  { key: 'fechado', label: 'Fechamento', short: 'Fechamento', description: 'Venda ganha e pronta para contrato e operação.', icon: CheckCircle2 },
];

const getFlowIndex = (stage: OpportunityStage) => {
  if (stage === 'prospeccao') return 0;
  if (stage === 'visita_tecnica') return 2;
  if (stage === 'proposta_enviada') return 5;
  return FLOW.findIndex((item) => item.key === stage);
};

const getStageLabel = (stage: OpportunityStage) => {
  if (stage === 'perdido') return 'Perdida';
  return FLOW.find((item) => item.key === stage)?.label ?? 'Etapa em migração';
};

const formatDate = (value: string) => {
  if (!value) return 'Sem previsão';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR');
};

export const OportunidadesView: React.FC<OportunidadesViewProps> = ({
  opportunities,
  theme,
  onUpdateStage,
  onUpdateOpportunity,
  onAddOpportunity,
  onShowToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [source, setSource] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = useMemo(
    () =>
      opportunities.filter((opp) =>
        !normalizedSearch ||
        opp.title.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        opp.clientName.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        opp.assignedTo.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      ),
    [opportunities, normalizedSearch]
  );

  const selected = opportunities.find((item) => item.id === selectedId) ?? null;
  const selectedIndex = selected ? Math.max(0, getFlowIndex(selected.stage)) : -1;

  const metrics = useMemo(() => {
    const closed = opportunities.filter((item) => item.stage === 'fechado').length;
    const lost = opportunities.filter((item) => item.stage === 'perdido').length;
    const negotiation = opportunities.filter((item) => item.stage === 'negociacao').length;
    const open = opportunities.length - closed - lost;
    return { open, negotiation, closed, lost };
  }, [opportunities]);

  const resetForm = () => {
    setTitle('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setSource('');
    setAssignedTo('');
    setExpectedCloseDate('');
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !clientName.trim()) return;

    const opportunity: Opportunity = {
      id: `opp-${Date.now()}`,
      title: title.trim(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      source: source.trim() || undefined,
      value: 0,
      stage: 'lead',
      expectedCloseDate,
      systemPowerKWp: 0,
      assignedTo: assignedTo.trim() || 'Não atribuído',
      createdAt: new Date().toISOString(),
    };

    onAddOpportunity(opportunity);
    setSelectedId(opportunity.id);
    setModalOpen(false);
    resetForm();
    onShowToast('Oportunidade criada. O fluxo comercial foi iniciado.');
  };

  const moveToStage = (stage: OpportunityStage) => {
    if (!selected) return;

    if (stage === 'levantamento' && selected.qualification?.status !== 'qualificado') {
      onShowToast('Conclua e aprove a qualificação antes de iniciar o levantamento.');
      return;
    }

    if (stage === 'kit_custos' && selected.sizing?.status !== 'concluido') {
      onShowToast('Conclua o dimensionamento fotovoltaico antes de montar o kit e os custos.');
      return;
    }

    if (stage === 'proposta' && selected.kitCosts?.status !== 'concluido') {
      onShowToast('Conclua Kit & Custos antes de gerar a proposta.');
      return;
    }

    onUpdateStage(selected.id, stage);
    onShowToast(`Oportunidade movida para “${getStageLabel(stage)}”.`);
  };

  const advance = () => {
    if (!selected || selected.stage === 'perdido') return;
    const currentIndex = Math.max(0, getFlowIndex(selected.stage));
    const next = FLOW[currentIndex + 1];
    if (!next) return;
    moveToStage(next.key);
  };

  const canAdvance = Boolean(
    selected &&
      selected.stage !== 'perdido' &&
      selected.stage !== 'qualificacao' &&
      selected.stage !== 'levantamento' &&
      selected.stage !== 'dimensionamento' &&
      selected.stage !== 'kit_custos' &&
      selectedIndex < FLOW.length - 1
  );

  return (
    <div id="oportunidades-page" className="mx-auto max-w-[1580px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: mutedText }}>
            <Target className="h-4 w-4" />
            Comercial · Fluxo principal
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Oportunidades</h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: mutedText }}>
            A oportunidade é o centro da venda. Cada etapa complementa os mesmos dados até o fechamento.
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
          { label: 'Em aberto', value: metrics.open, icon: CircleDot },
          { label: 'Em negociação', value: metrics.negotiation, icon: UsersRound },
          { label: 'Vendas ganhas', value: metrics.closed, icon: CheckCircle2 },
          { label: 'Perdidas', value: metrics.lost, icon: X },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p>
                  <p className="mt-2 text-2xl font-extrabold">{metric.value}</p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border p-3" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
        <div className="overflow-x-auto">
          <div className="flex min-w-[1100px] items-stretch gap-2">
            {FLOW.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <React.Fragment key={stage.key}>
                  <div className="min-w-[120px] flex-1 rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-extrabold"
                        style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
                      >
                        {index + 1}
                      </div>
                      <Icon className="h-4 w-4" style={{ color: mutedText }} />
                    </div>
                    <p className="mt-2 text-xs font-extrabold">{stage.short}</p>
                  </div>
                  {index < FLOW.length - 1 && <div className="flex items-center" style={{ color: mutedText }}><ChevronRight className="h-4 w-4" /></div>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
          <div className="border-b p-3" style={{ borderColor: theme.border }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar oportunidade ou contato..."
                className="crm-input pl-9"
              />
            </div>
          </div>

          <div className="max-h-[820px] space-y-2 overflow-y-auto p-3">
            {filtered.map((opp) => {
              const active = selectedId === opp.id;
              return (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => setSelectedId(opp.id)}
                  className="w-full rounded-xl border p-3 text-left transition-all"
                  style={{
                    borderColor: active ? theme.secondary : theme.border,
                    backgroundColor: active ? `color-mix(in srgb, ${theme.secondary} 12%, ${panelAltBg})` : panelAltBg,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{opp.title}</p>
                      <p className="mt-1 truncate text-xs" style={{ color: mutedText }}>{opp.clientName}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: active ? theme.secondary : mutedText }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-1 text-[10px] font-bold"
                      style={{ borderColor: opp.stage === 'perdido' ? '#ef4444' : theme.border, color: opp.stage === 'perdido' ? '#ef4444' : theme.secondary }}
                    >
                      {getStageLabel(opp.stage)}
                    </span>
                    <span className="text-[10px]" style={{ color: mutedText }}>{opp.assignedTo}</span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: theme.border, color: mutedText }}>
                <Target className="mx-auto h-7 w-7" />
                <p className="mt-3 text-sm font-bold">Nenhuma oportunidade</p>
                <p className="mt-1 text-xs">Crie a primeira oportunidade para iniciar o fluxo.</p>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[560px] overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
          {!selected ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center" style={{ color: mutedText }}>
              <Target className="h-10 w-10" />
              <h2 className="mt-4 text-lg font-extrabold" style={{ color: theme.text }}>Ficha central da oportunidade</h2>
              <p className="mt-2 max-w-lg text-sm">Selecione uma oportunidade. Toda a venda será organizada dentro dela.</p>
            </div>
          ) : (
            <>
              <div className="border-b p-5" style={{ borderColor: theme.border }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                        style={{ borderColor: theme.border, color: selected.stage === 'perdido' ? '#ef4444' : theme.secondary }}
                      >
                        {getStageLabel(selected.stage)}
                      </span>
                      <span className="text-xs" style={{ color: mutedText }}>
                        Criada em {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('pt-BR') : 'hoje'}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-extrabold md:text-2xl">{selected.title}</h2>
                    <p className="mt-1 text-sm" style={{ color: mutedText }}>{selected.clientName}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selected.stage !== 'perdido' && selected.stage !== 'fechado' && (
                      <button type="button" onClick={() => moveToStage('perdido')} className="btn-outline h-9 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: theme.border }}>
                        Marcar perdida
                      </button>
                    )}
                    {canAdvance && (
                      <button
                        type="button"
                        onClick={advance}
                        className="btn-filled inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold"
                        style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
                      >
                        Avançar etapa <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Telefone', value: selected.clientPhone || 'Não informado', icon: Phone },
                    { label: 'E-mail', value: selected.clientEmail || 'Não informado', icon: Mail },
                    { label: 'Responsável', value: selected.assignedTo, icon: UserRound },
                    { label: 'Fechamento previsto', value: formatDate(selected.expectedCloseDate), icon: CalendarDays },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                        <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}><Icon className="h-3.5 w-3.5" /> {item.label}</div>
                        <p className="mt-1 truncate text-sm font-bold">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5 p-5">
                {(selected.stage === 'qualificacao' || selected.qualification) && (
                  <OpportunityQualificationPanel
                    opportunity={selected}
                    theme={theme}
                    panelBg={panelBg}
                    panelAltBg={panelAltBg}
                    mutedText={mutedText}
                    onUpdateOpportunity={onUpdateOpportunity}
                    onUpdateStage={onUpdateStage}
                    onShowToast={onShowToast}
                  />
                )}

                {(selected.stage === 'levantamento' || selected.energySurvey) && (
                  <OpportunityEnergySurveyPanel
                    opportunity={selected}
                    theme={theme}
                    panelBg={panelBg}
                    panelAltBg={panelAltBg}
                    mutedText={mutedText}
                    onUpdateOpportunity={onUpdateOpportunity}
                    onUpdateStage={onUpdateStage}
                    onShowToast={onShowToast}
                  />
                )}

                {(selected.stage === 'dimensionamento' || selected.sizing) && (
                  <OpportunitySizingPanel
                    opportunity={selected}
                    theme={theme}
                    panelBg={panelBg}
                    panelAltBg={panelAltBg}
                    mutedText={mutedText}
                    onUpdateOpportunity={onUpdateOpportunity}
                    onUpdateStage={onUpdateStage}
                    onShowToast={onShowToast}
                  />
                )}

                {(selected.stage === 'kit_custos' || selected.kitCosts) && (
                  <OpportunityKitCostsPanel
                    opportunity={selected}
                    products={INITIAL_PRODUCTS}
                    theme={theme}
                    panelBg={panelBg}
                    panelAltBg={panelAltBg}
                    mutedText={mutedText}
                    onUpdateOpportunity={onUpdateOpportunity}
                    onUpdateStage={onUpdateStage}
                    onShowToast={onShowToast}
                  />
                )}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold">Fluxo da oportunidade</h3>
                    <p className="mt-1 text-xs" style={{ color: mutedText }}>Cada etapa usa e complementa os dados anteriores.</p>
                  </div>
                  {selected.source && (
                    <span className="rounded-full border px-3 py-1 text-[10px] font-bold" style={{ borderColor: theme.border, color: mutedText }}>
                      Origem: {selected.source}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {FLOW.map((stage, index) => {
                    const Icon = stage.icon;
                    const currentIndex = selected.stage === 'perdido' ? -1 : selectedIndex;
                    const isCurrent = selected.stage === stage.key;
                    const completed = currentIndex > index;
                    const baseAvailable = currentIndex >= index - 1 && selected.stage !== 'perdido';
                    const qualificationBlocks = stage.key === 'levantamento' && selected.qualification?.status !== 'qualificado' && currentIndex < index;
                    const sizingBlocks = stage.key === 'kit_custos' && selected.sizing?.status !== 'concluido' && currentIndex < index;
                    const kitBlocks = stage.key === 'proposta' && selected.kitCosts?.status !== 'concluido' && currentIndex < index;
                    const available = baseAvailable && !qualificationBlocks && !sizingBlocks && !kitBlocks;

                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled={!available && !completed && !isCurrent}
                        onClick={() => available || completed || isCurrent ? moveToStage(stage.key) : undefined}
                        className="rounded-xl border p-4 text-left"
                        style={{
                          borderColor: isCurrent ? theme.secondary : theme.border,
                          backgroundColor: isCurrent ? `color-mix(in srgb, ${theme.secondary} 10%, ${panelAltBg})` : panelAltBg,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: completed ? `color-mix(in srgb, ${theme.accent} 22%, transparent)` : `color-mix(in srgb, ${theme.secondary} 16%, transparent)`,
                                color: completed ? theme.accent : theme.secondary,
                              }}
                            >
                              {completed ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <Icon className="h-[18px] w-[18px]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-extrabold">{index + 1}. {stage.label}</p>
                                {isCurrent && (
                                  <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>ETAPA ATUAL</span>
                                )}
                                {completed && !isCurrent && <span className="text-[9px] font-bold" style={{ color: theme.accent }}>CONCLUÍDA</span>}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed" style={{ color: mutedText }}>{stage.description}</p>
                              {qualificationBlocks && <p className="mt-2 text-[10px] font-bold" style={{ color: theme.secondary }}>Bloqueado até concluir a qualificação.</p>}
                              {sizingBlocks && <p className="mt-2 text-[10px] font-bold" style={{ color: theme.secondary }}>Bloqueado até concluir o dimensionamento.</p>}
                              {kitBlocks && <p className="mt-2 text-[10px] font-bold" style={{ color: theme.secondary }}>Bloqueado até concluir Kit & Custos.</p>}
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0" style={{ color: mutedText }} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selected.stage === 'perdido' && (
                  <div className="rounded-xl border p-4" style={{ borderColor: '#ef444455', backgroundColor: 'color-mix(in srgb, #ef4444 8%, transparent)' }}>
                    <p className="text-sm font-extrabold">Oportunidade perdida</p>
                    <p className="mt-1 text-xs" style={{ color: mutedText }}>O histórico foi preservado. A oportunidade pode ser reaberta caso a negociação retorne.</p>
                    <button type="button" onClick={() => moveToStage('lead')} className="btn-outline mt-3 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>
                      Reabrir oportunidade
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: theme.border }}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: mutedText }}>Início do fluxo comercial</div>
                <h2 className="mt-1 text-xl font-extrabold">Nova oportunidade</h2>
                <p className="mt-1 text-sm" style={{ color: mutedText }}>O contato nasce dentro da oportunidade e os demais dados são adicionados conforme a venda avança.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="btn-outline flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: theme.border }} aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Título da oportunidade</span>
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Sistema FV residência João Silva" className="crm-input" />
                </label>
                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Nome do contato / cliente</span>
                  <input required value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome da pessoa ou empresa" className="crm-input" />
                </label>
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Telefone</span>
                  <input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="(00) 00000-0000" className="crm-input" />
                </label>
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">E-mail</span>
                  <input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="cliente@email.com" className="crm-input" />
                </label>
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Origem do lead</span>
                  <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Google, indicação, Instagram..." className="crm-input" />
                </label>
                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Responsável comercial</span>
                  <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Nome do responsável" className="crm-input" />
                </label>
                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Previsão inicial de fechamento</span>
                  <input type="date" value={expectedCloseDate} onChange={(event) => setExpectedCloseDate(event.target.value)} className="crm-input" />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end" style={{ borderColor: theme.border }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-outline rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
                <button type="submit" className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>
                  <Plus className="h-4 w-4" /> Criar oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
