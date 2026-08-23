import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { TaskItem, ThemeConfig } from '../types';

interface TarefasViewProps {
  tasks: TaskItem[];
  theme: ThemeConfig;
  onUpdateStatus: (id: string, newStatus: TaskItem['status']) => void;
  onAddTask: (task: TaskItem) => void;
  onShowToast: (msg: string) => void;
}

export const TarefasView: React.FC<TarefasViewProps> = ({
  tasks,
  theme,
  onUpdateStatus,
  onAddTask,
  onShowToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [type, setType] = useState<TaskItem['type']>('Homologação');
  const [dueDate, setDueDate] = useState('28/08/2026');
  const [concessionaria, setConcessionaria] = useState('CPFL Paulista');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      clientName,
      type,
      dueDate,
      status: 'Pendente',
      concessionaria,
      priority: 'Alta',
    };
    onAddTask(newTask);
    setModalOpen(false);
    setTitle('');
    setClientName('');
    onShowToast(`Tarefa cadastrada com sucesso!`);
  };

  return (
    <div id="tarefas-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            Engenharia / Homologação & Obras
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tarefas & Homologação nas Concessionárias
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Acompanhe o parecer de acesso, vistorias técnicas, instalação em campo e troca do medidor bidirecional junto às distribuidoras de energia.
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
          Nova Tarefa / Protocolo
        </button>
      </section>

      {/* Tasks Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Tarefa / Atividade</th>
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3">Concessionária</th>
                <th className="pb-3">Prazo</th>
                <th className="pb-3">Prioridade</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">
                    {task.title}
                  </td>
                  <td className="py-3.5 font-semibold text-slate-600">
                    {task.clientName}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {task.type}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-slate-500">
                    {task.concessionaria || 'Geral'}
                  </td>
                  <td className="py-3.5 font-bold text-slate-800">
                    {task.dueDate}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'Alta'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onUpdateStatus(
                          task.id,
                          e.target.value as TaskItem['status']
                        )
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-full border outline-none cursor-pointer ${
                        task.status === 'Concluída'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : task.status === 'Em andamento'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal New Task */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Criar Nova Tarefa / Homologação
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
                  Título da Tarefa
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Enviar ART e Projeto na Enel"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cliente Associado
                </label>
                <input
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Mercado Bom Preço"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipo de Tarefa
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskItem['type'])}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Homologação">Homologação</option>
                    <option value="Visita Técnica">Visita Técnica</option>
                    <option value="Instalação">Instalação</option>
                    <option value="Vistoria">Vistoria</option>
                    <option value="Reunião Comercial">Reunião Comercial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Concessionária
                  </label>
                  <input
                    type="text"
                    value={concessionaria}
                    onChange={(e) => setConcessionaria(e.target.value)}
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
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
