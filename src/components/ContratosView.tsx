import React from 'react';
import { FileCheck2, Plus, Download, CheckCircle2, Clock } from 'lucide-react';
import { ContractItem, ThemeConfig } from '../types';

interface ContratosViewProps {
  contracts: ContractItem[];
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
}

export const ContratosView: React.FC<ContratosViewProps> = ({
  contracts,
  theme,
  onShowToast,
}) => {
  return (
    <div id="contratos-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <FileCheck2 className="w-3.5 h-3.5" />
            Jurídico & Contratos FV
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Contratos Comerciais & Assinatura Digital
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Gerencie termos de prestação de serviço, cláusulas de homologação, garantia de geração solar e status de assinatura eletrônica (Gov.br / Clicksign / DocuSign).
          </p>
        </div>

        <button
          onClick={() => onShowToast('Novo contrato gerado a partir da proposta aprovada')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 4px 14px ${theme.secondary}40`,
          }}
        >
          <Plus className="w-4 h-4" />
          Gerar Novo Contrato
        </button>
      </section>

      {/* Contracts Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Contrato</th>
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Proposta Ref.</th>
                <th className="pb-3">Potência</th>
                <th className="pb-3">Valor Total</th>
                <th className="pb-3">Data</th>
                <th className="pb-3">Assinatura</th>
                <th className="pb-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contracts.map((ct) => (
                <tr key={ct.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-mono font-bold text-slate-900">
                    {ct.code}
                  </td>
                  <td className="py-3.5 font-bold text-slate-900">
                    {ct.clientName}
                  </td>
                  <td className="py-3.5 font-mono text-slate-500">
                    {ct.proposalCode}
                  </td>
                  <td className="py-3.5 font-bold text-slate-800">
                    {ct.systemPowerKWp} kWp
                  </td>
                  <td className="py-3.5 font-bold text-emerald-600">
                    R$ {ct.totalValue.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 text-slate-500 font-semibold">{ct.date}</td>
                  <td className="py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                        ct.signatureStatus === 'Assinado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ct.signatureStatus === 'Aguardando Assinatura'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ct.signatureStatus === 'Assinado' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                      {ct.signatureStatus === 'Aguardando Assinatura' && (
                        <Clock className="w-3 h-3 text-amber-600" />
                      )}
                      {ct.signatureStatus}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() =>
                        onShowToast(`Baixando cópia em PDF do contrato ${ct.code}...`)
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
