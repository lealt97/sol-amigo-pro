import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Columns,
  Filter,
  Flame,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Lead, LeadCaptureForm, LeadStage, ThemeConfig } from '../../types';
import { ATTENDANCE_STAGES, getStageConfig } from './types';
import { formatPhone } from '../../utils/formatters';

interface AttendanceListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  onOpenNewAttendance: () => void;
  onCopyCaptureLink: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  theme: ThemeConfig;
  captureForm: LeadCaptureForm | null;
}

type ViewMode = 'pipeline' | 'list';

export const AttendanceList: React.FC<AttendanceListProps> = ({
  leads,
  selectedLeadId,
  onSelectLead,
  onOpenNewAttendance,
  onCopyCaptureLink,
  onRefresh,
  refreshing,
  theme,
  captureForm,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<'Todos' | Lead['propertyType']>('Todos');
  const [stageFilter, setStageFilter] = useState<'Todos' | LeadStage>('Todos');

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !normalizedSearch ||
      lead.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      lead.phone.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      formatPhone(lead.phone).toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      (lead.email && lead.email.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) ||
      lead.city.toLocaleLowerCase('pt-BR').includes(normalizedSearch);

    const matchesProperty = propertyFilter === 'Todos' || lead.propertyType === propertyFilter;
    const matchesStage = stageFilter === 'Todos' || lead.status === stageFilter;

    return matchesSearch && matchesProperty && matchesStage;
  });

  // Grouped by stage for pipeline view
  const leadsByStage = ATTENDANCE_STAGES.reduce<Record<LeadStage, Lead[]>>(
    (acc, stage) => {
      acc[stage.key] = filteredLeads.filter((lead) => lead.status === stage.key);
      return acc;
    },
    {
      novo: [],
      em_contato: [],
      qualificado: [],
      em_estudo: [],
      proposta_enviada: [],
      negociacao: [],
      ganho: [],
      perdido: [],
    }
  );

  const totalActive = leads.filter((l) => !['ganho', 'perdido'].includes(l.status)).length;
  const totalNew = leads.filter((l) => l.status === 'novo').length;
  const totalInStudy = leads.filter((l) => l.status === 'em_estudo').length;
  const totalNegotiation = leads.filter((l) => l.status === 'negociacao').length;
  const totalWon = leads.filter((l) => l.status === 'ganho').length;

  const formatCurrency = (val?: number) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : 'Não inf.';

  return (
    <div className="space-y-4">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Ativos no Funil</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-white">{totalActive}</span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
              Total {leads.length}
            </span>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Novos Interessados</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#93C5FD]">{totalNew}</span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Aguardando
            </span>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Em Estudo / Dimens.</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#FCD34D]">{totalInStudy}</span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Técnico
            </span>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Em Negociação</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#FDBA74]">{totalNegotiation}</span>
            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
              Quentes
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Vendas Fechadas</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#6EE7B7]">{totalWon}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Sucesso
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value as any)}
            className="bg-[#0D1117] border border-[#30363D] rounded-lg px-2.5 py-1.5 text-xs text-[#C9D1D9] focus:border-blue-500 focus:outline-hidden"
          >
            <option value="Todos">Todos os Imóveis</option>
            <option value="Residencial">Residencial</option>
            <option value="Comercial">Comercial</option>
            <option value="Rural">Rural</option>
            <option value="Industrial">Industrial</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="bg-[#0D1117] border border-[#30363D] rounded-lg px-2.5 py-1.5 text-xs text-[#C9D1D9] focus:border-blue-500 focus:outline-hidden"
          >
            <option value="Todos">Todas as Etapas</option>
            {ATTENDANCE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: View Toggles & Primary Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-[#0D1117] border border-[#30363D] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'pipeline'
                  ? 'bg-[#21262D] text-white shadow-xs font-semibold'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
              title="Visão Funil / Pipeline"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Funil</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#21262D] text-white shadow-xs font-semibold'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
              title="Visão Lista / Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={onCopyCaptureLink}
            className="px-2.5 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs text-[#8B949E] hover:text-white flex items-center gap-1.5 transition-colors"
            title="Copiar link do formulário de captação público do site"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Link Captação</span>
          </button>

          <button
            onClick={onOpenNewAttendance}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Atendimento</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Pipeline vs List */}
      {viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-3 overflow-x-auto pb-4">
          {ATTENDANCE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.key];
            return (
              <div
                key={stage.key}
                className="bg-[#161B22]/70 border border-[#30363D] rounded-xl flex flex-col min-w-[250px] md:min-w-[210px] xl:min-w-0"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-[#30363D] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="text-xs font-bold text-white truncate">{stage.shortLabel}</h3>
                  </div>
                  <span
                    className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: stage.badgeBg, color: stage.textColor }}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[680px]">
                  {stageLeads.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-[#484F58]">
                      Nenhum atendimento
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const isSelected = lead.id === selectedLeadId;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={`group bg-[#0D1117] border rounded-lg p-3 cursor-pointer transition-all hover:border-blue-500/70 hover:shadow-lg ${
                            isSelected
                              ? 'border-blue-500 ring-1 ring-blue-500 bg-[#0E1B2D]'
                              : 'border-[#30363D]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-semibold text-white text-xs group-hover:text-blue-400 transition-colors line-clamp-1">
                              {lead.name}
                            </h4>
                            {lead.clientId && (
                              <span
                                className="text-[9px] bg-purple-500/20 text-purple-300 font-mono px-1 py-0.5 rounded shrink-0"
                                title="Interessado qualificado com Cliente e UC gerados"
                              >
                                Cliente
                              </span>
                            )}
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-[#8B949E]">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#484F58] shrink-0" />
                              <span className="font-mono">{formatPhone(lead.phone)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-[#484F58] shrink-0" />
                              <span className="truncate">
                                {lead.city}/{lead.state}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-[#21262D] mt-2 font-medium">
                              <span className="text-white">
                                {formatCurrency(lead.averageMonthlyBill)}
                              </span>
                              <span className="text-[10px] text-[#484F58] uppercase">
                                {lead.propertyType}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#C9D1D9]">
              <thead className="bg-[#0D1117] text-[#8B949E] border-b border-[#30363D] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Interessado</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Cidade/UF</th>
                  <th className="py-3 px-4">Imóvel</th>
                  <th className="py-3 px-4">Fatura / Consumo</th>
                  <th className="py-3 px-4">Etapa Atual</th>
                  <th className="py-3 px-4">Atualizado em</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8B949E]">
                      Nenhum atendimento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stageConfig = getStageConfig(lead.status);
                    const isSelected = lead.id === selectedLeadId;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#0E1B2D]' : 'hover:bg-[#21262D]/60'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{lead.name}</span>
                            {lead.clientId && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 font-mono px-1 py-0.2 rounded">
                                Cliente
                              </span>
                            )}
                          </div>
                          {lead.responsible && (
                            <span className="text-[10px] text-[#8B949E]">
                              Resp: {lead.responsible}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          {formatPhone(lead.phone)}
                        </td>

                        <td className="py-3 px-4 text-[11px]">
                          {lead.city}/{lead.state}
                        </td>

                        <td className="py-3 px-4 text-[11px]">{lead.propertyType}</td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-white">
                            {formatCurrency(lead.averageMonthlyBill)}
                          </div>
                          {lead.averageConsumptionKWh && (
                            <div className="text-[10px] text-[#8B949E]">
                              {lead.averageConsumptionKWh} kWh/mês
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: stageConfig.badgeBg,
                              color: stageConfig.textColor,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: stageConfig.color }}
                            />
                            {stageConfig.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-[#8B949E]">
                          {new Date(lead.updatedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="p-1.5 rounded-lg bg-[#21262D] text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
                            title="Abrir detalhes do atendimento"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
