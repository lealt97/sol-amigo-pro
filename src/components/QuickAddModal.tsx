import React from 'react';
import {
  Plus,
  FileText,
  Users,
  Target,
  CheckSquare,
  Package,
  DollarSign,
  X,
} from 'lucide-react';
import { PageKey } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
  onOpenNewProposal: () => void;
  onShowToast: (msg: string) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewProposal,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      title: 'Nova Proposta Solar',
      desc: 'Dimensionamento fotovoltaico e geração de PDF comercial',
      icon: FileText,
      color: 'bg-amber-500 text-white',
      action: () => {
        onClose();
        onOpenNewProposal();
      },
    },
    {
      title: 'Novo Cliente',
      desc: 'Cadastro de pessoa física ou jurídica / unidade consumidora',
      icon: Users,
      color: 'bg-blue-500 text-white',
      action: () => {
        onClose();
        onNavigate('clientes');
      },
    },
    {
      title: 'Nova Oportunidade',
      desc: 'Adicionar projeto ao pipeline e funil de vendas solar',
      icon: Target,
      color: 'bg-indigo-500 text-white',
      action: () => {
        onClose();
        onNavigate('oportunidades');
      },
    },
    {
      title: 'Tarefa / Homologação',
      desc: 'Protocolo de acesso e vistoria técnica em concessionária',
      icon: CheckSquare,
      color: 'bg-emerald-500 text-white',
      action: () => {
        onClose();
        onNavigate('tarefas');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Acesso Rápido / Adicionar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={act.action}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all text-left flex flex-col justify-between space-y-2 group"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${act.color} shadow-xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    {act.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                    {act.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
