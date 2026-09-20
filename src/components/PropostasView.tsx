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
} from 'lucide-react';
import {
  ClientProposal,
  fetchAllClientProposals,
  getStoredProposalsLocal,
  saveStoredProposalsLocal,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';
import { fetchClients } from '../services/clients';
import { Client, PageKey, PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { NewProposalModal } from './NewProposalModal';
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

  // Contagem por status
  const statusCounts = useMemo(() => {
    return {
      todos: proposals.length,
      Aprovada: proposals.filter((p) => p.status.toLowerCase() === 'aprovada').length,
      'Em negociação': proposals.filter(
        (p) =>
          p.status.toLowerCase() === 'em negociação' ||
          p.status.toLowerCase() === 'em negociacao'
      ).length,
      Pendente: proposals.filter((p) => p.status.toLowerCase() === 'pendente').length,
      Rascunho: proposals.filter((p) => p.status.toLowerCase() === 'rascunho').length,
    };
  }, [proposals]);

  // Filtragem e Ordenação
  const filteredProposals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = proposals.filter((p) => {
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.systemPowerKWp && `${p.systemPowerKWp}`.includes(q)) ||
        (p.moduleModel && p.moduleModel.toLowerCase().includes(q)) ||
        (p.inverterModel && p.inverterModel.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'todos' ||
        p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
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
  }, [proposals, searchQuery, statusFilter, sortBy]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
              Comercial & Vendas FV
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text)]">
            Propostas Comerciais
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] max-w-2xl">
            Gerencie todas as propostas técnicas e orçamentos comerciais vinculados aos seus leads e clientes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNewProposalModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: theme.secondary,
              color: 'var(--secondary-fg)',
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Proposta
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
              placeholder="Buscar por código (ex: PROP-2026-083), cliente, título ou potência..."
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

      {/* Área de conteúdo deixada em vazio por enquanto */}
      <div className="min-h-[200px]" />

      {/* Modal de Criação de Proposta */}
      <NewProposalModal
        isOpen={isNewProposalModalOpen}
        onClose={() => setIsNewProposalModalOpen(false)}
        clients={clients}
        theme={theme}
        onSaveProposal={handleSaveNewProposal}
        onShowToast={onShowToast}
      />

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
