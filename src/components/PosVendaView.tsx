import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ClipboardCheck,
  Search,
  ShieldCheck,
  Wrench,
  Plus,
  RefreshCw,
  X,
  Filter,
  ArrowRight,
  User,
  Sun,
  CheckCircle2,
  Calendar,
  Zap,
  SlidersHorizontal,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import {
  ClientProposal,
  fetchAllClientProposals,
  isDemoProposal,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';
import { formatCurrency } from '../utils/formatters';

interface PosVendaViewProps {
  theme: ThemeConfig;
  onNavigate?: (page: PageKey, filter?: string) => void;
  onShowToast?: (msg: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type FilterStatus = 'todos' | 'aprovadas' | 'negociacao' | 'todos_sistemas';
type SortOption = 'recent' | 'value_desc' | 'value_asc' | 'visits_desc' | 'client_asc';

export const PosVendaView: React.FC<PosVendaViewProps> = ({
  theme,
  onNavigate,
  onShowToast,
}) => {
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('todos');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Modal de Agendamento de Visita Técnica
  const [scheduleModalProposal, setScheduleModalProposal] = useState<ClientProposal | null>(null);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [visitType, setVisitType] = useState('Manutenção Preventiva Padrão');
  const [technicianName, setTechnicianName] = useState('Equipe Técnica Solar');
  const [visitNotes, setVisitNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllClientProposals();
      const cleanData = (data || []).filter((p) => !isDemoProposal(p));
      setProposals(cleanData);
    } catch (err) {
      console.warn('Erro ao carregar dados de pós-venda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const handleProposalsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ClientProposal[]>;
      if (customEvent.detail) {
        setProposals((customEvent.detail || []).filter((p) => !isDemoProposal(p)));
      } else {
        void loadData();
      }
    };

    window.addEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    return () => {
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    };
  }, []);

  const proposalsWithPlan = useMemo(
    () => proposals.filter((p) => p.maintenancePlan?.enabled),
    [proposals]
  );

  const approvedWithPlan = useMemo(
    () => proposalsWithPlan.filter((p) => p.status === 'Aprovada'),
    [proposalsWithPlan]
  );

  const negotiationWithPlan = useMemo(
    () =>
      proposalsWithPlan.filter(
        (p) =>
          p.status.toLowerCase() === 'em negociação' ||
          p.status.toLowerCase() === 'em negociacao' ||
          p.status.toLowerCase() === 'pendente'
      ),
    [proposalsWithPlan]
  );

  const annualPortfolioValue = useMemo(
    () =>
      proposalsWithPlan.reduce(
        (sum, p) => sum + Math.max(0, Number(p.maintenancePlan?.annualPrice) || 0),
        0
      ),
    [proposalsWithPlan]
  );

  // Contagens para os chips de filtros
  const filterCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterByQuery = (list: ClientProposal[]) => {
      if (!q) return list;
      return list.filter((p) =>
        [
          p.clientName,
          p.code,
          p.maintenancePlan?.name,
          p.moduleModel,
          p.inverterModel,
          p.systemType,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      );
    };

    return {
      todos: filterByQuery(proposalsWithPlan).length,
      aprovadas: filterByQuery(approvedWithPlan).length,
      negociacao: filterByQuery(negotiationWithPlan).length,
      todos_sistemas: filterByQuery(proposals).length,
    };
  }, [proposals, proposalsWithPlan, approvedWithPlan, negotiationWithPlan, search]);

  // Lista filtrada e ordenada
  const filteredProposals = useMemo(() => {
    let list: ClientProposal[] = [];

    if (statusFilter === 'todos') {
      list = [...proposalsWithPlan];
    } else if (statusFilter === 'aprovadas') {
      list = [...approvedWithPlan];
    } else if (statusFilter === 'negociacao') {
      list = [...negotiationWithPlan];
    } else {
      list = [...proposals];
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [
          p.clientName,
          p.code,
          p.maintenancePlan?.name,
          p.moduleModel,
          p.inverterModel,
          p.systemType,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'value_desc') {
        const valA = Number(a.maintenancePlan?.annualPrice) || 0;
        const valB = Number(b.maintenancePlan?.annualPrice) || 0;
        return valB - valA;
      }
      if (sortBy === 'value_asc') {
        const valA = Number(a.maintenancePlan?.annualPrice) || 0;
        const valB = Number(b.maintenancePlan?.annualPrice) || 0;
        return valA - valB;
      }
      if (sortBy === 'visits_desc') {
        const vA = Number(a.maintenancePlan?.visitsPerYear) || 0;
        const vB = Number(b.maintenancePlan?.visitsPerYear) || 0;
        return vB - vA;
      }
      if (sortBy === 'client_asc') {
        return a.clientName.localeCompare(b.clientName, 'pt-BR');
      }
      return 0;
    });

    return list;
  }, [
    proposals,
    proposalsWithPlan,
    approvedWithPlan,
    negotiationWithPlan,
    statusFilter,
    search,
    sortBy,
  ]);

  const handleOpenScheduleModal = (proposal: ClientProposal) => {
    setScheduleModalProposal(proposal);
    const planName = proposal.maintenancePlan?.name || 'Preventiva Semestral';
    setVisitType(`Revisão O&M • ${planName}`);
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalProposal) return;
    const client = scheduleModalProposal.clientName;
    setScheduleModalProposal(null);
    setVisitNotes('');
    onShowToast?.(`Visita de manutenção técnica para ${client} agendada com sucesso para ${visitDate}!`);
  };

  return (
    <div id="pos-venda-page" className="space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">
            Operação & Manutenção (O&M) • Pós-Venda
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">
            Pós-venda & Manutenção Fotovoltaica
          </h1>
          <p className="mt-1 text-sm font-normal text-[var(--muted)]">
            Gestão da carteira de planos de manutenção preventiva, histórico de revisões técnicas e garantia dos sistemas solares.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate?.('propostas')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm cursor-pointer hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: theme.secondary,
              color: 'var(--secondary-fg)',
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Proposta com Plano
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)] cursor-pointer"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas / KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Planos Incluídos',
            value: String(proposalsWithPlan.length),
            sub: 'Em propostas ativas',
            Icon: Wrench,
            color: theme.secondary,
          },
          {
            label: 'Prontos p/ Ativação',
            value: String(approvedWithPlan.length),
            sub: 'Propostas aprovadas',
            Icon: ShieldCheck,
            color: '#10b981',
          },
          {
            label: 'Em Negociação',
            value: String(negotiationWithPlan.length),
            sub: 'Aguardando fechamento',
            Icon: CalendarClock,
            color: '#f59e0b',
          },
          {
            label: 'Receita Anual Prevista',
            value: money.format(annualPortfolioValue),
            sub: 'Carteira de contratos O&M',
            Icon: ClipboardCheck,
            color: '#10b981',
          },
        ].map(({ label, value, sub, Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
                {label}
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                  color: color,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">
              {value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div
        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-sm"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--dim)]" />
            <input
              id="search-pos-venda"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, código da proposta, plano O&M ou equipamento..."
              className="w-full h-11 pl-10 pr-9 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all focus:border-[var(--secondary)]"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <span className="text-xs text-[var(--dim)] font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-11 pl-3.5 pr-10 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <option value="recent">Mais recentes</option>
              <option value="value_desc">Maior valor anual</option>
              <option value="value_asc">Menor valor anual</option>
              <option value="visits_desc">Mais visitas/ano</option>
              <option value="client_asc">Cliente (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Linha de Filtros por Status */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t"
          style={{ borderColor: theme.border }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--dim)] mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filtrar:
            </span>

            {[
              { id: 'todos', label: 'Todos os Planos', count: filterCounts.todos },
              { id: 'aprovadas', label: 'Prontos p/ Ativação', count: filterCounts.aprovadas },
              { id: 'negociacao', label: 'Em Negociação', count: filterCounts.negociacao },
              { id: 'todos_sistemas', label: 'Todos os Sistemas FV', count: filterCounts.todos_sistemas },
            ].map((st) => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as FilterStatus)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    active ? 'shadow-sm' : 'border opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: active ? theme.secondary : 'transparent',
                    color: active ? 'var(--secondary-fg)' : theme.text,
                    borderColor: active ? theme.secondary : theme.border,
                  }}
                >
                  <span>{st.label}</span>
                  <span
                    className="px-1.5 py-0.2 rounded-full text-[10px]"
                    style={{
                      backgroundColor: active
                        ? 'rgba(0,0,0,0.18)'
                        : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                    }}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {(search || statusFilter !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('todos');
              }}
              className="text-xs text-[var(--dim)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid de Cards de Planos */}
      {filteredProposals.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center flex flex-col items-center justify-center gap-2 shadow-sm"
          style={{ backgroundColor: theme.primary, borderColor: theme.border }}
        >
          <Wrench className="mx-auto h-8 w-8 text-[var(--auxiliary)]" />
          <h3 className="mt-3 text-base font-semibold text-[var(--text)]">
            {search
              ? `Nenhum plano encontrado para "${search}"`
              : statusFilter !== 'todos'
              ? 'Nenhum plano com o filtro selecionado'
              : 'Nenhum plano de manutenção cadastrado'}
          </h3>
          <p className="mt-1 text-sm font-normal text-[var(--muted)] max-w-md mx-auto">
            {search || statusFilter !== 'todos'
              ? 'Tente ajustar os termos da busca ou clique em limpar filtros para visualizar todos os registros disponíveis.'
              : 'Ao criar uma proposta comercial no Wizard, inclua um plano de manutenção na etapa de Manutenção O&M para gerenciar a carteira aqui.'}
          </p>
          {(search || statusFilter !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('todos');
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] cursor-pointer"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Limpar busca e filtros
            </button>
          )}
          {!search && statusFilter === 'todos' && (
            <button
              type="button"
              onClick={() => onNavigate?.('propostas')}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm hover:brightness-110 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
            >
              <Plus className="h-4 w-4" />
              <span>Criar Proposta com Manutenção</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProposals.map((proposal) => {
            const plan = proposal.maintenancePlan;
            const hasPlan = Boolean(plan?.enabled);
            const isApproved = proposal.status === 'Aprovada';

            return (
              <div
                key={proposal.id}
                id={`maintenance-card-${proposal.id}`}
                className="rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-[var(--secondary)]/60 relative group"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                {/* Topo do Card */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[var(--text)] tracking-tight">
                          {proposal.code}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                            color: theme.secondary,
                          }}
                        >
                          {proposal.systemType || 'On-Grid'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5 line-clamp-1">
                        <User className="h-3.5 w-3.5 shrink-0 text-[var(--secondary)]" />
                        <span className="truncate">{proposal.clientName}</span>
                      </h4>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 text-center uppercase tracking-wide"
                      style={{
                        backgroundColor: isApproved
                          ? 'color-mix(in srgb, #10b981 18%, transparent)'
                          : 'color-mix(in srgb, var(--secondary) 18%, transparent)',
                        color: isApproved ? '#10b981' : theme.secondary,
                        borderColor: isApproved
                          ? 'color-mix(in srgb, #10b981 30%, transparent)'
                          : 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                      }}
                    >
                      {isApproved ? 'Pronto p/ ativação' : proposal.status}
                    </span>
                  </div>

                  {/* Detalhes Técnicos Básicos */}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-[var(--text)]">{proposal.systemPowerKWp.toFixed(2)} kWp</span>
                    {proposal.inverterModel && (
                      <>
                        <span>•</span>
                        <span className="truncate">{proposal.inverterModel}</span>
                      </>
                    )}
                  </div>

                  {/* Detalhes do Plano de Manutenção (Box Interno) */}
                  {hasPlan && plan ? (
                    <div
                      className="rounded-xl border p-3.5 space-y-2.5 text-xs"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                              color: theme.secondary,
                            }}
                          >
                            <Wrench className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--text)] text-xs truncate">
                              {plan.name || 'Manutenção Preventiva'}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {plan.visitsPerYear} visita(s)/ano • a cada {plan.frequencyMonths} meses
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] uppercase font-bold text-[var(--dim)] block">
                            Valor Anual
                          </span>
                          <span className="text-sm font-black text-emerald-500">
                            {money.format(plan.annualPrice)}
                          </span>
                        </div>
                      </div>

                      {plan.includedServices && plan.includedServices.length > 0 && (
                        <div
                          className="pt-2 border-t flex flex-wrap gap-1.5"
                          style={{ borderColor: theme.border }}
                        >
                          {plan.includedServices.map((srv, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--text) 5%, transparent)',
                                borderColor: theme.border,
                                color: 'var(--muted)',
                              }}
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                              <span>{srv}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-xl border border-dashed p-3.5 text-xs text-center space-y-1"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      }}
                    >
                      <p className="font-semibold text-[var(--muted)]">
                        Sem plano de manutenção incluso nesta proposta
                      </p>
                      <p className="text-[11px] text-[var(--dim)]">
                        Edite a proposta ou crie um novo aditivo com plano O&M.
                      </p>
                    </div>
                  )}
                </div>

                {/* Rodapé com Ações */}
                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: theme.border }}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenScheduleModal(proposal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] cursor-pointer"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    <CalendarClock className="h-3.5 w-3.5 text-[var(--secondary)]" />
                    <span>Agendar Visita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('propostas', proposal.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: theme.secondary,
                      color: 'var(--secondary-fg)',
                    }}
                  >
                    <span>Abrir proposta</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Agendamento de Visita Técnica */}
      {scheduleModalProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                    color: theme.secondary,
                  }}
                >
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">
                    Agendar Visita Técnica O&M
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {scheduleModalProposal.clientName} ({scheduleModalProposal.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalProposal(null)}
                className="p-1 rounded-lg text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-1.5">
                  Tipo de Atendimento / Manutenção
                </label>
                <input
                  type="text"
                  required
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  placeholder="Ex: Manutenção Preventiva Semestral"
                  className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none focus:border-[var(--secondary)]"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-1.5">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-1.5">
                    Responsável / Equipe
                  </label>
                  <input
                    type="text"
                    required
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Nome do técnico ou equipe"
                    className="w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--dim)] mb-1.5">
                  Observações Técnicas / Checklist
                </label>
                <textarea
                  rows={3}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Ex: Checar conexões MC4, reaperto de bornes do inversor e lavagem técnica de 24 módulos..."
                  className="w-full p-3 rounded-xl border text-sm font-medium outline-none focus:border-[var(--secondary)] resize-none"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2.5" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setScheduleModalProposal(null)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] cursor-pointer"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                  style={{
                    backgroundColor: theme.secondary,
                    color: 'var(--secondary-fg)',
                  }}
                >
                  <CalendarClock className="h-4 w-4" />
                  <span>Confirmar Agendamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
