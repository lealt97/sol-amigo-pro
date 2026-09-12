import { LeadStage } from '../../types';

export type AttendanceTab =
  | 'dados'
  | 'qualificacao'
  | 'dimensionamento'
  | 'composicao'
  | 'proposta'
  | 'acompanhamento';

export interface AttendanceStageConfig {
  key: LeadStage;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  textColor: string;
  badgeBg: string;
}

export const ATTENDANCE_STAGES: AttendanceStageConfig[] = [
  {
    key: 'novo',
    label: 'Novo Interessado',
    shortLabel: 'Novo',
    description: 'Aguardando primeiro contato',
    color: '#3B82F6',
    textColor: '#93C5FD',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
  },
  {
    key: 'em_contato',
    label: 'Em Contato',
    shortLabel: 'Contato',
    description: 'Interação iniciada com o interessado',
    color: '#0284C7',
    textColor: '#7DD3FC',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
  },
  {
    key: 'qualificado',
    label: 'Qualificado',
    shortLabel: 'Qualificado',
    description: 'Interesse e perfil confirmados (Cliente gerado)',
    color: '#8B5CF6',
    textColor: '#C4B5FD',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
  },
  {
    key: 'em_estudo',
    label: 'Pré-Dimensionamento',
    shortLabel: 'Estudo Técnico',
    description: 'Dimensionamento solar e engenharia',
    color: '#F59E0B',
    textColor: '#FCD34D',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    key: 'proposta_enviada',
    label: 'Proposta Enviada',
    shortLabel: 'Proposta',
    description: 'Proposta comercial apresentada',
    color: '#6366F1',
    textColor: '#A5B4FC',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
  },
  {
    key: 'negociacao',
    label: 'Em Negociação',
    shortLabel: 'Negociação',
    description: 'Alinhamento financeiro e contrato',
    color: '#EA580C',
    textColor: '#FDBA74',
    badgeBg: 'rgba(234, 88, 12, 0.15)',
  },
  {
    key: 'ganho',
    label: 'Venda Fechada',
    shortLabel: 'Ganho',
    description: 'Contrato assinado / Negócio fechado',
    color: '#10B981',
    textColor: '#6EE7B7',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
  },
  {
    key: 'perdido',
    label: 'Perdido',
    shortLabel: 'Perdido',
    description: 'Atendimento arquivado ou sem viabilidade',
    color: '#EF4444',
    textColor: '#FCA5A5',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
  },
];

export const getStageConfig = (stage: LeadStage): AttendanceStageConfig =>
  ATTENDANCE_STAGES.find((s) => s.key === stage) ?? ATTENDANCE_STAGES[0];

export interface CommercialPricing {
  equipmentCost: number;
  laborCost: number;
  engineeringCost: number;
  utilityFee: number;
  freightCost: number;
  otherCosts: number;
  taxesPercent: number;
  commissionPercent: number;
  marginPercent: number;
  discountValue: number;
  totalCost: number;
  grossPrice: number;
  finalPrice: number;
  pricePerWp: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
}
