import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Send,
  User,
  X,
} from 'lucide-react';
import { Lead, LeadActivity, LeadTask } from '../../types';
import { completeLeadTask, createLeadTask, registerLeadContact } from '../../services/leads';

interface FollowUpStepProps {
  lead: Lead;
  tasks: LeadTask[];
  activities: LeadActivity[];
  onLeadUpdated: (lead: Lead) => void;
  onTasksUpdated: (tasks: LeadTask[]) => void;
  onActivitiesUpdated: (activities: LeadActivity[]) => void;
  onShowToast: (message: string) => void;
}

export const FollowUpStep: React.FC<FollowUpStepProps> = ({
  lead,
  tasks,
  activities,
  onLeadUpdated,
  onTasksUpdated,
  onActivitiesUpdated,
  onShowToast,
}) => {
  // Estado para criar tarefa
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskPriority, setTaskPriority] = useState<'alta' | 'media' | 'baixa'>('media');
  const [creatingTask, setCreatingTask] = useState(false);

  // Estado para registrar contato
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState('WhatsApp');
  const [contactSummary, setContactSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [registeringContact, setRegisteringContact] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status === 'pendente');
  const completedTasks = tasks.filter((t) => t.status === 'concluida');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || creatingTask) return;

    setCreatingTask(true);
    try {
      const newTask = await createLeadTask(
        lead.id,
        taskTitle.trim(),
        taskDueAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );

      onTasksUpdated([newTask, ...tasks]);
      setTaskTitle('');
      setTaskDueAt('');
      onShowToast('Tarefa agendada com sucesso!');
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao criar tarefa.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const updated = await completeLeadTask(taskId);
      onTasksUpdated(tasks.map((t) => (t.id === taskId ? updated : t)));
      onShowToast('Tarefa concluída!');
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao concluir tarefa.');
    }
  };

  const handleRegisterContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSummary.trim() || registeringContact) return;

    setRegisteringContact(true);
    try {
      const updatedLead = await registerLeadContact(
        lead.id,
        contactChannel,
        contactSummary.trim(),
        nextAction.trim() || undefined
      );

      onLeadUpdated(updatedLead);
      setContactModalOpen(false);
      setContactSummary('');
      setNextAction('');
      onShowToast('Contato registrado no histórico!');
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao registrar contato.');
    } finally {
      setRegisteringContact(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawDigits = (lead.phone || '').replace(/\D/g, '');
    const phoneWithCountry = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const text = encodeURIComponent(
      `Olá, ${lead.name}! Aqui é da equipe Sol Amigo. Gostaria de dar andamento ao seu atendimento de energia solar.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div id="followup-step-container" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">
              Acompanhamento & Tarefas do Atendimento
            </h3>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Mantenha o histórico de contatos atualizado e agende retornos comerciais para não perder a negociação.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setContactModalOpen(true)}
            className="px-3.5 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#30363D] cursor-pointer"
          >
            <Phone className="w-4 h-4 text-blue-400" />
            <span>Registrar Contato</span>
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Conversar no WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Grid: Tarefas e Linha do Tempo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco de Tarefas */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Tarefas & Retornos Comerciais
            </h4>
            <span className="text-xs font-mono font-bold text-[#8B949E]">
              {pendingTasks.length} pendente(s)
            </span>
          </div>

          {/* Form para Agendar Tarefa */}
          <form onSubmit={handleCreateTask} className="space-y-2.5 bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
            <input
              type="text"
              required
              placeholder="Ex: Ligar para confirmar se cliente abriu a proposta..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 text-xs text-white placeholder-[#8B949E] focus:border-blue-500 focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="datetime-local"
                value={taskDueAt}
                onChange={(e) => setTaskDueAt(e.target.value)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 focus:outline-none"
              />

              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="alta">Alta Prioridade</option>
                <option value="media">Média Prioridade</option>
                <option value="baixa">Baixa Prioridade</option>
              </select>

              <button
                type="submit"
                disabled={creatingTask}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Agendar</span>
              </button>
            </div>
          </form>

          {/* Lista de Tarefas */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8B949E]">
                Nenhuma tarefa agendada para este atendimento.
              </div>
            ) : (
              tasks.map((task) => {
                const isDone = task.status === 'concluida';
                const isOverdue =
                  !isDone && task.dueAt && new Date(task.dueAt).getTime() < Date.now();

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      isDone
                        ? 'bg-[#0D1117]/50 border-[#21262D] text-[#8B949E]'
                        : isOverdue
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-[#0D1117] border-[#30363D] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => !isDone && handleCompleteTask(task.id)}
                        disabled={isDone}
                        className="w-4 h-4 rounded border-[#30363D] text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={`block truncate ${isDone ? 'line-through text-[#8B949E]' : 'font-semibold'}`}>
                          {task.title}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Tarefa Atrasada
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-[#8B949E] shrink-0 font-mono">
                      {new Date(task.dueAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Linha do Tempo de Atividades / Auditoria */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Linha do Tempo & Histórico Completo
          </h4>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 text-xs">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8B949E]">
                Nenhuma atividade registrada até o momento.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-[#0D1117] border border-[#30363D] rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{act.title}</span>
                    <span className="text-[10px] text-[#8B949E] font-mono">
                      {new Date(act.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {act.description && (
                    <p className="text-[11px] text-[#8B949E] leading-relaxed">
                      {act.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Registrar Contato */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                Registrar Contato com {lead.name}
              </h3>
              <button
                onClick={() => setContactModalOpen(false)}
                className="text-[#8B949E] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterContact} className="space-y-3 text-xs">
              <div>
                <label className="text-[#8B949E] block mb-1">Canal Utilizado</label>
                <select
                  value={contactChannel}
                  onChange={(e) => setContactChannel(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Ligação">Ligação Telefônica</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Reunião Presencial">Reunião Presencial / Vistoria</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-[#8B949E] block mb-1">Resumo da Conversa</label>
                <textarea
                  required
                  rows={3}
                  value={contactSummary}
                  onChange={(e) => setContactSummary(e.target.value)}
                  placeholder="Ex: Cliente elogiou a proposta, tem interesse em financiar em 60x..."
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[#8B949E] block mb-1">Próximo Passo / Retorno Acordado</label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Ex: Enviar simulação do Santander amanhã às 10h"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-3.5 py-2 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={registeringContact}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {registeringContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Salvar Contato</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
