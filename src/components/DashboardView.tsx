import React from 'react';
import {
  Users,
  FileText,
  DollarSign,
  Zap,
  ArrowUpRight,
  Plus,
  FileDown,
  Activity,
} from 'lucide-react';
import { SolarProposal, ThemeConfig, PageKey } from '../types';

interface DashboardViewProps {
  proposals: SolarProposal[];
  theme: ThemeConfig;
  onNavigate: (page: PageKey) => void;
  onOpenNewProposal: () => void;
  onViewProposal: (prop: SolarProposal) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  proposals,
  theme,
  onNavigate,
  onOpenNewProposal,
  onViewProposal,
}) => {
  const chartDays = [
    { day: 'Seg', val: 42, count: 6 },
    { day: 'Ter', val: 68, count: 9 },
    { day: 'Qua', val: 54, count: 7 },
    { day: 'Qui', val: 81, count: 12 },
    { day: 'Sex', val: 62, count: 8 },
    { day: 'Sáb', val: 94, count: 14 },
    { day: 'Dom', val: 73, count: 10 },
  ];

  const totalPotenciaKWp = proposals
    .reduce((acc, p) => acc + p.systemPowerKWp, 0)
    .toFixed(1);

  const approvedCount = proposals.filter((p) => p.status === 'Aprovada').length;
  const negotiationCount = proposals.filter((p) => p.status === 'Em negociação').length;
  const pendingCount = proposals.filter((p) => p.status === 'Pendente').length;
  const rejectedCount = proposals.filter((p) => p.status === 'Recusada').length;
  const approvalRate = proposals.length
    ? Math.round((approvedCount / proposals.length) * 100)
    : 0;

  const proposalStatus = [
    { label: 'Aprovadas', value: approvedCount, color: '#34D399' },
    { label: 'Em negociação', value: negotiationCount, color: '#60A5FA' },
    { label: 'Pendentes', value: pendingCount, color: '#FBBF24' },
    { label: 'Recusadas', value: rejectedCount, color: '#F87171' },
  ];

  const totalStatus = proposalStatus.reduce((acc, item) => acc + item.value, 0);
  let statusAngle = 0;
  const donutGradient = totalStatus
    ? `conic-gradient(${proposalStatus
        .map((item) => {
          const start = (statusAngle / totalStatus) * 360;
          statusAngle += item.value;
          const end = (statusAngle / totalStatus) * 360;
          return `${item.color} ${start}deg ${end}deg`;
        })
        .join(', ')})`
    : 'conic-gradient(#30363D 0deg 360deg)';

  const statusClasses: Record<SolarProposal['status'], string> = {
    Aprovada: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/50',
    'Em negociação': 'text-blue-400 border-blue-800/60 bg-blue-950/50',
    Pendente: 'text-amber-400 border-amber-800/60 bg-amber-950/50',
    Recusada: 'text-red-400 border-red-800/60 bg-red-950/50',
  };

  return (
    <div id="dashboard-view" className="space-y-4 max-w-7xl mx-auto text-[#C9D1D9]">
      <section className="bg-[#161B22] p-4 md:p-5 rounded-lg border border-[#30363D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Sol Amigo Pro Dashboard
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CLUSTER ONLINE
            </span>
          </div>
          <p className="text-[#8B949E] text-xs mt-1">
            Painel operacional de dimensionamento fotovoltaico, telemetria e propostas comerciais.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('propostas')}
            className="px-3 py-1.5 rounded-md border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white text-xs font-semibold transition-colors"
          >
            Ver Propostas ({proposals.length})
          </button>
          <button
            onClick={onOpenNewProposal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Proposta Solar
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border-l-2 border-blue-500 pl-3 py-2.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
          <div className="flex items-center justify-between pr-2">
            <p className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider">
              Clientes Ativos
            </p>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-mono text-white mt-1">128</p>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +12% per
          </span>
        </div>

        <div className="border-l-2 border-indigo-500 pl-3 py-2.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
          <div className="flex items-center justify-between pr-2">
            <p className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider">
              Propostas Geradas
            </p>
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-xl font-mono text-white mt-1">46</p>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +8% mês
          </span>
        </div>

        <div className="border-l-2 border-emerald-500 pl-3 py-2.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
          <div className="flex items-center justify-between pr-2">
            <p className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider">
              Valor Vendido
            </p>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-mono text-white mt-1">R$ 680k</p>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +18% ano
          </span>
        </div>

        <div className="border-l-2 border-orange-500 pl-3 py-2.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
          <div className="flex items-center justify-between pr-2">
            <p className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider">
              Potência Total
            </p>
            <Zap className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-xl font-mono text-white mt-1">{totalPotenciaKWp} kWp</p>
          <span className="text-[10px] text-blue-400 font-mono flex items-center gap-0.5 mt-0.5">
            <Activity className="w-3 h-3" /> 18 Projetos
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-[#30363D] flex items-center justify-between bg-[#1C2128]">
              <div>
                <h3 className="text-xs font-semibold text-white">Atividades Comerciais Recentes</h3>
                <p className="text-[11px] text-[#8B949E] mt-0.5">
                  Últimas movimentações das propostas e clientes
                </p>
              </div>
              <button
                onClick={() => onNavigate('propostas')}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300"
              >
                Ver todas →
              </button>
            </div>

            <div className="divide-y divide-[#30363D]">
              {proposals.slice(0, 3).map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => onViewProposal(proposal)}
                  className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-[#1C2128] transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-white truncate">
                        {proposal.clientName}
                      </span>
                      <span className="text-[10px] font-mono text-[#8B949E] shrink-0">
                        {proposal.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B949E] mt-0.5 truncate">
                      {proposal.systemPowerKWp} kWp · R$ {proposal.totalValue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 ${statusClasses[proposal.status]}`}
                  >
                    {proposal.status}
                  </span>
                </button>
              ))}

              {proposals.length === 0 && (
                <div className="p-6 text-center text-xs text-[#8B949E]">
                  Nenhuma atividade comercial registrada ainda.
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-white">Resumo Comercial</h3>
                <p className="text-[11px] text-[#8B949E] mt-0.5">
                  Situação atual das propostas comerciais
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[#1C2128] border border-[#30363D] rounded-md">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Aprovadas</p>
                <p className="text-lg font-mono font-bold text-emerald-400 mt-1">{approvedCount}</p>
              </div>
              <div className="p-3 bg-[#1C2128] border border-[#30363D] rounded-md">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Em negociação</p>
                <p className="text-lg font-mono font-bold text-blue-400 mt-1">{negotiationCount}</p>
              </div>
              <div className="p-3 bg-[#1C2128] border border-[#30363D] rounded-md">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Pendentes</p>
                <p className="text-lg font-mono font-bold text-amber-400 mt-1">{pendingCount}</p>
              </div>
              <div className="p-3 bg-[#1C2128] border border-[#30363D] rounded-md">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Taxa de aprovação</p>
                <p className="text-lg font-mono font-bold text-white mt-1">{approvalRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 h-full flex flex-col">
            <div>
              <h3 className="text-xs font-semibold text-white">Distribuição das Propostas</h3>
              <p className="text-[11px] text-[#8B949E] mt-1">
                Status atual das propostas comerciais
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center py-5">
              <div
                className="relative w-44 h-44 rounded-full shadow-inner"
                style={{ background: donutGradient }}
                aria-label="Gráfico de rosca com a distribuição das propostas por status"
              >
                <div className="absolute inset-[24px] rounded-full bg-[#161B22] border border-[#30363D] flex flex-col items-center justify-center">
                  <span className="text-3xl font-mono font-bold text-white">{totalStatus}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#8B949E] mt-0.5">
                    Propostas
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {proposalStatus.map((item) => {
                const percentage = totalStatus
                  ? Math.round((item.value / totalStatus) * 100)
                  : 0;

                return (
                  <div
                    key={item.label}
                    className="bg-[#1C2128] border border-[#30363D] rounded-md p-2.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-[#8B949E] truncate">{item.label}</span>
                    </div>
                    <div className="flex items-end justify-between mt-1.5">
                      <span className="text-base font-mono font-bold text-white">{item.value}</span>
                      <span className="text-[10px] font-mono text-[#8B949E]">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[#161B22] p-4 rounded-lg border border-[#30363D] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-xs">Propostas nos Últimos 7 Dias</h3>
              <p className="text-[11px] text-[#8B949E]">
                Volume diário de orçamentos e dimensionamentos FV
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-[#21262D] border border-[#30363D] px-2 py-0.5 rounded">
              Total: 66 propostas
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2.5 pt-4 px-2">
            {chartDays.map((item, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono bg-[#21262D] text-white px-1 py-0.2 rounded border border-[#30363D]">
                  {item.count}
                </div>
                <div className="w-full bg-[#1C2128] rounded-t h-32 flex items-end overflow-hidden border-t border-x border-[#30363D]">
                  <div
                    className="w-full rounded-t transition-all duration-300 bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300"
                    style={{ height: `${item.val}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#8B949E]">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#161B22] p-4 rounded-lg border border-[#30363D] space-y-3">
          <div>
            <h3 className="font-semibold text-white text-xs">Status do Pipeline Fotovoltaico</h3>
            <p className="text-[11px] text-[#8B949E]">Distribuição do funil comercial solar</p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-[#C9D1D9]">Aprovadas (Fechadas)</span>
              </div>
              <b className="text-xs font-mono text-emerald-400">32</b>
            </div>

            <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs text-[#C9D1D9]">Em Negociação Ativa</span>
              </div>
              <b className="text-xs font-mono text-blue-400">18</b>
            </div>

            <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-[#C9D1D9]">Pendentes de Análise</span>
              </div>
              <b className="text-xs font-mono text-amber-400">11</b>
            </div>

            <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-[#C9D1D9]">Recusadas / Canceladas</span>
              </div>
              <b className="text-xs font-mono text-red-400">5</b>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#161B22] p-4 rounded-lg border border-[#30363D] space-y-3">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
          <div>
            <h3 className="font-semibold text-white text-xs">Últimas Propostas Fotovoltaicas</h3>
            <p className="text-[11px] text-[#8B949E]">Propostas mais recentes dimensionadas no SaaS</p>
          </div>
          <button
            onClick={() => onNavigate('propostas')}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            Ver catálogo completo →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#30363D] text-[#8B949E] font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2">Código</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Potência</th>
                <th className="pb-2">Economia/mês</th>
                <th className="pb-2">Valor Total</th>
                <th className="pb-2">Payback</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D] text-[#C9D1D9]">
              {proposals.slice(0, 5).map((prop) => (
                <tr key={prop.id} className="hover:bg-[#1C2128] transition-colors">
                  <td className="py-2.5 font-mono font-bold text-white">{prop.code}</td>
                  <td className="py-2.5">
                    <span className="font-medium text-white block">{prop.clientName}</span>
                    <span className="text-[10px] text-[#8B949E]">
                      {prop.clientCity}/{prop.clientState} · {prop.concessionaria}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-white">{prop.systemPowerKWp} kWp</td>
                  <td className="py-2.5 font-mono text-emerald-400">
                    R$ {prop.estimatedMonthlySavings.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 font-mono text-white">
                    R$ {prop.totalValue.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 font-mono text-[#8B949E]">{prop.paybackYears} anos</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        statusClasses[prop.status]
                      }`}
                    >
                      {prop.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => onViewProposal(prop)}
                      className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white font-mono text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3 h-3" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
