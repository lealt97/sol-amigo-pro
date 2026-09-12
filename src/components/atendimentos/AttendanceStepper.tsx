import React from 'react';
import {
  Calculator,
  CheckCircle2,
  FileCheck2,
  ListTodo,
  ShieldCheck,
  Trophy,
  User,
} from 'lucide-react';
import { AttendanceTab } from './types';
import { Lead, OpportunitySizing } from '../../types';

interface AttendanceStepperProps {
  currentTab: AttendanceTab;
  onSelectTab: (tab: AttendanceTab) => void;
  lead: Lead;
  sizing: OpportunitySizing | null;
  hasProposal: boolean;
  tasksCount: number;
}

interface StepItem {
  key: AttendanceTab;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  isComplete: boolean;
  badge?: string | number;
}

export const AttendanceStepper: React.FC<AttendanceStepperProps> = ({
  currentTab,
  onSelectTab,
  lead,
  sizing,
  hasProposal,
  tasksCount,
}) => {
  const steps: StepItem[] = [
    {
      key: 'dados',
      label: 'Dados',
      shortLabel: 'Dados',
      icon: User,
      isComplete: Boolean(lead.name && (lead.phone || lead.email)),
    },
    {
      key: 'qualificacao',
      label: 'Qualificação',
      shortLabel: 'Qualif.',
      icon: ShieldCheck,
      isComplete: lead.qualification_status === 'qualificado' || lead.qualification_completed,
    },
    {
      key: 'dimensionamento',
      label: 'Dimensionamento',
      shortLabel: 'Dimens.',
      icon: Calculator,
      isComplete: Boolean(sizing && sizing.status === 'concluido'),
      badge: sizing?.installedPowerKWp ? `${sizing.installedPowerKWp.toFixed(1)} kWp` : undefined,
    },
    {
      key: 'proposta',
      label: 'Proposta',
      shortLabel: 'Proposta',
      icon: FileCheck2,
      isComplete: hasProposal || ['proposta_enviada', 'negociacao', 'ganho'].includes(lead.status),
    },
    {
      key: 'acompanhamento',
      label: 'Acompanhamento',
      shortLabel: 'Acomp.',
      icon: ListTodo,
      isComplete: tasksCount === 0 && Boolean(lead.last_contact_at),
      badge: tasksCount > 0 ? tasksCount : undefined,
    },
    {
      key: 'resultado',
      label: 'Resultado',
      shortLabel: 'Result.',
      icon: Trophy,
      isComplete: lead.status === 'ganho' || lead.status === 'perdido',
      badge: lead.status === 'ganho' ? 'Ganho' : lead.status === 'perdido' ? 'Perdido' : undefined,
    },
  ];

  return (
    <nav
      id="attendance-stepper-nav"
      aria-label="Etapas do Atendimento"
      className="bg-[#161B22] border border-[#30363D] rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-sm"
    >
      {steps.map((step, idx) => {
        const isActive = currentTab === step.key;
        const Icon = step.icon;

        return (
          <button
            key={step.key}
            id={`stepper-tab-${step.key}`}
            onClick={() => onSelectTab(step.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center min-w-[110px] sm:min-w-[130px] cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="w-4 h-4 shrink-0" />
              {step.isComplete && !isActive && (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 absolute -top-1 -right-1" />
              )}
            </div>

            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{step.shortLabel}</span>

            {step.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : step.badge === 'Ganho'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : step.badge === 'Perdido'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-[#21262D] text-[#8B949E] border border-[#30363D]'
                }`}
              >
                {step.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
