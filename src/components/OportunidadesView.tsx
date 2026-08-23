import React, { useState } from 'react';
import {
  Target,
  Plus,
  ArrowRight,
  DollarSign,
  User,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Opportunity, OpportunityStage, ThemeConfig } from '../types';

interface OportunidadesViewProps {
  opportunities: Opportunity[];
  theme: ThemeConfig;
  onUpdateStage: (id: string, newStage: OpportunityStage) => void;
  onAddOpportunity: (opp: Opportunity) => void;
  onShowToast: (msg: string) => void;
}

const STAGES: Array<{ key: OpportunityStage; label: string; color: string }> = [
  { key: 'prospeccao', label: 'Prospecção Inicial', color: 'bg-slate-100 text-slate-800' },
  { key: 'visita_tecnica', label: 'Visita Técnica / Análise', color: 'bg-purple-100 text-purple-800' },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-blue-100 text-blue-800' },
  { key: 'negociacao', label: 'Em Negociação', color: 'bg-amber-100 text-amber-800' },
  { key: 'fechado', label: 'Fechado / Ganho', color: 'bg-emerald-100 text-emerald-800' },
];

export const OportunidadesView: React.FC<OportunidadesViewProps> = ({
  opportunities,
  theme,
  onUpdateStage,
  onAddOpportunity,
  onShowToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [value, setValue] = useState(45000);
  const [systemPowerKWp, setSystemPowerKWp] = useState(12.5);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName) return;
    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      title,
      clientName,
      value: Number(value),
      stage: 'prospeccao',
      expectedCloseDate: '30/09/2026',
      systemPowerKWp: Number(systemPowerKWp),
      assignedTo: 'Rodrigo Leal',
    };
    onAddOpportunity(newOpp);
    setModalOpen(false);
    setTitle('');
    setClientName('');
    onShowToast(`Oportunidade "${title}" criada com sucesso!`);
  };

  return (
    <div id="oportunidades-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Target className="w-3.5 h-3.5" />
            Comercial / Funil de Vendas
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pipeline de Oportunidades Solares
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Acompanhe o ciclo de fechamento desde o primeiro contato até a assinatura do contrato fotovoltaico.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 4px 14px ${theme.secondary}40`,
          }}
        >
          <Plus className="w-4 h-4" />
          Nova Oportunidade
        </button>
      </section>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {STAGES.map((col) => {
          const colItems = opportunities.filter((o) => o.stage === col.key);
          const colTotal = colItems.reduce((acc, o) => acc + o.value, 0);

          return (
            <div
              key={col.key}
              className="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="font-extrabold text-xs text-slate-800 truncate">
                  {col.label}
                </span>
                <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                  {colItems.length}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 font-bold mb-3">
                Total: R$ {colTotal.toLocaleString('pt-BR')}
              </div>

              {/* Cards inside column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colItems.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-2"
                  >
                    <span className="font-extrabold text-xs text-slate-900 block leading-snug">
                      {opp.title}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      {opp.clientName}
                    </span>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-black text-slate-800">
                        R$ {opp.value.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {opp.systemPowerKWp} kWp
                      </span>
                    </div>

                    {/* Move Stage Actions */}
                    <div className="pt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Responsável: {opp.assignedTo}</span>
                      <select
                        value={opp.stage}
                        onChange={(e) =>
                          onUpdateStage(
                            opp.id,
                            e.target.value as OpportunityStage
                          )
                        }
                        className="bg-slate-50 border border-slate-200 text-[10px] font-bold rounded px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="prospeccao">Prospecção</option>
                        <option value="visita_tecnica">Visita Técnica</option>
                        <option value="proposta_enviada">Proposta</option>
                        <option value="negociacao">Negociação</option>
                        <option value="fechado">Fechado</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal New Opportunity */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Nova Oportunidade Comercial
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Título da Oportunidade
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sistema Solar Residencial 10kWp"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome do Cliente / Empresa
                </label>
                <input
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Fazenda Santa Rita"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Potência (kWp)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={systemPowerKWp}
                    onChange={(e) => setSystemPowerKWp(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                >
                  Criar Oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
