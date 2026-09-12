import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Sun,
  Target,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Lead, PageKey, ThemeConfig } from '../types';
import { fetchLeads } from '../services/leads';
import { formatPhone } from '../utils/formatters';

interface DashboardViewProps {
  theme: ThemeConfig;
  onNavigate: (page: PageKey) => void;
  onShowToast?: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  theme,
  onNavigate,
  onShowToast,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === 'novo');
  const inContact = leads.filter((l) => l.status === 'em_contato');
  const qualified = leads.filter((l) => l.status === 'qualificado');
  const inStudy = leads.filter((l) => l.status === 'em_estudo');
  const proposalsSent = leads.filter((l) => l.status === 'proposta_enviada');
  const inNegotiation = leads.filter((l) => l.status === 'negociacao');
  const won = leads.filter((l) => l.status === 'ganho');
  const lost = leads.filter((l) => l.status === 'perdido');

  const activeCount = leads.filter((l) => !['ganho', 'perdido'].includes(l.status)).length;
  const conversionRate = total > 0 ? ((won.length / total) * 100).toFixed(1) : '0.0';

  const totalEstimatedKWp = leads.reduce((acc, lead) => {
    const kwp = lead.averageConsumptionKWh ? lead.averageConsumptionKWh / 120 : 5.5;
    return acc + kwp;
  }, 0);

  const formatCurrency = (val?: number) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : 'R$ 0,00';

  return (
    <div id="dashboard-view" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            Visão Geral Comercial
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Acompanhe o funil de atendimentos unificado, taxas de conversão e volume de energia solar em negociação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors"
            title="Atualizar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => onNavigate('atendimentos')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-colors"
          >
            <FolderKanban className="w-4 h-4" />
            <span>Acessar Atendimentos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8B949E] space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          <span className="text-xs font-medium">Calculando indicadores comerciais...</span>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B949E] font-medium">Ativos no Funil</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white block">{activeCount}</span>
              <span className="text-[10px] text-[#8B949E] block">
                {total} atendimentos no histórico
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B949E] font-medium">Novos Interessados</span>
                <Clock className="w-4 h-4 text-[#93C5FD]" />
              </div>
              <span className="text-2xl font-bold text-[#93C5FD] block">{newLeads.length}</span>
              <span className="text-[10px] text-blue-400 block">
                Aguardando primeiro contato
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B949E] font-medium">Em Negociação / Proposta</span>
                <Zap className="w-4 h-4 text-[#FDBA74]" />
              </div>
              <span className="text-2xl font-bold text-[#FDBA74] block">
                {proposalsSent.length + inNegotiation.length}
              </span>
              <span className="text-[10px] text-orange-400 block">
                Propostas em análise
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B949E] font-medium">Vendas Concluídas</span>
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-[#6EE7B7] block">{won.length}</span>
              <span className="text-[10px] text-emerald-400 block">
                Taxa de conversão {conversionRate}%
              </span>
            </div>
          </div>

          {/* Pipeline Visual Funnel Bar */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[#8B949E]">
                Distribuição do Funil de Atendimentos
              </h3>
              <span className="text-xs text-[#8B949E]">
                Potência total estimada em negociação: <strong className="text-white font-mono">{totalEstimatedKWp.toFixed(1)} kWp</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { label: 'Novos', count: newLeads.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Em Contato', count: inContact.length, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                { label: 'Qualificados', count: qualified.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Pré-Dimens.', count: inStudy.length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Proposta', count: proposalsSent.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Negociação', count: inNegotiation.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'Fechados', count: won.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-3 rounded-lg border border-[#30363D] ${item.bg} flex flex-col justify-between`}
                >
                  <span className="text-[11px] font-medium text-[#8B949E]">{item.label}</span>
                  <span className={`text-xl font-bold font-mono mt-1 ${item.color}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atendimentos Recentes */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Atendimentos Comerciais Recentes
              </h3>
              <button
                onClick={() => onNavigate('atendimentos')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {leads.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-[#8B949E]">Nenhum atendimento cadastrado ainda.</p>
                <button
                  onClick={() => onNavigate('atendimentos')}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Criar Primeiro Atendimento
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#30363D]">
                {leads.slice(0, 6).map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onNavigate('atendimentos')}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#21262D]/50 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs truncate">
                          {lead.name}
                        </span>
                        {lead.clientId && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-mono">
                            Cliente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#8B949E] mt-0.5">
                        <span>{formatPhone(lead.phone)}</span>
                        <span>•</span>
                        <span>{lead.city}/{lead.state}</span>
                        <span>•</span>
                        <span>{lead.propertyType}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-white block">
                        {formatCurrency(lead.averageMonthlyBill)}
                      </span>
                      <span className="text-[10px] text-[#8B949E] uppercase">
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
