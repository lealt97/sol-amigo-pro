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
  | 'levantamento'
  | 'empresas'
  | 'propostas'
  | 'contratos'
  | 'produtos'
  | 'tarefas'
  | 'relatorios'
  | 'financeiro'
  | 'perfil'
  | 'personalizacao'
  | 'pdf-customizacoes'
  | 'integracoes'
  | 'seguranca'
  | 'area-risco';

export type OpportunityStage =
  | 'lead'
  | 'qualificacao'
  | 'levantamento'
  | 'dimensionamento'
  | 'kit_custos'
  | 'proposta'
  | 'negociacao'
  | 'fechado'
  | 'perdido'
  // Etapas legadas mantidas temporariamente para compatibilidade com dados antigos.
  | 'prospeccao'
  | 'visita_tecnica'
  | 'proposta_enviada';

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

export type ClientCrmStatus =
  | 'Novo lead'
  | 'Em contato'
  | 'Qualificado'
  | 'Proposta enviada'
  | 'Negociação'
  | 'Cliente'
  | 'Perdido';

export interface Client {
  id: string;
  name: string;
  document: string;
  type: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  email: string;
  phone: string;
  city: string;
  state: string;
  concessionaria: string;
  avgConsumptionKWh: number;
  proposalsCount: number;
  activeStatus: 'Ativo' | 'Em atendimento' | 'Inativo';
  crmStatus?: ClientCrmStatus;
  responsible?: string;
  source?: string;
  lastInteraction?: string;
  createdAt?: string;
  avgMonthlyBill?: number;
  connectionType?: 'Monofásica' | 'Bifásica' | 'Trifásica';
  consumerUnit?: string;
  tags?: string[];
}

export type LeadStage =
  | 'novo'
  | 'em_contato'
  | 'qualificado'
  | 'em_estudo'
  | 'proposta_enviada'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

export interface Lead {
  id: string;
  userId: string;
  captureFormId?: string;
  clientId?: string;
  consumerUnitId?: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  propertyType: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  distributor?: string;
  propertyStatus?: 'Próprio' | 'Alugado' | 'Em construção' | 'Outro';
  installationTimeframe?: string;
  preferredContactTime?: string;
  status: LeadStage;
  responsible?: string;
  source: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  consentAt: string;
  nextActivityAt?: string;
  lastSubmissionAt: string;
  notes?: string;
  qualifiedAt?: string;
  lostAt?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadTaskStatus = 'pendente' | 'concluida';

export interface LeadTask {
  id: string;
  userId: string;
  leadId: string;
  title: string;
  dueAt: string;
  status: LeadTaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadActivityType =
  | 'lead_criado'
  | 'status_alterado'
  | 'contato'
  | 'nota'
  | 'tarefa_criada'
  | 'tarefa_concluida'
  | 'qualificado'
  | 'conversao'
  | 'perdido'
  | 'reaberto';

export interface LeadActivity {
  id: string;
  userId: string;
  leadId: string;
  activityType: LeadActivityType;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LeadCaptureForm {
  id: string;
  publicToken: string;
  name: string;
  active: boolean;
}

export interface WebsiteFormSettings extends LeadCaptureForm {
  widgetEnabled: boolean;
  allowedOrigins: string[];
  serviceStates: string[];
  widgetMode: 'inline' | 'modal';
  companyName: string;
  logoUrl: string;
  sideImageUrls: string[];
  sideImageRotationEnabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  headline: string;
  subheadline: string;
  submitLabel: string;
  successMessage: string;
  privacyUrl: string;
  showPoweredBy: boolean;
  customCssEnabled: boolean;
  customCss: string;
}

export type QualificationStatus = 'pendente' | 'qualificado' | 'nao_qualificado';

export interface OpportunityQualification {
  customerProfile?: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  averageMonthlyBill?: number;
  propertyOwnership?: 'Próprio' | 'Alugado' | 'Outro';
  decisionMaker?: 'Sim' | 'Não' | 'Compartilhada';
  interestLevel?: 'Baixo' | 'Médio' | 'Alto';
  purchaseTimeframe?: 'Até 30 dias' | '1 a 3 meses' | '3 a 6 meses' | 'Mais de 6 meses' | 'Sem prazo';
  paymentPreference?: 'À vista' | 'Financiamento' | 'Ainda não definido';
  mainObjective?: string;
  notes?: string;
  status: QualificationStatus;
  updatedAt: string;
}

export interface EnergySurvey {
  id: string;
  opportunityId: string;
  clientName: string;
  concessionaria: string;
  consumerUnit: string;
  connectionType: 'Monofásica' | 'Bifásica' | 'Trifásica';
  consumerClass: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  tariffMode: 'Convencional' | 'Tarifa Branca' | 'Grupo A';
  installationAddress: string;
  monthlyConsumptionKWh: number[];
  averageConsumptionKWh: number;
  currentMonthlyBill: number;
  tariffPerKWh: number;
  notes: string;
  status?: 'rascunho' | 'concluido';
  updatedAt: string;
}

export type SizingStatus = 'rascunho' | 'concluido';
export type SizingInputMethod = 'consumo_medio' | 'levantamento_carga';

export interface LoadSurveyItem {
  id: string;
  description: string;
  quantity: number;
  powerW: number;
  hoursPerDay: number;
  daysPerMonth: number;
}

export interface OpportunitySizing {
  inputMethod: SizingInputMethod;
  directAverageConsumptionKWh: number;
  loadSurveyItems: LoadSurveyItem[];
  loadSurveyMonthlyConsumptionKWh: number;
  sourceConsumptionKWh: number;
  sunHoursPerDay: number;
  performanceRatio: number;
  targetCoveragePercent: number;
  futureConsumptionKWh: number;
  modulePowerW: number;
  moduleAreaM2: number;
  designConsumptionKWh: number;
  requiredPowerKWp: number;
  modulesCount: number;
  installedPowerKWp: number;
  estimatedMonthlyGenerationKWh: number;
  estimatedAnnualGenerationKWh: number;
  estimatedCoveragePercent: number;
  estimatedAreaM2: number;
  status: SizingStatus;
  updatedAt: string;
}

export interface KitEquipmentItem {
  id: string;
  productId?: string;
  description: string;
  category: string;
  quantity: number;
  unitCost: number;
}

export type KitCostsStatus = 'rascunho' | 'concluido';

export interface OpportunityKitCosts {
  equipmentItems: KitEquipmentItem[];
  installationCost: number;
  engineeringCost: number;
  utilityFee: number;
  freightCost: number;
  otherCosts: number;
  taxesPercent: number;
  commissionPercent: number;
  grossSalePrice: number;
  discountValue: number;
  equipmentCost: number;
  fixedCosts: number;
  taxesValue: number;
  commissionValue: number;
  totalCost: number;
  finalSalePrice: number;
  profit: number;
  marginPercent: number;
  pricePerWp: number;
  status: KitCostsStatus;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  source?: string;
  value: number;
  stage: OpportunityStage;
  expectedCloseDate: string;
  systemPowerKWp: number;
  assignedTo: string;
  createdAt?: string;
  qualification?: OpportunityQualification;
  energySurvey?: EnergySurvey;
  sizing?: OpportunitySizing;
  kitCosts?: OpportunityKitCosts;
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
