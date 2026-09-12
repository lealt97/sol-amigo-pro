import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  User,
  Zap,
} from 'lucide-react';
import { Lead, LeadStage } from '../../types';
import { ATTENDANCE_STAGES, getStageConfig } from './types';
import { formatPhone } from '../../utils/formatters';

interface AttendanceKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage) => void;
  updatingLeadId: string | null;
}

export const AttendanceKanban: React.FC<AttendanceKanbanProps> = ({
  leads,
  onSelectLead,
  onUpdateStage,
  updatingLeadId,
}) => {
  const stageKeys: LeadStage[] = [
    'novo',
    'em_contato',
    'qualificado',
    'em_estudo',
    'proposta_enviada',
    'negociacao',
    'ganho',
    'perdido',
  ];

  const formatCurrency = (val?: number | null) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : '-';

  return (
    <div
      id="attendance-kanban-board"
      className="flex gap-3.5 overflow-x-auto pb-4 pt-1 min-h-[600px] items-start"
    >
      {stageKeys.map((stageKey, colIdx) => {
        const stageConfig = getStageConfig(stageKey);
        const stageLeads = leads.filter((l) => l.status === stageKey);
        const totalValue = stageLeads.reduce(
          (sum, l) => sum + (Number(l.estimated_budget) || Number(l.average_monthly_bill) || 0),
          0
        );

        return (
          <div
            key={stageKey}
            id={`kanban-col-${stageKey}`}
            className="w-72 shrink-0 bg-[#161B22] border border-[#30363D] rounded-xl flex flex-col max-h-[calc(100vh-210px)] shadow-sm"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#30363D] flex items-center justify-between sticky top-0 bg-[#161B22] rounded-t-xl z-10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    stageKey === 'ganho'
                      ? 'bg-emerald-400'
                      : stageKey === 'perdido'
                      ? 'bg-rose-400'
                      : 'bg-blue-400'
                  }`}
                />
                <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                  {stageConfig.label}
                </h4>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                  {stageLeads.length}
                </span>
              </div>

              {totalValue > 0 && (
                <span className="text-[10px] font-mono text-[#8B949E] font-medium">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>

            {/* Column Cards */}
            <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
              {stageLeads.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8B949E]/60">
                  Nenhum atendimento nesta etapa
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const isUpdating = updatingLeadId === lead.id;
                  const isWon = lead.status === 'ganho';
                  const isLost = lead.status === 'perdido';

                  return (
                    <div
                      key={lead.id}
                      id={`kanban-card-${lead.id}`}
                      className={`bg-[#0D1117] border border-[#30363D] hover:border-[#8B949E]/40 rounded-xl p-3 space-y-2.5 transition-all shadow-xs group ${
                        isUpdating ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {/* Card Top: Person Type & Origin */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isWon
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isLost
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isWon ? 'Cliente' : 'Interessado'}
                        </span>

                        <span className="text-[10px] text-[#8B949E] truncate max-w-[120px]">
                          {lead.source_channel || lead.lead_source || 'Manual'}
                        </span>
                      </div>

                      {/* Name and City */}
                      <div
                        onClick={() => onSelectLead(lead)}
                        className="cursor-pointer space-y-0.5"
                      >
                        <h5 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                          {lead.name}
                        </h5>
                        <div className="flex items-center gap-1 text-[11px] text-[#8B949E]">
                          <MapPin className="w-3 h-3 shrink-0 text-[#8B949E]/70" />
                          <span className="truncate">
                            {lead.city && lead.state ? `${lead.city}/${lead.state}` : 'Local não informado'}
                          </span>
                        </div>
                      </div>

                      {/* Metrics: Bill / Consumption */}
                      <div className="bg-[#161B22] border border-[#30363D]/60 rounded-lg p-2 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-[9px] text-[#8B949E] block">Conta Média</span>
                          <span className="font-mono font-bold text-white">
                            {formatCurrency(lead.average_monthly_bill)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-[#8B949E] block">Consumo</span>
                          <span className="font-mono font-bold text-amber-400">
                            {lead.average_consumption_kwh ? `${lead.average_consumption_kwh} kWh` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Next task / Overdue */}
                      {lead.has_overdue_tasks && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Tarefa atrasada!</span>
                        </div>
                      )}

                      {/* Card Footer: Step shift buttons and Open action */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#30363D]/60">
                        <div className="flex items-center gap-1">
                          {colIdx > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStage(lead.id, stageKeys[colIdx - 1]);
                              }}
                              className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer"
                              title={`Voltar para ${getStageConfig(stageKeys[colIdx - 1]).label}`}
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {colIdx < stageKeys.length - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStage(lead.id, stageKeys[colIdx + 1]);
                              }}
                              className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer"
                              title={`Avançar para ${getStageConfig(stageKeys[colIdx + 1]).label}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onSelectLead(lead)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          <span>Abrir</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
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
  );
};
