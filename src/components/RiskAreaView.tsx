import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { ThemeConfig } from '../types';

interface RiskAreaViewProps {
  theme: ThemeConfig;
}

export const RiskAreaView: React.FC<RiskAreaViewProps> = ({ theme }) => {
  return (
    <div id="area-risco-page" className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-red-400/35 bg-red-500/5 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-200">Área de risco</h2>
            <p className="mt-1 max-w-2xl text-sm opacity-70">
              Esta área será destinada a ações sensíveis e irreversíveis relacionadas à conta.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h3 className="font-bold">Ações destrutivas</h3>
            <p className="mt-1 text-sm opacity-65">
              Nenhuma ação destrutiva está habilitada nesta tela por enquanto. Exclusão definitiva de conta e dados só será adicionada com confirmação explícita.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
