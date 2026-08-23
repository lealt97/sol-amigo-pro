export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  border: string;
  text: string;
}

export interface PdfSettingsConfig {
  template: string;
  useAccountColors: boolean;
  primary: string;
  secondary: string;
  font: 'Inter' | 'Manrope' | 'Montserrat' | 'Lato';
  showLogo: boolean;
  showCoverPhoto: boolean;
  showFinancial: boolean;
  showEquipment: boolean;
  showEnvironmental: boolean;
  showFooter: boolean;
  customLogoUrl?: string;
  customCoverUrl?: string;
}

export type PageKey =
  | 'dashboard'
  | 'oportunidades'
  | 'clientes'
  | 'empresas'
  | 'propostas'
  | 'contratos'
  | 'produtos'
  | 'tarefas'
  | 'relatorios'
  | 'financeiro'
  | 'personalizacao'
  | 'pdf-customizacoes';

export type OpportunityStage =
  | 'prospeccao'
  | 'visita_tecnica'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado';

export interface SolarProposal {
  id: string;
  code: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCity: string;
  clientState: string;
  concessionaria: string;
  monthlyConsumptionKWh: number;
  currentMonthlyBill?: number;
  systemPowerKWp: number;
  estimatedMonthlyGenKWh: number;
  modulesCount: number;
  moduleModel: string;
  inverterModel: string;
  totalValue: number;
  estimatedMonthlySavings: number;
  paybackYears: number;
  status: 'Aprovada' | 'Em negociação' | 'Pendente' | 'Recusada';
  createdAt: string;
  validUntil?: string;
  co2SavedTonsYear?: number;
  treesEquivalent?: number;
  co2AvoidedTons?: number;
  treesPlanted?: number;
}

export interface Client {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  type: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  email: string;
  phone: string;
  city: string;
  state: string;
  concessionaria: string;
  avgConsumptionKWh: number;
  proposalsCount: number;
  activeStatus: 'Ativo' | 'Em atendimento' | 'Inativo';
}

export interface Opportunity {
  id: string;
  title: string;
  clientName: string;
  value: number;
  stage: OpportunityStage;
  expectedCloseDate: string;
  systemPowerKWp: number;
  assignedTo: string;
}

export interface SolarProduct {
  id: string;
  name: string;
  category: 'Módulo FV' | 'Inversor' | 'Microinversor' | 'Estrutura' | 'String Box' | 'Bateria';
  brand: string;
  model: string;
  powerW?: number;
  efficiency?: string;
  warrantyYears: number;
  unitPrice: number;
  inStock: number;
}

export interface TaskItem {
  id: string;
  title: string;
  clientName: string;
  type: 'Visita Técnica' | 'Homologação' | 'Instalação' | 'Vistoria' | 'Reunião Comercial';
  dueDate: string;
  status: 'Pendente' | 'Em andamento' | 'Concluída';
  concessionaria?: string;
  priority: 'Alta' | 'Média' | 'Baixa';
}

export interface ContractItem {
  id: string;
  code: string;
  clientName: string;
  proposalCode: string;
  totalValue: number;
  systemPowerKWp: number;
  signatureStatus: 'Assinado' | 'Aguardando Assinatura' | 'Em Análise';
  date: string;
}

export interface FinancialRecord {
  id: string;
  type: 'Receita' | 'Despesa';
  description: string;
  clientName?: string;
  category: 'Venda de Sistema' | 'Comissão' | 'Equipamentos' | 'Mão de Obra' | 'Taxa Concessionária';
  value: number;
  status: 'Recebido' | 'Previsto' | 'Atrasado';
  date: string;
}
