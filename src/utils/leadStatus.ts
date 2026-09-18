import { LeadStage } from '../types';

export interface LeadStatusStyle {
  key: LeadStage;
  label: string;
  color: string;
  bg: string;
  border: string;
  dotColor: string;
}

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  qualificado: 'Qualificado',
  em_estudo: 'Em estudo',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export const LEAD_STATUS_PALETTE: Record<
  LeadStage,
  {
    label: string;
    darkColor: string;
    lightColor: string;
  }
> = {
  novo: {
    label: 'Novo',
    darkColor: '#38bdf8', // Sky 400
    lightColor: '#0284c7', // Sky 600
  },
  em_contato: {
    label: 'Em contato',
    darkColor: '#fbbf24', // Amber 400
    lightColor: '#d97706', // Amber 600
  },
  qualificado: {
    label: 'Qualificado',
    darkColor: '#c084fc', // Purple 400
    lightColor: '#7c3aed', // Purple 600
  },
  em_estudo: {
    label: 'Em estudo',
    darkColor: '#22d3ee', // Cyan 400
    lightColor: '#0891b2', // Cyan 600
  },
  proposta_enviada: {
    label: 'Proposta enviada',
    darkColor: '#818cf8', // Indigo 400
    lightColor: '#4f46e5', // Indigo 600
  },
  negociacao: {
    label: 'Negociação',
    darkColor: '#fb923c', // Orange 400
    lightColor: '#ea580c', // Orange 600
  },
  ganho: {
    label: 'Ganho',
    darkColor: '#34d399', // Emerald 400
    lightColor: '#059669', // Emerald 600
  },
  perdido: {
    label: 'Perdido',
    darkColor: '#f87171', // Red 400
    lightColor: '#dc2626', // Red 600
  },
};

export function getLeadStatusStyle(status?: LeadStage | string, isLight = false): LeadStatusStyle {
  const stage = status && status in LEAD_STATUS_PALETTE ? (status as LeadStage) : 'novo';
  const item = LEAD_STATUS_PALETTE[stage];
  const color = isLight ? item.lightColor : item.darkColor;

  return {
    key: stage,
    label: item.label,
    color,
    bg: `color-mix(in srgb, ${color} 16%, transparent)`,
    border: `color-mix(in srgb, ${color} 45%, transparent)`,
    dotColor: color,
  };
}
