import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  FileText,
  Home,
  Landmark,
  Mail,
  MessageSquareText,
  PackageCheck,
  Phone,
  Plus,
  Save,
  Search,
  Target,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  Opportunity,
  OpportunityQualification,
  OpportunityStage,
  ThemeConfig,
} from '../types';
import { getContrastFg } from '../utils/themeEngine';

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
  {
    key: 'lead',
    label: 'Cliente / Lead',
    short: 'Lead',
    description: 'Contato e origem da oportunidade.',
    icon: UserRound,
  },
  {
    key: 'qualificacao',
    label: 'Qualificação',
    short: 'Qualificação',
    description: 'Entender necessidade, interesse e potencial da venda.',
    icon: ClipboardCheck,
  },
  {
    key: 'levantamento',
    label: 'Levantamento',
    short: 'Levantamento',
    description: 'Conta de energia, unidade consumidora e consumo.',
    icon: WalletCards,
  },
  {
    key: 'dimensionamento',
    label: 'Dimensionamento FV',
    short: 'Dimensionamento',
    description: 'Potência, geração e solução fotovoltaica recomendada.',
    icon: Zap,
  },
  {
    key: 'kit_custos',
    label: 'Kit & Custos',
    short: 'Kit & Custos',
    description: 'Equipamentos, custos, preço, margem e lucro.',
    icon: PackageCheck,
  },
  {
    key: 'proposta',
    label: 'Proposta',
    short: 'Proposta',
    description: 'Proposta técnica e comercial gerada a partir dos dados anteriores.',
    icon: FileText,
  },
  {
    key: 'negociacao',
    label: 'Negociação',
    short: 'Negociação',
    description: 'Follow-up, condições comerciais e decisão do cliente.',
    icon: UsersRound,
  },
  {
    key: 'fechado',
    label: 'Fechamento',
    short: 'Fechamento',
    description: 'Venda ganha e pronta para contrato e operação.',
    icon: CheckCircle2,
  },
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

const formatMoney = (value?: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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
  const qualification = selected?.qualification;
  const qualificationReady = Boolean(
    qualification?.customerProfile &&
      Number(qualification?.averageMonthlyBill || 0) > 0 &&
      qualification?.propertyOwnership &&
      qualification?.decisionMaker &&
      qualification?.interestLevel &&
      qualification?.purchaseTimeframe &&
      qualification?.paymentPreference
  );

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

  const updateQualification = (changes: Partial<OpportunityQualification>) => {
    if (!selected) return;
    const current: OpportunityQualification = selected.qualification ?? {
      status: 'pendente',
      updatedAt: new Date().toISOString(),
    };

    onUpdateOpportunity(selected.id, {
      qualification: {
        ...current,
        ...changes,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const saveQualification = () => {
    if (!selected) return;
    updateQualification({ status: selected.qualification?.status ?? 'pendente' });
    onShowToast('Qualificação salva na oportunidade.');
  };

  const qualifyAndAdvance = () => {
    if (!selected) return;
    if (!qualificationReady) {
      onShowToast('Preencha os critérios principais da qualificação antes de avançar.');
      return;
    }
    updateQualification({ status: 'qualificado' });
    onUpdateStage(selected.id, 'levantamento');
    onShowToast('Oportunidade qualificada. Próxima etapa: levantamento energético.');
  };

  const disqualifyOpportunity = () => {
    if (!selected) return;
    updateQualification({ status: 'nao_qualificado' });
    onUpdateStage(selected.id, 'perdido');
    onShowToast('Oportunidade não qualificada e movida para Perdida.');
  };

  const moveToStage = (stage: OpportunityStage) => {
    if (!selected) return;
    if (stage === 'levantamento' && selected.qualification?.status !== 'qualificado') {
      onShowToast('Conclua e aprove a qualificação antes de iniciar o levantamento.');
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

  const selectedIndex = selected ? Math.max(0, getFlowIndex(selected.stage)) : -1;
  const canAdvance = Boolean(
    selected &&
      selected.stage !== 'perdido' &&
      selected.stage !== 'qualificacao' &&
      selectedIndex < FLOW.length - 1
  );

  const qualificationStatusLabel =
    qualification?.status === 'qualificado'
      ? 'Qualificado'
      : qualification?.status === 'nao_qualificado'
        ? 'Não qualificado'
        : 'Pendente';

  return (
    <div id="oportunidades-page" className="mx-auto max-w-[1580px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: mutedText }}
          >
            <Target className="h-4 w-4" />
            Comercial · Fluxo principal
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Oportunidades</h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: mutedText }}>
            A oportunidade é o centro da venda. Cliente, levantamento, dimensionamento, custos, proposta e negociação passam a existir dentro dela.
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
                  {index < FLOW.length - 1 && (
                    <div className="flex items-center" style={{ color: mutedText }}>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
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

          <div className="max-h-[760px] space-y-2 overflow-y-auto p-3">
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
                    backgroundColor: active
                      ? `color-mix(in srgb, ${theme.secondary} 12%, ${panelAltBg})`
                      : panelAltBg,
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
                      style={{
                        borderColor: opp.stage === 'perdido' ? '#ef4444' : theme.border,
                        color: opp.stage === 'perdido' ? '#ef4444' : theme.secondary,
                      }}
                    >
                      {getStageLabel(opp.stage)}
                    </span>
                    <span className="text-[10px]" style={{ color: mutedText }}>
                      {opp.assignedTo}
                    </span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: theme.border, color: mutedText }}>
                <Target className="mx-auto h-7 w-7" />
                <p className="mt-3 text-sm font-bold">Nenhuma oportunidade</p>
                <p className="mt-1 text-xs">Crie a primeira oportunidade para iniciar o novo fluxo.</p>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[560px] overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
          {!selected ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center" style={{ color: mutedText }}>
              <Target className="h-10 w-10" />
              <h2 className="mt-4 text-lg font-extrabold" style={{ color: theme.text }}>Ficha central da oportunidade</h2>
              <p className="mt-2 max-w-lg text-sm">
                Selecione uma oportunidade. Toda a venda será organizada aqui, sem obrigar o usuário a navegar entre cadastros separados.
              </p>
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
                      <button
                        type="button"
                        onClick={() => moveToStage('perdido')}
                        className="btn-outline h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ borderColor: theme.border }}
                      >
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
                        Avançar etapa
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                      <Phone className="h-3.5 w-3.5" /> Telefone
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{selected.clientPhone || 'Não informado'}</p>
                  </div>
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{selected.clientEmail || 'Não informado'}</p>
                  </div>
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                      <UserRound className="h-3.5 w-3.5" /> Responsável
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{selected.assignedTo}</p>
                  </div>
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                      <CalendarDays className="h-3.5 w-3.5" /> Fechamento previsto
                    </div>
                    <p className="mt-1 text-sm font-bold">{formatDate(selected.expectedCloseDate)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {(selected.stage === 'qualificacao' || selected.qualification) && (
                  <section
                    className="overflow-hidden rounded-xl border"
                    style={{ borderColor: selected.stage === 'qualificacao' ? theme.secondary : theme.border, backgroundColor: panelAltBg }}
                  >
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: theme.border }}>
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
                        >
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold">2. Qualificação comercial</h3>
                          <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: mutedText }}>
                            Confirme se existe potencial real de venda antes de investir tempo em levantamento, dimensionamento e proposta.
                          </p>
                        </div>
                      </div>

                      <span
                        className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                        style={{
                          borderColor: qualification?.status === 'nao_qualificado' ? '#ef444455' : theme.border,
                          color:
                            qualification?.status === 'qualificado'
                              ? theme.accent
                              : qualification?.status === 'nao_qualificado'
                                ? '#ef4444'
                                : theme.secondary,
                        }}
                      >
                        {qualificationStatusLabel}
                      </span>
                    </div>

                    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">Perfil do cliente</span>
                          <select
                            value={qualification?.customerProfile ?? ''}
                            onChange={(event) => updateQualification({ customerProfile: event.target.value as OpportunityQualification['customerProfile'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                            <option value="Rural">Rural</option>
                            <option value="Industrial">Industrial</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">Conta média de energia</span>
                          <div className="relative">
                            <BadgeDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={qualification?.averageMonthlyBill ?? ''}
                              onChange={(event) => updateQualification({ averageMonthlyBill: Number(event.target.value) || 0 })}
                              placeholder="Ex.: 850"
                              className="crm-input pl-9"
                            />
                          </div>
                        </label>

                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">Situação do imóvel</span>
                          <select
                            value={qualification?.propertyOwnership ?? ''}
                            onChange={(event) => updateQualification({ propertyOwnership: event.target.value as OpportunityQualification['propertyOwnership'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="Próprio">Próprio</option>
                            <option value="Alugado">Alugado</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">É o decisor da compra?</span>
                          <select
                            value={qualification?.decisionMaker ?? ''}
                            onChange={(event) => updateQualification({ decisionMaker: event.target.value as OpportunityQualification['decisionMaker'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="Sim">Sim</option>
                            <option value="Compartilhada">Decisão compartilhada</option>
                            <option value="Não">Não</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">Nível de interesse</span>
                          <select
                            value={qualification?.interestLevel ?? ''}
                            onChange={(event) => updateQualification({ interestLevel: event.target.value as OpportunityQualification['interestLevel'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="Alto">Alto</option>
                            <option value="Médio">Médio</option>
                            <option value="Baixo">Baixo</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold">
                          <span className="mb-2 block">Prazo pretendido</span>
                          <select
                            value={qualification?.purchaseTimeframe ?? ''}
                            onChange={(event) => updateQualification({ purchaseTimeframe: event.target.value as OpportunityQualification['purchaseTimeframe'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="Até 30 dias">Até 30 dias</option>
                            <option value="1 a 3 meses">1 a 3 meses</option>
                            <option value="3 a 6 meses">3 a 6 meses</option>
                            <option value="Mais de 6 meses">Mais de 6 meses</option>
                            <option value="Sem prazo">Sem prazo definido</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold sm:col-span-2">
                          <span className="mb-2 block">Preferência de pagamento</span>
                          <select
                            value={qualification?.paymentPreference ?? ''}
                            onChange={(event) => updateQualification({ paymentPreference: event.target.value as OpportunityQualification['paymentPreference'] })}
                            className="crm-input"
                          >
                            <option value="">Selecione</option>
                            <option value="À vista">À vista</option>
                            <option value="Financiamento">Financiamento</option>
                            <option value="Ainda não definido">Ainda não definido</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold sm:col-span-2">
                          <span className="mb-2 block">Objetivo principal do cliente</span>
                          <input
                            value={qualification?.mainObjective ?? ''}
                            onChange={(event) => updateQualification({ mainObjective: event.target.value })}
                            placeholder="Ex.: reduzir a conta, previsibilidade de custo, investimento..."
                            className="crm-input"
                          />
                        </label>

                        <label className="block text-sm font-semibold sm:col-span-2">
                          <span className="mb-2 block">Observações da qualificação</span>
                          <textarea
                            value={qualification?.notes ?? ''}
                            onChange={(event) => updateQualification({ notes: event.target.value })}
                            placeholder="Registre objeções, contexto da conversa e informações importantes para a próxima etapa."
                            className="min-h-[96px] w-full resize-y rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2"
                            style={{ borderColor: theme.border, color: theme.text }}
                          />
                        </label>
                      </div>

                      <aside className="space-y-3">
                        <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
                          <h4 className="text-sm font-extrabold">Critérios para avançar</h4>
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: mutedText }}>
                            Os dados abaixo formam o mínimo necessário para liberar o levantamento energético.
                          </p>

                          <div className="mt-4 space-y-2">
                            {[
                              { label: 'Perfil definido', done: Boolean(qualification?.customerProfile), icon: UserRound },
                              { label: `Conta média ${qualification?.averageMonthlyBill ? formatMoney(qualification.averageMonthlyBill) : ''}`, done: Number(qualification?.averageMonthlyBill || 0) > 0, icon: BadgeDollarSign },
                              { label: 'Situação do imóvel', done: Boolean(qualification?.propertyOwnership), icon: Home },
                              { label: 'Decisor identificado', done: Boolean(qualification?.decisionMaker), icon: UserCheck },
                              { label: 'Interesse identificado', done: Boolean(qualification?.interestLevel), icon: MessageSquareText },
                              { label: 'Prazo definido', done: Boolean(qualification?.purchaseTimeframe), icon: Clock3 },
                              { label: 'Pagamento avaliado', done: Boolean(qualification?.paymentPreference), icon: Landmark },
                            ].map((criterion) => {
                              const Icon = criterion.icon;
                              return (
                                <div key={criterion.label} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: theme.border }}>
                                  <div
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                                    style={{
                                      backgroundColor: criterion.done
                                        ? `color-mix(in srgb, ${theme.accent} 18%, transparent)`
                                        : `color-mix(in srgb, ${theme.secondary} 10%, transparent)`,
                                      color: criterion.done ? theme.accent : mutedText,
                                    }}
                                  >
                                    {criterion.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                                  </div>
                                  <span className="text-[11px] font-semibold" style={{ color: criterion.done ? theme.text : mutedText }}>
                                    {criterion.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div
                          className="rounded-xl border p-4"
                          style={{
                            borderColor: qualificationReady ? `color-mix(in srgb, ${theme.accent} 60%, ${theme.border})` : theme.border,
                            backgroundColor: qualificationReady
                              ? `color-mix(in srgb, ${theme.accent} 8%, ${panelBg})`
                              : panelBg,
                          }}
                        >
                          <p className="text-xs font-extrabold">
                            {qualificationReady ? 'Pronto para decisão' : 'Qualificação incompleta'}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: mutedText }}>
                            {qualificationReady
                              ? 'Os critérios principais foram preenchidos. Você pode qualificar e seguir para o levantamento.'
                              : 'Complete os critérios pendentes antes de liberar a próxima etapa.'}
                          </p>
                        </div>
                      </aside>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: theme.border }}>
                      <button
                        type="button"
                        onClick={saveQualification}
                        className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold"
                        style={{ borderColor: theme.border }}
                      >
                        <Save className="h-4 w-4" />
                        Salvar qualificação
                      </button>

                      {selected.stage === 'qualificacao' && (
                        <>
                          <button
                            type="button"
                            onClick={disqualifyOpportunity}
                            className="btn-outline rounded-lg border px-4 py-2.5 text-xs font-bold"
                            style={{ borderColor: '#ef444455', color: '#ef4444' }}
                          >
                            Não qualificar
                          </button>
                          <button
                            type="button"
                            onClick={qualifyAndAdvance}
                            disabled={!qualificationReady}
                            className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
                            style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
                          >
                            Qualificar e avançar
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold">Fluxo da oportunidade</h3>
                    <p className="mt-1 text-xs" style={{ color: mutedText }}>
                      Cada etapa usa e complementa os dados da mesma oportunidade.
                    </p>
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
                    const qualificationBlocksStage = stage.key === 'levantamento' && selected.qualification?.status !== 'qualificado' && currentIndex < index;
                    const available = baseAvailable && !qualificationBlocksStage;

                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled={!available && !completed && !isCurrent}
                        onClick={() => available || completed || isCurrent ? moveToStage(stage.key) : undefined}
                        className="rounded-xl border p-4 text-left"
                        style={{
                          borderColor: isCurrent ? theme.secondary : theme.border,
                          backgroundColor: isCurrent
                            ? `color-mix(in srgb, ${theme.secondary} 10%, ${panelAltBg})`
                            : panelAltBg,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: completed
                                  ? `color-mix(in srgb, ${theme.accent} 22%, transparent)`
                                  : `color-mix(in srgb, ${theme.secondary} 16%, transparent)`,
                                color: completed ? theme.accent : theme.secondary,
                              }}
                            >
                              {completed ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <Icon className="h-[18px] w-[18px]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-extrabold">{index + 1}. {stage.label}</p>
                                {isCurrent && (
                                  <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>
                                    ETAPA ATUAL
                                  </span>
                                )}
                                {completed && !isCurrent && (
                                  <span className="text-[9px] font-bold" style={{ color: theme.accent }}>CONCLUÍDA</span>
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed" style={{ color: mutedText }}>{stage.description}</p>
                              {stage.key === 'levantamento' && qualificationBlocksStage && (
                                <p className="mt-2 text-[10px] font-bold" style={{ color: theme.secondary }}>
                                  Bloqueado até concluir a qualificação.
                                </p>
                              )}
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
                    <p className="mt-1 text-xs" style={{ color: mutedText }}>
                      O histórico foi preservado. A oportunidade pode ser reaberta caso a negociação retorne.
                    </p>
                    <button
                      type="button"
                      onClick={() => moveToStage('lead')}
                      className="btn-outline mt-3 rounded-lg border px-3 py-2 text-xs font-bold"
                      style={{ borderColor: theme.border }}
                    >
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
                <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: mutedText }}>
                  Início do fluxo comercial
                </div>
                <h2 className="mt-1 text-xl font-extrabold">Nova oportunidade</h2>
                <p className="mt-1 text-sm" style={{ color: mutedText }}>
                  O contato do cliente nasce dentro da oportunidade. Os demais dados serão adicionados conforme a venda avança.
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
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Sistema FV residência João Silva"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Nome do contato / cliente</span>
                  <input
                    required
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Nome da pessoa ou empresa"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Telefone</span>
                  <input
                    value={clientPhone}
                    onChange={(event) => setClientPhone(event.target.value)}
                    placeholder="(00) 00000-0000"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">E-mail</span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    placeholder="cliente@email.com"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Origem do lead</span>
                  <input
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    placeholder="Google, indicação, Instagram..."
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 block">Responsável comercial</span>
                  <input
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    placeholder="Nome do responsável"
                    className="crm-input"
                  />
                </label>

                <label className="block text-sm font-semibold md:col-span-2">
                  <span className="mb-2 block">Previsão inicial de fechamento</span>
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
