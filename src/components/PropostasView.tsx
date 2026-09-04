import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  FileDown,
  Sun,
  Zap,
  CheckCircle2,
  Trash2,
  Share2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { SolarProposal, ThemeConfig } from '../types';

interface PropostasViewProps {
  proposals: SolarProposal[];
  theme: ThemeConfig;
  onOpenNewProposal: () => void;
  onViewProposal: (prop: SolarProposal) => void;
  onUpdateStatus: (id: string, newStatus: SolarProposal['status']) => void;
  onDeleteProposal: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const PropostasView: React.FC<PropostasViewProps> = ({
  proposals,
  theme,
  onOpenNewProposal,
  onViewProposal,
  onUpdateStatus,
  onDeleteProposal,
  onShowToast,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = proposals.filter((p) => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchQuery =
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.clientCity.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchQuery;
  });

  const totalKWp = filtered
    .reduce((acc, p) => acc + p.systemPowerKWp, 0)
    .toFixed(2);
  const totalValue = filtered.reduce((acc, p) => acc + p.totalValue, 0);
  const totalEconomy = filtered.reduce(
    (acc, p) => acc + p.estimatedMonthlySavings,
    0
  );

  return (
    <div id="propostas-page" className="space-y-4 max-w-7xl mx-auto text-[#C9D1D9]">
      {/* Header Banner */}
      <section className="bg-[#161B22] p-4 md:p-5 rounded-lg border border-[#30363D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#21262D] text-blue-400 border border-[#30363D] text-[10px] font-mono uppercase tracking-wider mb-2">
            <FileText className="w-3 h-3" />
            ENGINEERING / PROPOSALS
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Gerador & Gestor de Propostas Fotovoltaicas
          </h2>
          <p className="text-[#8B949E] text-xs mt-1 max-w-2xl leading-relaxed">
            Crie, dimensione e gerencie orçamentos comerciais FV com geração mensal estimada, análise de payback e fichas técnicas de inversores e módulos.
          </p>
        </div>

        <button
          id="btn-nova-proposta"
          onClick={onOpenNewProposal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Proposta Solar
        </button>
      </section>

      {/* Overview Quick Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#161B22] p-3.5 rounded-lg border border-[#30363D] border-l-2 border-l-blue-500">
          <span className="text-[10px] text-[#8B949E] font-bold uppercase tracking-wider">
            Potência Total Dimensionada
          </span>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {totalKWp} kWp
          </div>
          <span className="text-[10px] font-mono text-[#8B949E]">
            {filtered.length} propostas listadas
          </span>
        </div>

        <div className="bg-[#161B22] p-3.5 rounded-lg border border-[#30363D] border-l-2 border-l-emerald-500">
          <span className="text-[10px] text-[#8B949E] font-bold uppercase tracking-wider">
            Volume Comercial Orçado
          </span>
          <div className="text-xl font-mono font-bold text-white mt-1">
            R$ {totalValue.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            Ticket médio: R${' '}
            {filtered.length > 0
              ? (totalValue / filtered.length).toFixed(0)
              : '0'}
          </span>
        </div>

        <div className="bg-[#161B22] p-3.5 rounded-lg border border-[#30363D] border-l-2 border-l-orange-500">
          <span className="text-[10px] text-[#8B949E] font-bold uppercase tracking-wider">
            Economia Mensal Gerada
          </span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            R$ {totalEconomy.toLocaleString('pt-BR')}/mês
          </div>
          <span className="text-[10px] font-mono text-[#8B949E]">
            R$ {(totalEconomy * 12).toLocaleString('pt-BR')}/ano aos clientes
          </span>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-[#161B22] p-3 rounded-lg border border-[#30363D] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por cliente, cidade, código..."
            className="w-full h-8 pl-9 pr-3 text-xs bg-[#0D1117] border border-[#30363D] rounded-md outline-none focus:border-blue-500 text-[#C9D1D9] font-mono placeholder:text-[#8B949E]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'Aprovada', 'Em negociação', 'Pendente', 'Recusada'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border cursor-pointer ${
                  filterStatus === status
                    ? 'bg-[#21262D] text-white border-[#8B949E] font-bold'
                    : 'bg-[#0D1117] hover:bg-[#21262D] text-[#8B949E] border-[#30363D]'
                }`}
              >
                {status === 'all' ? 'Todas' : status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Proposals Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((prop) => (
          <div
            key={prop.id}
            className="bg-[#161B22] p-4 rounded-lg border border-[#30363D] hover:border-[#8B949E]/50 transition-all flex flex-col justify-between space-y-3"
          >
            {/* Card Header */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-[#8B949E] block">
                    {prop.code} · {prop.createdAt}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {prop.clientName}
                  </h3>
                  <span className="text-[11px] text-[#8B949E]">
                    {prop.clientCity}/{prop.clientState} · Concessionária: {prop.concessionaria}
                  </span>
                </div>

                {/* Status selector */}
                <select
                  value={prop.status}
                  onChange={(e) =>
                    onUpdateStatus(
                      prop.id,
                      e.target.value as SolarProposal['status']
                    )
                  }
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border outline-none cursor-pointer ${
                    prop.status === 'Aprovada'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : prop.status === 'Em negociação'
                      ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                      : prop.status === 'Pendente'
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                      : 'bg-red-950/60 text-red-400 border-red-800/60'
                  }`}
                >
                  <option value="Aprovada" className="bg-[#161B22] text-white">Aprovada</option>
                  <option value="Em negociação" className="bg-[#161B22] text-white">Em negociação</option>
                  <option value="Pendente" className="bg-[#161B22] text-white">Pendente</option>
                  <option value="Recusada" className="bg-[#161B22] text-white">Recusada</option>
                </select>
              </div>

              {/* Solar Technical Specs */}
              <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded bg-[#1C2128] border border-[#30363D] text-center">
                <div>
                  <span className="text-[9px] text-[#8B949E] font-bold uppercase block">
                    Potência
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {prop.systemPowerKWp} kWp
                  </span>
                  <span className="text-[9px] font-mono text-[#8B949E] block">
                    {prop.modulesCount} mods
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#8B949E] font-bold uppercase block">
                    Geração Est.
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {prop.estimatedMonthlyGenKWh} kWh
                  </span>
                  <span className="text-[9px] font-mono text-[#8B949E] block">/mês</span>
                </div>

                <div>
                  <span className="text-[9px] text-[#8B949E] font-bold uppercase block">
                    Payback
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {prop.paybackYears} anos
                  </span>
                  <span className="text-[9px] font-mono text-[#8B949E] block">
                    retorno R$
                  </span>
                </div>
              </div>

              {/* Equipment detail */}
              <div className="mt-2.5 text-[10px] font-mono text-[#8B949E] space-y-0.5">
                <div className="flex items-center gap-1.5 truncate">
                  <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{prop.moduleModel}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Zap className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{prop.inverterModel}</span>
                </div>
              </div>
            </div>

            {/* Card Footer with Price and Actions */}
            <div className="pt-2.5 border-t border-[#30363D] flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] text-[#8B949E] font-bold uppercase block">
                  Investimento Total
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  R$ {prop.totalValue.toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Proposta ${prop.code} - ${prop.clientName}: Potência ${prop.systemPowerKWp}kWp, Valor R$ ${prop.totalValue.toLocaleString('pt-BR')}`
                    );
                    onShowToast('Resumo da proposta copiado!');
                  }}
                  className="p-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white border border-[#30363D] transition-colors cursor-pointer"
                  title="Copiar dados"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteProposal(prop.id)}
                  className="p-1.5 rounded bg-[#21262D] hover:bg-red-950/60 text-[#8B949E] hover:text-red-400 border border-[#30363D] transition-colors cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onViewProposal(prop)}
                  className="px-3 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-400" />
                  Ver PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
