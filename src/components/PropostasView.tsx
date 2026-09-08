import React from 'react';
import {
  ArrowRight,
  Calculator,
  ClipboardCheck,
  FileText,
  Send,
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface PropostasViewProps {
  theme: ThemeConfig;
  onNavigateToOpportunities: () => void;
}

export const PropostasView: React.FC<PropostasViewProps> = ({
  theme,
  onNavigateToOpportunities,
}) => {
  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  return (
    <div id="propostas-page" className="mx-auto max-w-7xl space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: mutedText }}
          >
            <FileText className="h-4 w-4" /> Comercial · Propostas
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Propostas</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: mutedText }}>
            Transforme o dimensionamento aprovado em uma apresentação comercial clara para o cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToOpportunities}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-extrabold"
          style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
        >
          Ver oportunidades <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Calculator,
            title: '1. Dimensionamento',
            description: 'Dados técnicos e geração estimada da oportunidade.',
          },
          {
            icon: ClipboardCheck,
            title: '2. Condições comerciais',
            description: 'Kit, escopo, investimento, validade e condições de pagamento.',
          },
          {
            icon: Send,
            title: '3. Envio e acompanhamento',
            description: 'PDF, aceite e evolução da negociação no histórico.',
          },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <article
              key={step.title}
              className="rounded-xl border p-4"
              style={{ backgroundColor: panelBg, borderColor: theme.border }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
                  color: theme.secondary,
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h2 className="mt-3 text-sm font-extrabold">{step.title}</h2>
              <p className="mt-1 text-xs leading-5" style={{ color: mutedText }}>
                {step.description}
              </p>
            </article>
          );
        })}
      </section>

      <section
        className="rounded-xl border p-5 sm:p-8"
        style={{ backgroundColor: panelBg, borderColor: theme.border }}
      >
        <div
          className="mx-auto flex max-w-xl flex-col items-center rounded-xl border border-dashed px-5 py-10 text-center"
          style={{ backgroundColor: panelAltBg, borderColor: theme.border }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
              color: theme.secondary,
            }}
          >
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-extrabold">Nenhuma proposta criada</h2>
          <p className="mt-2 text-xs leading-5" style={{ color: mutedText }}>
            As propostas serão geradas a partir das oportunidades qualificadas que já possuem um dimensionamento solar.
          </p>
          <button
            type="button"
            onClick={onNavigateToOpportunities}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-extrabold"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Abrir funil de oportunidades <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
