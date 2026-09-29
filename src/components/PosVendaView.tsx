import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardCheck, Search, ShieldCheck, Wrench } from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import { ClientProposal, fetchAllClientProposals } from '../services/proposals';

interface PosVendaViewProps {
  theme: ThemeConfig;
  onNavigate?: (page: PageKey, filter?: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const PosVendaView: React.FC<PosVendaViewProps> = ({ theme, onNavigate }) => {
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchAllClientProposals().then(setProposals);
  }, []);

  const plans = useMemo(
    () => proposals.filter((proposal) => proposal.maintenancePlan?.enabled),
    [proposals]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    if (!q) return plans;
    return plans.filter((proposal) =>
      [proposal.clientName, proposal.code, proposal.maintenancePlan?.name, proposal.moduleModel, proposal.inverterModel]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(q))
    );
  }, [plans, search]);

  const approved = plans.filter((proposal) => proposal.status === 'Aprovada').length;
  const annualPortfolioValue = plans.reduce(
    (sum, proposal) => sum + Math.max(0, Number(proposal.maintenancePlan?.annualPrice) || 0),
    0
  );

  return (
    <div id="pos-venda-page" className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: theme.border }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dim)]">Pós-venda</div>
          <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Manutenção Fotovoltaica</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Carteira de planos de manutenção incluídos nas propostas. Esta base será usada para ativar sistemas instalados, agendas, checklists e histórico técnico.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Planos incluídos', value: String(plans.length), Icon: Wrench },
          { label: 'Propostas aprovadas', value: String(approved), Icon: ShieldCheck },
          { label: 'Aguardando aprovação', value: String(Math.max(0, plans.length - approved)), Icon: CalendarClock },
          { label: 'Receita anual prevista', value: money.format(annualPortfolioValue), Icon: ClipboardCheck },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted)]">{label}</span>
              <Icon className="h-4 w-4" style={{ color: theme.secondary }} />
            </div>
            <div className="mt-2 text-xl font-black text-[var(--text)]">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, proposta, plano ou equipamento..."
            className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-4 text-sm outline-none focus:border-[var(--secondary)]"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: theme.border }}>
          <Wrench className="mx-auto h-9 w-9 text-[var(--muted)]" />
          <h3 className="mt-3 text-base font-bold text-[var(--text)]">Nenhum plano de manutenção encontrado</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Inclua um plano durante a criação da proposta. Ele aparecerá automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((proposal) => {
            const plan = proposal.maintenancePlan!;
            const isApproved = proposal.status === 'Aprovada';
            return (
              <article key={proposal.id} className="rounded-2xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{proposal.code}</div>
                    <h3 className="mt-1 text-base font-black text-[var(--text)]">{proposal.clientName}</h3>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {proposal.systemPowerKWp.toFixed(2)} kWp • {proposal.systemType}
                    </div>
                  </div>
                  <span
                    className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      borderColor: isApproved ? 'rgba(16,185,129,.35)' : theme.border,
                      color: isApproved ? '#10b981' : theme.text,
                    }}
                  >
                    {isApproved ? 'Pronto para ativação' : proposal.status}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text)]">{plan.name}</div>
                      <div className="mt-1 text-[11px] text-[var(--muted)]">
                        {plan.visitsPerYear} visita(s)/ano • a cada {plan.frequencyMonths} meses
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-[var(--muted)]">Valor anual</div>
                      <div className="text-sm font-black text-emerald-500">{money.format(plan.annualPrice)}</div>
                    </div>
                  </div>
                  {plan.includedServices.length > 0 && (
                    <div className="mt-3 text-[11px] text-[var(--muted)]">
                      {plan.includedServices.slice(0, 3).join(' • ')}
                      {plan.includedServices.length > 3 ? ` • +${plan.includedServices.length - 3}` : ''}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigate?.('propostas', proposal.code)}
                    className="rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:border-[var(--secondary)]"
                    style={{ borderColor: theme.border }}
                  >
                    Abrir proposta
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
