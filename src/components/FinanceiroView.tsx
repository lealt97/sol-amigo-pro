import React from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  CreditCard,
  Building,
} from 'lucide-react';
import { FinancialRecord, ThemeConfig } from '../types';

interface FinanceiroViewProps {
  records: FinancialRecord[];
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  records,
  theme,
  onShowToast,
}) => {
  const totalReceitas = records
    .filter((r) => r.type === 'Receita')
    .reduce((acc, r) => acc + r.value, 0);

  const totalDespesas = records
    .filter((r) => r.type === 'Despesa')
    .reduce((acc, r) => acc + r.value, 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <div id="financeiro-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            Controladoria / Financiamento Solar
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Gestão Financeira & Fluxo de Caixa
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Acompanhe recebíveis de clientes, financiamentos bancários solares (BV, Santander, Solfácil), comissões de consultores e compra de kits com distribuidores.
          </p>
        </div>

        <button
          onClick={() => onShowToast('Lançamento financeiro registrado com sucesso!')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 4px 14px ${theme.secondary}40`,
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </button>
      </section>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Total de Receitas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            R$ {totalReceitas.toLocaleString('pt-BR')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Vendas e entradas recebidas
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Total de Despesas / Kits
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            R$ {totalDespesas.toLocaleString('pt-BR')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Equipamentos e logística
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Saldo Operacional Líquido
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">
            R$ {saldo.toLocaleString('pt-BR')}
          </div>
          <span className="text-xs font-bold text-emerald-600 mt-1 block">
            Margem comercial estimada: 32%
          </span>
        </div>
      </div>

      {/* Financial Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">
          Lançamentos Recentes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Descrição</th>
                <th className="pb-3">Cliente / Fornecedor</th>
                <th className="pb-3">Categoria</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3">Data</th>
                <th className="pb-3">Valor</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">
                    {r.description}
                  </td>
                  <td className="py-3.5 text-slate-600">
                    {r.clientName || 'Operação Interna'}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3.5 font-bold">
                    <span
                      className={
                        r.type === 'Receita' ? 'text-emerald-600' : 'text-red-600'
                      }
                    >
                      {r.type === 'Receita' ? '+ Receita' : '- Despesa'}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-500 font-semibold">{r.date}</td>
                  <td className="py-3.5 font-black text-slate-900">
                    R$ {r.value.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'Recebido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
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
