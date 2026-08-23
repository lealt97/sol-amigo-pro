import React from 'react';
import { HelpCircle, BookOpen, Sun, Layers, Sparkles, X, MessageSquare } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Central de Ajuda & Guia Sol Amigo Pro
              </h3>
              <p className="text-xs text-slate-400">
                Instruções de uso do SaaS e dimensionador solar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              Como gerar uma Proposta Solar?
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Clique em <b>"+ Nova Proposta"</b> no topo da página ou no menu rápido. Insira o consumo médio em kWh ou selecione um cliente existente para dimensionar a quantidade de módulos, potência em kWp, inversor e tempo de retorno (payback).
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Como personalizar as cores e os PDFs?
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Acesse <b>Configurações &gt; Personalização</b> para alterar as cores da aplicação (paleta institucional) ou <b>Customizações do PDF</b> para escolher entre os 10 templates, fazer upload do seu logo e definir seções técnicas.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Suporte Técnico & Contato
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dúvidas técnicas ou solicitações de engenharia fotovoltaica podem ser encaminhadas para <b>suporte@solamigo.com.br</b> ou pelo WhatsApp oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
