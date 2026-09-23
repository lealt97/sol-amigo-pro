import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Share2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Filter,
  ArrowRight,
  MessageCircle,
  Sun,
  Battery,
  X,
  Trash2,
  Building2,
  User,
  Zap,
} from 'lucide-react';
import {
  ClientProposal,
  fetchAllClientProposals,
  getStoredProposalsLocal,
  saveStoredProposalsLocal,
  deleteClientProposal,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';
import { fetchClients } from '../services/clients';
import { Client, PageKey, PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { ProposalWizardModal } from './ProposalWizardModal';
import { ProposalViewerModal } from './ProposalViewerModal';
import { formatCurrency } from '../utils/formatters';

interface PropostasViewProps {
  theme: ThemeConfig;
  pdfSettings: PdfSettingsConfig;
  onShowToast: (msg: string) => void;
  initialFilterCode?: string;
  onNavigate?: (page: PageKey) => void;
}

export const PropostasView: React.FC<PropostasViewProps> = ({
  theme,
  pdfSettings,
  onShowToast,
  initialFilterCode = '',
  onNavigate,
}) => {
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialFilterCode);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'value_desc' | 'value_asc' | 'power_desc' | 'client_asc'>('recent');

  // Modais
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<SolarProposal | null>(null);

  // Carrega propostas e clientes
  const loadData = async () => {
    setLoading(true);
    try {
      const [propsData, clientsData] = await Promise.all([
        fetchAllClientProposals(),
        fetchClients().catch(() => [] as Client[]),
      ]);
      setProposals(propsData);
      setClients(clientsData);
    } catch (err: any) {
      console.warn('Erro ao carregar propostas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const handleProposalsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ClientProposal[]>;
      if (customEvent.detail) {
        setProposals(customEvent.detail);
      } else {
        void fetchAllClientProposals().then(setProposals);
      }
    };

    window.addEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    return () => {
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    };
  }, []);

  const handleDeleteProposal = (p: ClientProposal) => {
    if (!window.confirm(`Tem certeza que deseja excluir a proposta ${p.code} (${p.clientName})?`)) {
      return;
    }
    const updated = deleteClientProposal(p.id);
    setProposals(updated);
    onShowToast(`Proposta ${p.code} excluída.`);
  };

  // Atualiza busca se initialFilterCode mudar
  useEffect(() => {
    if (initialFilterCode) {
      setSearchQuery(initialFilterCode);
    }
  }, [initialFilterCode]);

  // Conversor para SolarProposal (para o ProposalViewerModal)
  const clientPropToSolar = (p: ClientProposal): SolarProposal => ({
    id: p.id,
    code: p.code,
    clientName: p.clientName,
    clientCity: 'Campinas',
    clientState: 'SP',
    concessionaria: 'CPFL Paulista',
    monthlyConsumptionKWh: p.estimatedMonthlyGenKWh || 1200,
    systemPowerKWp: p.systemPowerKWp,
    systemType: p.systemType === 'Híbrido' ? 'Híbrido' : 'On-Grid',
    estimatedMonthlyGenKWh: p.estimatedMonthlyGenKWh || Math.round(p.systemPowerKWp * 120),
    modulesCount: p.modulesCount || Math.ceil((p.systemPowerKWp * 1000) / 585),
    moduleModel: p.moduleModel || 'Canadian Solar 585W TOPCon Bi-facial',
    inverterModel: p.inverterModel || 'Inversor Deye Trifásico',
    batteryModel: p.batteryModel,
    batteryCount: p.batteryCount,
    totalValue: p.totalValue,
    estimatedMonthlySavings: p.estimatedMonthlySavings || Math.round(p.totalValue * 0.025),
    paybackYears: 3.2,
    status: p.status,
    createdAt: p.createdAt,
  });

  const handleOpenViewer = (p: ClientProposal) => {
    setViewingProposal(clientPropToSolar(p));
  };

  // Salvar nova proposta criada no NewProposalModal
  const handleSaveNewProposal = (newSolar: SolarProposal) => {
    const newClientProp: ClientProposal = {
      id: newSolar.id,
      code: newSolar.code,
      clientId: `cli-${Date.now()}`,
      clientName: newSolar.clientName,
      title: `${newSolar.systemPowerKWp} kWp • ${newSolar.clientName}`,
      systemPowerKWp: newSolar.systemPowerKWp,
      systemType: newSolar.systemType || 'On-Grid',
      totalValue: newSolar.totalValue,
      status: newSolar.status,
      modulesCount: newSolar.modulesCount,
      moduleModel: newSolar.moduleModel,
      inverterModel: newSolar.inverterModel,
      batteryModel: newSolar.batteryModel,
      batteryCount: newSolar.batteryCount,
      estimatedMonthlyGenKWh: newSolar.estimatedMonthlyGenKWh,
      estimatedMonthlySavings: newSolar.estimatedMonthlySavings,
      createdAt: newSolar.createdAt || new Date().toISOString(),
    };

    const updated = [newClientProp, ...proposals];
    setProposals(updated);
    saveStoredProposalsLocal(updated);
    setIsNewProposalModalOpen(false);
    onShowToast(`Proposta ${newSolar.code} criada com sucesso!`);
  };

  // Propostas que atendem à pesquisa de texto
  const searchMatchedProposals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return proposals;
    return proposals.filter((p) => {
      return (
        p.code.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.systemPowerKWp && `${p.systemPowerKWp}`.includes(q)) ||
        (p.moduleModel && p.moduleModel.toLowerCase().includes(q)) ||
        (p.inverterModel && p.inverterModel.toLowerCase().includes(q))
      );
    });
  }, [proposals, searchQuery]);

  // Contagem por status que reflete com precisão a busca atual!
  const statusCounts = useMemo(() => {
    return {
      todos: searchMatchedProposals.length,
      Aprovada: searchMatchedProposals.filter((p) => p.status.toLowerCase() === 'aprovada').length,
      'Em negociação': searchMatchedProposals.filter(
        (p) =>
          p.status.toLowerCase() === 'em negociação' ||
          p.status.toLowerCase() === 'em negociacao'
      ).length,
      Pendente: searchMatchedProposals.filter((p) => p.status.toLowerCase() === 'pendente').length,
      Rascunho: searchMatchedProposals.filter((p) => p.status.toLowerCase() === 'rascunho').length,
      Recusada: searchMatchedProposals.filter((p) => p.status.toLowerCase() === 'recusada').length,
    };
  }, [searchMatchedProposals]);

  // Filtragem final por status e ordenação
  const filteredProposals = useMemo(() => {
    const result = searchMatchedProposals.filter((p) => {
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'Em negociação') {
        return (
          p.status.toLowerCase() === 'em negociação' ||
          p.status.toLowerCase() === 'em negociacao'
        );
      }
      return p.status.toLowerCase() === statusFilter.toLowerCase();
    });

    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'value_desc') {
        return (b.totalValue || 0) - (a.totalValue || 0);
      }
      if (sortBy === 'value_asc') {
        return (a.totalValue || 0) - (b.totalValue || 0);
      }
      if (sortBy === 'power_desc') {
        return (b.systemPowerKWp || 0) - (a.systemPowerKWp || 0);
      }
      if (sortBy === 'client_asc') {
        return a.clientName.localeCompare(b.clientName, 'pt-BR');
      }
      return 0;
    });

    return result;
  }, [searchMatchedProposals, statusFilter, sortBy]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Aprovada':
        return {
          bg: 'color-mix(in srgb, #10b981 18%, transparent)',
          text: '#10b981',
          border: 'color-mix(in srgb, #10b981 30%, transparent)',
        };
      case 'Em negociação':
        return {
          bg: 'color-mix(in srgb, var(--secondary) 18%, transparent)',
          text: theme.secondary,
          border: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
        };
      case 'Pendente':
        return {
          bg: 'color-mix(in srgb, #f59e0b 18%, transparent)',
          text: '#f59e0b',
          border: 'color-mix(in srgb, #f59e0b 30%, transparent)',
        };
      case 'Recusada':
        return {
          bg: 'color-mix(in srgb, #ef4444 18%, transparent)',
          text: '#ef4444',
          border: 'color-mix(in srgb, #ef4444 30%, transparent)',
        };
      default:
        return {
          bg: 'color-mix(in srgb, var(--text) 10%, transparent)',
          text: 'var(--text)',
          border: theme.border,
        };
    }
  };

  return (
    <div id="propostas-page" className="space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">
            Comercial & Vendas FV
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">
            Propostas Comerciais
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gerencie todas as propostas técnicas e orçamentos comerciais vinculados aos seus leads e clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewProposalModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm cursor-pointer hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: theme.secondary,
              color: 'var(--secondary-fg)',
            }}
          >
            <FileText className="h-4 w-4" />
            Gerar Proposta
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
          {/* Campo de Busca em Tempo Real */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--dim)]" />
            <input
              id="search-propostas"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (ex: PROP-2026-351), cliente, título ou potência..."
              className="w-full h-11 pl-10 pr-9 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all focus:border-[var(--secondary)]"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
              className="h-11 px-3 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="value_desc">Maior valor</option>
              <option value="value_asc">Menor valor</option>
              <option value="power_desc">Maior potência</option>
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
              { id: 'todos', label: 'Todos os Status', count: statusCounts.todos },
              { id: 'Aprovada', label: 'Aprovada', count: statusCounts.Aprovada },
              { id: 'Em negociação', label: 'Em negociação', count: statusCounts['Em negociação'] },
              { id: 'Pendente', label: 'Pendente', count: statusCounts.Pendente },
              { id: 'Rascunho', label: 'Rascunho', count: statusCounts.Rascunho },
              ...(statusCounts.Recusada > 0
                ? [{ id: 'Recusada', label: 'Recusada', count: statusCounts.Recusada }]
                : []),
            ].map((st) => {
              const active = statusFilter.toLowerCase() === st.id.toLowerCase();
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
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

          <div className="flex items-center gap-3">
            {(searchQuery || statusFilter !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('todos');
                }}
                className="text-xs text-[var(--dim)] hover:text-[var(--text)] underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Propostas ou Estado Vazio */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--secondary)]" />
          <p className="text-sm font-medium text-[var(--dim)]">Carregando propostas...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm"
          style={{ backgroundColor: theme.primary, borderColor: theme.border }}
        >
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
              color: theme.secondary,
            }}
          >
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--text)]">
            {searchQuery
              ? `Nenhuma proposta encontrada para "${searchQuery}"`
              : statusFilter !== 'todos'
              ? `Nenhuma proposta com status "${statusFilter}"`
              : 'Nenhuma proposta comercial encontrada'}
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md">
            {searchQuery || statusFilter !== 'todos'
              ? 'Tente ajustar os termos da busca ou clique em limpar filtros para visualizar todos os registros disponíveis.'
              : 'Você ainda não possui propostas salvas. Crie uma nova proposta comercial para seus clientes ou interessados.'}
          </p>
          {(searchQuery || statusFilter !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('todos');
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] cursor-pointer"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Limpar busca e filtros
            </button>
          )}
          {!searchQuery && statusFilter === 'todos' && (
            <button
              type="button"
              onClick={() => setIsNewProposalModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
            >
              <FileText className="h-4 w-4" />
              Gerar Proposta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProposals.map((p) => {
            const badgeStyle = getStatusBadgeStyle(p.status);
            const dateFormatted = new Date(p.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div
                key={p.id}
                id={`proposal-card-${p.id}`}
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
                          {p.code}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                            color: theme.secondary,
                          }}
                        >
                          {p.systemType || 'On-Grid'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5 line-clamp-1">
                        <User className="h-3.5 w-3.5 shrink-0 text-[var(--secondary)]" />
                        <span className="truncate">{p.clientName}</span>
                      </h4>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 text-center"
                      style={{
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        borderColor: badgeStyle.border,
                      }}
                    >
                      {p.status}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {p.title}
                  </p>

                  {/* Grid de Métricas Principais */}
                  <div
                    className="grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--dim)] block">
                        Potência
                      </span>
                      <span className="font-bold text-sm text-[var(--text)] flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {p.systemPowerKWp ? `${p.systemPowerKWp.toFixed(2)} kWp` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--dim)] block">
                        Valor Total
                      </span>
                      <span className="font-bold text-sm text-[var(--text)]">
                        {p.totalValue ? formatCurrency(p.totalValue) : 'R$ —'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--dim)] block">
                        Geração Estimada
                      </span>
                      <span className="font-semibold text-xs text-[var(--text)]">
                        {p.estimatedMonthlyGenKWh ? `${p.estimatedMonthlyGenKWh.toLocaleString('pt-BR')} kWh/mês` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--dim)] block">
                        Economia Estimada
                      </span>
                      <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                        {p.estimatedMonthlySavings ? `${formatCurrency(p.estimatedMonthlySavings)}/mês` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Equipamentos (se existirem) */}
                  {(p.moduleModel || p.inverterModel) && (
                    <div className="space-y-1 pt-1 text-[11px] text-[var(--dim)]">
                      {p.moduleModel && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate">
                            {p.modulesCount ? `${p.modulesCount}x ` : ''}
                            {p.moduleModel}
                          </span>
                        </div>
                      )}
                      {p.inverterModel && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Zap className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate">{p.inverterModel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rodapé de Ações do Card */}
                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: theme.border }}
                >
                  <div className="text-[10px] text-[var(--dim)]">
                    Criada em {dateFormatted}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const text = encodeURIComponent(
                          `Olá ${p.clientName}, segue o resumo da sua proposta comercial de energia solar (${p.code}):\n` +
                            `• Potência: ${p.systemPowerKWp || 0} kWp (${p.systemType || 'On-Grid'})\n` +
                            `• Investimento: ${formatCurrency(p.totalValue || 0)}\n` +
                            (p.estimatedMonthlySavings
                              ? `• Economia estimada: ${formatCurrency(p.estimatedMonthlySavings)}/mês\n`
                              : '')
                        );
                        window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}
                      className="p-2 rounded-xl border text-[var(--dim)] hover:text-emerald-500 hover:border-emerald-500 transition-colors cursor-pointer"
                      style={{ borderColor: theme.border }}
                      title="Compartilhar resumo via WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>

                    {/* Botão de Exclusão */}
                    <button
                      type="button"
                      onClick={() => handleDeleteProposal(p)}
                      className="p-2 rounded-xl border text-[var(--dim)] hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                      style={{ borderColor: theme.border }}
                      title="Excluir proposta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Botão Visualizar */}
                    <button
                      type="button"
                      onClick={() => handleOpenViewer(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                      style={{
                        backgroundColor: theme.secondary,
                        color: 'var(--secondary-fg)',
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Dimensionamento & Criação de Proposta (Fluxo Wizard) */}
      {isNewProposalModalOpen && (
        <ProposalWizardModal
          isOpen={isNewProposalModalOpen}
          onClose={() => setIsNewProposalModalOpen(false)}
          theme={theme}
          onSaveProposal={handleSaveNewProposal}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal de Visualização de Proposta */}
      <ProposalViewerModal
        proposal={viewingProposal}
        pdfSettings={pdfSettings}
        theme={theme}
        onClose={() => setViewingProposal(null)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
