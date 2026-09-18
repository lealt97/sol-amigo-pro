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
  | 'leads'
  | 'clientes'
  | 'dimensionamento'
  | 'propostas'
  | 'kits'
  | 'pos-venda'
  | 'anotacoes'
  | 'levantamento'
  | 'empresas'
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

export type ProposalStatus =
  | 'rascunho'
  | 'pronta'
  | 'enviada'
  | 'visualizada'
  | 'em_negociacao'
  | 'aprovada'
  | 'recusada'
  | 'expirada'
  | 'cancelada'
  | 'convertida';

export type ProposalVersionStatus =
  | 'rascunho'
  | 'pronta'
  | 'enviada'
  | 'visualizada'
  | 'aprovada'
  | 'recusada'
  | 'expirada'
  | 'cancelada'
  | 'substituida';

export interface ProposalVersion {
  id: string;
  proposalId: string;
  userId: string;
  versionNumber: number;
  status: ProposalVersionStatus;
  validUntil?: string;
  totalValue: number;
  sizingSnapshot: OpportunitySizing;
  equipmentSnapshot: KitEquipmentItem[];
  costsSnapshot: OpportunityKitCosts;
  commercialConditions: {
    paymentMethods?: string;
    warrantyTerms?: string;
    deliveryTimeframe?: string;
    notes?: string;
  };
  pdfSettingsSnapshot?: PdfSettingsConfig;
  customNotes?: string;
  sentAt?: string;
  viewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ProposalRecord {
  id: string;
  userId: string;
  leadId: string;
  code: string;
  sizingId?: string;
  status: ProposalStatus;
  currentVersionNumber: number;
  totalValue: number;
  validUntil?: string;
  sentAt?: string;
  viewedAt?: string;
  decidedAt?: string;
  decisionNotes?: string;
  createdAt: string;
  updatedAt: string;
  versions?: ProposalVersion[];
  currentVersion?: ProposalVersion;
  publicLink?: {
    token: string;
    expiresAt: string;
  };
}

export interface SolarProposal {
  id: string;
  code: string;
  publicToken?: string;
  versionNumber?: number;
  versionsCount?: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCity: string;
  clientState: string;
  concessionaria: string;
  monthlyConsumptionKWh: number;
  currentMonthlyBill?: number;
  systemPowerKWp: number;
  systemType?: 'On-Grid' | 'Híbrido';
  estimatedMonthlyGenKWh: number;
  modulesCount: number;
  moduleModel: string;
  inverterModel: string;
  batteryModel?: string;
  batteryCount?: number;
  batteryCapacityKWh?: number;
  totalValue: number;
  estimatedMonthlySavings: number;
  paybackYears: number;
  status: 'Aprovada' | 'Em negociação' | 'Pendente' | 'Recusada' | 'Enviada' | 'Visualizada' | 'Rascunho';
  createdAt: string;
  validUntil?: string;
  co2SavedTonsYear?: number;
  treesEquivalent?: number;
  co2AvoidedTons?: number;
  treesPlanted?: number;
  sizing?: OpportunitySizing;
  pricing?: OpportunityKitCosts;
  commercialConditions?: {
    paymentMethods?: string;
    warrantyTerms?: string;
    deliveryTimeframe?: string;
    notes?: string;
  };
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
  userId?: string;
  sourceLeadId?: string;
  name: string;
  document?: string;
  type: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  propertyType?: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  email: string;
  phone: string;
  city: string;
  state: string;
  concessionaria?: string;
  avgConsumptionKWh?: number;
  proposalsCount?: number;
  activeStatus?: 'Ativo' | 'Em atendimento' | 'Inativo';
  status?: 'ativo' | 'inativo';
  crmStatus?: ClientCrmStatus;
  responsible?: string;
  source?: string;
  lastInteraction?: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
  trashedAt?: string;
  avgMonthlyBill?: number;
  connectionType?: 'Monofásica' | 'Bifásica' | 'Trifásica';
  consumerUnit?: string;
  tags?: string[];
}

export interface ConsumerUnit {
  id: string;
  userId: string;
  clientId: string;
  sourceLeadId?: string;
  name: string;
  city: string;
  state: string;
  propertyType: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  distributor?: string;
  connectionType?: 'Monofásica' | 'Bifásica' | 'Trifásica';
  voltage?: '127V' | '220V' | '380V';
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  archivedAt?: string;
  trashedAt?: string;
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
  | 'reaberto'
  | 'dimensionamento'
  | 'proposta_criada'
  | 'proposta_enviada'
  | 'proposta_visualizada'
  | 'proposta_aprovada'
  | 'proposta_recusada'
  | 'proposta_expirada'
  | 'proposta_cancelada'
  | 'proposta_revisada'
  | 'documento_recebido';

export interface LeadDocument {
  id: string;
  userId: string;
  leadId: string;
  documentType: 'energy_bill';
  bucketId: 'lead-energy-bills';
  objectPath: string;
  originalName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  uploadedVia: 'public_form' | 'integrator';
  createdAt: string;
}

export interface LeadQualification {
  id: string;
  leadId: string;
  propertyType: Lead['propertyType'];
  propertyStatus?: Lead['propertyStatus'];
  connectionType: SolarConnectionType;
  distributor?: string;
  averageMonthlyBill?: number;
  averageConsumptionKWh?: number;
  roofType?: string;
  availableAreaM2?: number;
  roofOrientation?: string;
  hasShading?: string;
  decisionMaker?: string;
  installationTimeframe?: string;
  responsible?: string;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
}

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

export type FormColorMode = 'automatic' | 'detailed';
export type FormBorderRadiusMode = 'automatic' | 'manual';

export interface FormThemeColors {
  pageBackground: string;
  cardBackground: string;
  headerBackground: string;
  headerText: string;
  headerMutedText: string;
  bodyText: string;
  mutedText: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  primaryButtonBackground: string;
  primaryButtonText: string;
  primaryButtonHover: string;
  primaryButtonHoverText: string;
  secondaryButtonBackground: string;
  secondaryButtonText: string;
  progressActive: string;
  progressInactive: string;
  consentBackground: string;
  successBackground: string;
  successAccent: string;
  errorBackground: string;
  errorAccent: string;
}

export interface WebsiteFormSettings extends LeadCaptureForm {
  widgetEnabled: boolean;
  allowedOrigins: string[];
  serviceStates: string[];
  widgetMode: 'inline' | 'modal' | 'both';
  companyName: string;
  logoUrl: string;
  floatingButtonLogoUrl?: string;
  sideImageUrls: string[];
  sideImageRotationEnabled: boolean;
  borderRadiusMode: FormBorderRadiusMode;
  borderRadius: number;
  colorMode: FormColorMode;
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  themeColors: FormThemeColors;
  headline: string;
  subheadline: string;
  submitLabel: string;
  successMessage: string;
  successTitle?: string;
  nextStepTitle?: string;
  nextStepDescription?: string;
  showNextStep?: boolean;
  actionButtonLabel?: string;
  actionButtonUrl?: string;
  privacyUrl: string;
  showPoweredBy: boolean;
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
export type SolarConnectionType = 'Monofásica' | 'Bifásica' | 'Trifásica';
export type SolarSystemType = 'On-Grid' | 'Híbrido';

export interface HybridPriorityLoad {
  id: string;
  name: string;
  quantity: number;
  powerW: number;
  surgePowerW: number;
  usageHours: number;
  simultaneous: boolean;
}

export interface SolarSizingInputs {
  systemType?: SolarSystemType;
  connectionType: SolarConnectionType;
  monthlyConsumptionKWh: number[];
  monthlySunHours: number[];
  targetCoveragePercent: number;
  futureConsumptionKWh: number;
  inclinationFactor: number;
  temperatureLossPercent: number;
  otherLossesPercent: number;
  transformerLossPercent: number;
  modulePowerW: number;
  moduleAreaM2: number;
  inverterPowerKW: number;
  inverterCount: number;
  batteryCapacityKWh?: number;
  batteryCount?: number;
  batteryDepthOfDischarge?: number;
  hybridLoads?: HybridPriorityLoad[];
  backupAutonomyHours?: number;
  batteryReservePercent?: number;
  batteryEfficiencyPercent?: number;
  hybridInverterEfficiencyPercent?: number;
  hybridInverterPowerKW?: number;
  hybridInverterSurgePowerKW?: number;
  installationCep?: string;
  installationAddress?: string;
  installationCity?: string;
  installationState?: string;
  roofType?: string;
  roofOrientation?: string;
  roofShading?: string;
  hspSource?: 'padrao' | 'manual';
  notes: string;
}

export interface SolarSizingResults {
  averageConsumptionKWh: number;
  availabilityCostKWh: number;
  compensableConsumptionKWh: number;
  designConsumptionKWh: number;
  averageCorrectedSunHours: number;
  totalLossPercent: number;
  performanceRatio: number;
  theoreticalPowerKWp: number;
  requiredPowerKWp: number;
  modulesCount: number;
  installedPowerKWp: number;
  estimatedMonthlyGenerationKWh: number;
  estimatedAnnualGenerationKWh: number;
  estimatedCoveragePercent: number;
  estimatedAreaM2: number;
  dcAcRatio: number;
  dcAcStatus: 'ok' | 'atencao';
  monthlyGenerationKWh: number[];
  batteryAutonomyHours?: number;
  batteryTotalCapacityKWh?: number;
  backupEnergyKWh?: number;
  backupSimultaneousPowerKW?: number;
  backupSurgePowerKW?: number;
  requiredBatteryCapacityKWh?: number;
  requiredBatteryCount?: number;
  installedUsableBatteryKWh?: number;
  minimumHybridInverterPowerKW?: number;
  hybridWarnings?: string[];
}

export interface SizingAssumptions {
  inflationRatePercent?: number;
  energyTariffInflationPercent?: number;
  simulatedYears?: number;
  moduleDegradationFirstYearPercent?: number;
  moduleDegradationAnnualPercent?: number;
}

export interface OpportunitySizing extends SolarSizingInputs, SolarSizingResults {
  id: string;
  userId?: string;
  name?: string;
  leadId?: string;
  clientId?: string;
  consumerUnitId?: string;
  opportunityId?: string;
  calculationVersion: 'sa-sizing-v1';
  status: SizingStatus;
  assumptions?: SizingAssumptions;
  inputData?: Partial<SolarSizingInputs>;
  resultData?: Partial<SolarSizingResults>;
  warnings?: string[];
  archivedAt?: string;
  completedAt?: string;
  createdAt: string;
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
  targetMarginPercent?: number;
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

export type CatalogCategory = 'Módulo FV'|'Inversor'|'Microinversor'|'Bateria'|'Estrutura'|'String Box'|'Proteção'|'Cabo'|'Serviço'|'Outros';
export interface CatalogProduct { id:string; sku?:string; name:string; category:CatalogCategory; brand:string; model:string; description:string; powerW?:number; capacityKWh?:number; warrantyYears:number; unitCost:number; active:boolean; }
export interface SolarKitItem { id:string; productId:string; quantity:number; product:CatalogProduct; }
export interface SolarKit { id:string; name:string; sku?:string; systemType:SolarSystemType; minPowerKWp:number; maxPowerKWp:number; installationCost:number; engineeringCost:number; utilityFee:number; freightCost:number; otherCosts:number; taxesPercent:number; commissionPercent:number; targetMarginPercent:number; warrantyTerms:string; notes:string; active:boolean; items:SolarKitItem[]; }

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
