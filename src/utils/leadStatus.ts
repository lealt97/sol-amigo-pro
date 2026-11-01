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
  proposta_enviada: 'Proposta enviada',
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
  proposta_enviada: {
    label: 'Proposta enviada',
    darkColor: '#818cf8', // Indigo 400
    lightColor: '#4f46e5', // Indigo 600
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

/**
 * Normaliza qualquer status legado ou variação para os 5 status objetivos do funil:
 * - novo: Lead recebido
 * - em_contato: Em atendimento / conversa / qualificação
 * - proposta_enviada: Proposta calculada e apresentada / negociação
 * - ganho: Venda fechada / cliente
 * - perdido: Desistência / inviável
 */
export function normalizeLeadStage(status?: string | null): LeadStage {
  if (!status) return 'novo';
  const clean = status.toLowerCase().trim();
  if (clean === 'novo' || clean === 'novo lead' || clean === 'novo_lead') return 'novo';
  if (
    clean === 'em_contato' ||
    clean === 'em contato' ||
    clean === 'qualificado' ||
    clean === 'em_estudo' ||
    clean === 'em estudo' ||
    clean === 'atendimento' ||
    clean === 'em_atendimento'
  ) {
    return 'em_contato';
  }
  if (
    clean === 'proposta_enviada' ||
    clean === 'proposta enviada' ||
    clean === 'negociacao' ||
    clean === 'negociação' ||
    clean === 'em_negociacao' ||
    clean === 'em negociação'
  ) {
    return 'proposta_enviada';
  }
  if (clean === 'ganho' || clean === 'cliente' || clean === 'contrato assinado' || clean === 'fechado') {
    return 'ganho';
  }
  if (clean === 'perdido' || clean === 'descartado' || clean === 'inviavel' || clean === 'inviável') {
    return 'perdido';
  }
  return 'novo';
}

export function getLeadStatusStyle(status?: LeadStage | string, isLight = false): LeadStatusStyle {
  const stage = normalizeLeadStage(status);
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
