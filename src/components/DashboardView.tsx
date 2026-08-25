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
  GitCommit,
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

  const proposalStatus = [
    {
      label: 'Aprovadas',
      value: proposals.filter((p) => p.status === 'Aprovada').length,
      color: '#34D399',
    },
    {
      label: 'Em negociação',
      value: proposals.filter((p) => p.status === 'Em negociação').length,
      color: '#60A5FA',
    },
    {
      label: 'Pendentes',
      value: proposals.filter((p) => p.status === 'Pendente').length,
      color: '#FBBF24',
    },
    {
      label: 'Recusadas',
      value: proposals.filter((p) => p.status === 'Recusada').length,
      color: '#F87171',
    },
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
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-[#30363D] flex justify-between items-center bg-[#1C2128]">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-white">
                  Latest Activity & Dimensioning: <span className="text-blue-400 font-mono">main</span>
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#8B949E]">
                24 Events this week
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="flex space-x-3">
                <div className="w-7 h-7 rounded-full bg-orange-950/80 border border-orange-500 flex items-center justify-center text-[10px] font-bold text-orange-200 shrink-0">
                  DS
                </div>
                <div className="flex-1 border-b border-[#30363D]/80 pb-2.5">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-semibold text-[#C9D1D9]">
                      feat: add real-time inverter telemetry parsing
                    </h4>
                    <span className="text-[10px] font-mono text-[#8B949E] bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">
                      a7f2d91
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B949E] mt-0.5">
                    dev-sun committed 2 hours ago
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="w-7 h-7 rounded-full bg-blue-950/80 border border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-200 shrink-0">
                  EM
                </div>
                <div className="flex-1 border-b border-[#30363D]/80 pb-2.5">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-semibold text-[#C9D1D9]">
                      fix: resolve socket timeout on low-bandwidth networks
                    </h4>
                    <span className="text-[10px] font-mono text-[#8B949E] bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">
                      cc94b2a
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B949E] mt-0.5">
                    e-moon committed 5 hours ago
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-[10px] font-bold text-emerald-200 shrink-0">
                  CI
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-semibold text-[#C9D1D9]">
                      build: bump version to v2.4.1 for production rollout
                    </h4>
                    <span className="text-[10px] font-mono text-[#8B949E] bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">
                      99e31d4
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B949E] mt-0.5">
                    github-actions committed yesterday
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3.5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E]">
                Infrastructure Status
              </h3>
              <span className="flex items-center text-xs text-emerald-400 font-mono">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                Healthy
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="border-l-2 border-blue-500 pl-3 py-1.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Deployment</p>
                <p className="text-base font-mono text-white">v2.4.1</p>
              </div>
              <div className="border-l-2 border-[#30363D] pl-3 py-1.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">CPU Load</p>
                <p className="text-base font-mono text-white">14.2%</p>
              </div>
              <div className="border-l-2 border-[#30363D] pl-3 py-1.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Memory</p>
                <p className="text-base font-mono text-white">1.2GB</p>
              </div>
              <div className="border-l-2 border-orange-500 pl-3 py-1.5 bg-[#1C2128] border border-[#30363D] border-l-0 rounded-r">
                <p className="text-[9px] text-[#8B949E] uppercase font-bold">Errors (24h)</p>
                <p className="text-base font-mono text-white">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 h-full flex flex-col">
            <div>
              <h3 className="text-xs font-semibold text-white">
                Distribuição das Propostas
              </h3>
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
                  <span className="text-3xl font-mono font-bold text-white">
                    {totalStatus}
                  </span>
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
                      <span className="text-[10px] text-[#8B949E] truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-end justify-between mt-1.5">
                      <span className="text-base font-mono font-bold text-white">
                        {item.value}
                      </span>
                      <span className="text-[10px] font-mono text-[#8B949E]">
                        {percentage}%
                      </span>
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
              <h3 className="font-semibold text-white text-xs">
                Propostas nos Últimos 7 Dias
              </h3>
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
                <span className="text-[10px] font-mono text-[#8B949E]">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#161B22] p-4 rounded-lg border border-[#30363D] space-y-3">
          <div>
            <h3 className="font-semibold text-white text-xs">
              Status do Pipeline Fotovoltaico
            </h3>
            <p className="text-[11px] text-[#8B949E]">
              Distribuição do funil comercial solar
            </p>
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
            <h3 className="font-semibold text-white text-xs">
              Últimas Propostas Fotovoltaicas
            </h3>
            <p className="text-[11px] text-[#8B949E]">
              Propostas mais recentes dimensionadas no SaaS
            </p>
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
                  <td className="py-2.5 font-mono font-bold text-white">
                    {prop.code}
                  </td>
                  <td className="py-2.5">
                    <span className="font-medium text-white block">
                      {prop.clientName}
                    </span>
                    <span className="text-[10px] text-[#8B949E]">
                      {prop.clientCity}/{prop.clientState} · {prop.concessionaria}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-white">
                    {prop.systemPowerKWp} kWp
                  </td>
                  <td className="py-2.5 font-mono text-emerald-400">
                    R$ {prop.estimatedMonthlySavings.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 font-mono text-white">
                    R$ {prop.totalValue.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 font-mono text-[#8B949E]">
                    {prop.paybackYears} anos
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        prop.status === 'Aprovada'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : prop.status === 'Em negociação'
                          ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                          : prop.status === 'Pendente'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-red-950/60 text-red-400 border-red-800/60'
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
