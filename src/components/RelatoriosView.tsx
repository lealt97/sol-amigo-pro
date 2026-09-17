import React from 'react';
import {
  BarChart3,
  Sun,
  Zap,
  TrendingUp,
  Download,
  Leaf,
  Calendar,
} from 'lucide-react';
import { ThemeConfig } from '../types';

interface RelatoriosViewProps {
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  theme,
  onShowToast,
}) => {
  return (
    <div id="relatorios-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Inteligência & Analytics Solar
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Relatórios de Desempenho & Geração Solar
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Análises de conversão comercial, curva de irradiação solar mensal (kWh/m²), emissões de carbono mitigadas e faturamento anual.
          </p>
        </div>

        <button
          onClick={() => onShowToast('Exportando relatório consolidado em PDF/Excel...')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-95 shrink-0"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 4px 14px ${theme.secondary}40`,
          }}
        >
          <Download className="w-4 h-4" />
          Exportar Relatório Geral
        </button>
      </section>

      {/* Environmental & Performance Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">
              Energia Total Gerada
            </span>
            <div className="text-xl font-black text-slate-900">
              184.200 kWh/ano
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              Projetos instalados ativos
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">
              CO₂ Evitado na Atmosfera
            </span>
            <div className="text-xl font-black text-emerald-600">
              89.4 Toneladas
            </div>
            <span className="text-[11px] text-slate-500">
              Equivalente a 558 árvores
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">
              Taxa de Conversão Funil
            </span>
            <div className="text-xl font-black text-blue-600">
              69.5% de Fechamento
            </div>
            <span className="text-[11px] text-slate-500">
              Acima da média de mercado (50%)
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Generation Estimation Graph */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Irradiação & Geração Solar Estimada por Mês (kWh)
            </h3>
            <p className="text-xs text-slate-400">
              Média histórica considerando índices CRESESB / NASA SSE para o Sudeste
            </p>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between gap-2 md:gap-4 pt-8 px-2">
          {[
            { mes: 'Jan', val: 92, kwh: '18.400' },
            { mes: 'Fev', val: 86, kwh: '17.200' },
            { mes: 'Mar', val: 88, kwh: '17.600' },
            { mes: 'Abr', val: 78, kwh: '15.600' },
            { mes: 'Mai', val: 68, kwh: '13.600' },
            { mes: 'Jun', val: 64, kwh: '12.800' },
            { mes: 'Jul', val: 70, kwh: '14.000' },
            { mes: 'Ago', val: 82, kwh: '16.400' },
            { mes: 'Set', val: 85, kwh: '17.000' },
            { mes: 'Out', val: 89, kwh: '17.800' },
            { mes: 'Nov', val: 94, kwh: '18.800' },
            { mes: 'Dez', val: 96, kwh: '19.200' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold bg-slate-900 text-white px-1 py-0.5 rounded whitespace-nowrap">
                {item.kwh} kWh
              </div>
              <div className="w-full bg-slate-100 rounded-t-lg h-44 flex items-end overflow-hidden">
                <div
                  className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                  style={{
                    height: `${item.val}%`,
                    background: `linear-gradient(180deg, ${theme.secondary}, ${theme.accent})`,
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                {item.mes}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
