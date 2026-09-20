export interface ClientProposal {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  title: string;
  systemPowerKWp: number;
  systemType: 'On-Grid' | 'Híbrido' | 'Off-Grid';
  totalValue: number;
  status: 'Aprovada' | 'Em negociação' | 'Pendente' | 'Recusada' | 'Enviada' | 'Visualizada' | 'Rascunho';
  modulesCount?: number;
  moduleModel?: string;
  inverterModel?: string;
  batteryModel?: string;
  batteryCount?: number;
  estimatedMonthlyGenKWh?: number;
  estimatedMonthlySavings?: number;
  notes?: string;
  createdAt: string;
}

export const PROPOSALS_STORAGE_KEY = 'solamigo.proposals.v1';
export const PROPOSALS_UPDATED_EVENT = 'solamigo:proposals-updated';

export const INITIAL_CLIENT_PROPOSALS: ClientProposal[] = [
  {
    id: 'prop-1',
    code: 'PROP-2026-084',
    clientId: 'cli-1',
    clientName: 'Fazenda Santa Rita',
    title: 'Opção 1: 28.08 kWp • Galpão de Ordenha (On-Grid)',
    systemPowerKWp: 28.08,
    systemType: 'On-Grid',
    totalValue: 98500.0,
    status: 'Aprovada',
    modulesCount: 48,
    moduleModel: 'Jinko Solar Tiger Neo 585W N-Type Bifacial',
    inverterModel: 'Deye SUN-25K-G04 Trifásico 380V',
    estimatedMonthlyGenKWh: 3360,
    estimatedMonthlySavings: 2850.0,
    createdAt: '2026-08-23T14:30:00.000Z',
  },
  {
    id: 'prop-1-b',
    code: 'PROP-2026-089',
    clientId: 'cli-1',
    clientName: 'Fazenda Santa Rita',
    title: 'Opção 2: 35.10 kWp • Híbrido c/ Bateria Deye 15kWh',
    systemPowerKWp: 35.1,
    systemType: 'Híbrido',
    totalValue: 145000.0,
    status: 'Em negociação',
    modulesCount: 60,
    moduleModel: 'Jinko Solar Tiger Neo 585W N-Type Bifacial',
    inverterModel: 'Deye SUN-30K-SG01HP3 Trifásico Híbrido',
    batteryModel: 'Deye BOS-G LiFePO4 15.36kWh',
    batteryCount: 1,
    estimatedMonthlyGenKWh: 4200,
    estimatedMonthlySavings: 3570.0,
    createdAt: '2026-09-02T10:15:00.000Z',
  },
  {
    id: 'prop-2',
    code: 'PROP-2026-083',
    clientId: 'cli-2',
    clientName: 'Mercado Bom Preço Ltda',
    title: 'Proposta Principal: 16.38 kWp • Telhado Loja Matriz',
    systemPowerKWp: 16.38,
    systemType: 'On-Grid',
    totalValue: 58900.0,
    status: 'Em negociação',
    modulesCount: 28,
    moduleModel: 'Longi Solar Hi-MO 6 Explorer 585W',
    inverterModel: 'Growatt MID 15KTL3-X',
    estimatedMonthlyGenKWh: 1960,
    estimatedMonthlySavings: 1820.0,
    createdAt: '2026-08-22T09:20:00.000Z',
  },
  {
    id: 'prop-2-b',
    code: 'PROP-2026-095',
    clientId: 'cli-2',
    clientName: 'Mercado Bom Preço Ltda',
    title: 'Proposta Alternativa: 22.50 kWp • Expansão Câmara Fria',
    systemPowerKWp: 22.5,
    systemType: 'On-Grid',
    totalValue: 76500.0,
    status: 'Rascunho',
    modulesCount: 38,
    moduleModel: 'Longi Solar Hi-MO 6 Explorer 585W',
    inverterModel: 'Growatt MID 20KTL3-X',
    estimatedMonthlyGenKWh: 2700,
    estimatedMonthlySavings: 2430.0,
    createdAt: '2026-09-10T16:45:00.000Z',
  },
  {
    id: 'prop-3',
    code: 'PROP-2026-082',
    clientId: 'cli-3',
    clientName: 'Carlos Eduardo Ferreira',
    title: 'Proposta Residencial: 5.85 kWp • Monofásico Telhado Cerâmico',
    systemPowerKWp: 5.85,
    systemType: 'On-Grid',
    totalValue: 24300.0,
    status: 'Aprovada',
    modulesCount: 10,
    moduleModel: 'Canadian Solar HiKu6 585W',
    inverterModel: 'Fronius Primo 5.0-1 Monofásico',
    estimatedMonthlyGenKWh: 700,
    estimatedMonthlySavings: 630.0,
    createdAt: '2026-08-20T11:00:00.000Z',
  },
  {
    id: 'prop-3-b',
    code: 'PROP-2026-091',
    clientId: 'cli-3',
    clientName: 'Carlos Eduardo Ferreira',
    title: 'Revisão Premium: 7.20 kWp • C/ Carregador Veicular Wallbox',
    systemPowerKWp: 7.2,
    systemType: 'On-Grid',
    totalValue: 33800.0,
    status: 'Pendente',
    modulesCount: 12,
    moduleModel: 'Canadian Solar HiKu6 600W Bifacial',
    inverterModel: 'Fronius Primo 6.0-1 Monofásico',
    estimatedMonthlyGenKWh: 864,
    estimatedMonthlySavings: 780.0,
    createdAt: '2026-09-05T14:10:00.000Z',
  },
  {
    id: 'prop-4',
    code: 'PROP-2026-081',
    clientId: 'cli-4',
    clientName: 'Auto Posto Alvorada',
    title: 'Proposta A: 39.78 kWp • Carport Pista de Abastecimento',
    systemPowerKWp: 39.78,
    systemType: 'On-Grid',
    totalValue: 139000.0,
    status: 'Pendente',
    modulesCount: 68,
    moduleModel: 'JA Solar DeepBlue 4.0 Pro 585W',
    inverterModel: 'Sungrow SG33CX Trifásico',
    estimatedMonthlyGenKWh: 4600,
    estimatedMonthlySavings: 4100.0,
    createdAt: '2026-08-19T13:40:00.000Z',
  },
  {
    id: 'prop-4-b',
    code: 'PROP-2026-092',
    clientId: 'cli-4',
    clientName: 'Auto Posto Alvorada',
    title: 'Proposta B: 45.00 kWp • Cobertura Estendida e Lavajato',
    systemPowerKWp: 45.0,
    systemType: 'On-Grid',
    totalValue: 158000.0,
    status: 'Em negociação',
    modulesCount: 76,
    moduleModel: 'JA Solar DeepBlue 4.0 Pro 585W',
    inverterModel: 'Sungrow SG40CX Trifásico',
    estimatedMonthlyGenKWh: 5200,
    estimatedMonthlySavings: 4680.0,
    createdAt: '2026-09-08T15:00:00.000Z',
  },
  {
    id: 'prop-4-c',
    code: 'PROP-2026-098',
    clientId: 'cli-4',
    clientName: 'Auto Posto Alvorada',
    title: 'Opção Noturna: 25.00 kWp • Sistema Híbrido com Baterias',
    systemPowerKWp: 25.0,
    systemType: 'Híbrido',
    totalValue: 112000.0,
    status: 'Rascunho',
    modulesCount: 42,
    moduleModel: 'JA Solar DeepBlue 4.0 Pro 585W',
    inverterModel: 'Deye 25kW Trifásico Híbrido',
    batteryModel: 'Deye BOS-G 20.48kWh',
    batteryCount: 1,
    estimatedMonthlyGenKWh: 2950,
    estimatedMonthlySavings: 2750.0,
    createdAt: '2026-09-15T09:30:00.000Z',
  },
  {
    id: 'prop-5-ind',
    code: 'PROP-2026-075',
    clientId: 'cli-5',
    clientName: 'Indústria Metalúrgica Progresso',
    title: 'Proposta Galpão A: 110.00 kWp • Conexão Alta Tensão Média',
    systemPowerKWp: 110.0,
    systemType: 'On-Grid',
    totalValue: 380000.0,
    status: 'Em negociação',
    modulesCount: 188,
    moduleModel: 'Trina Solar Vertex N 585W',
    inverterModel: 'Sungrow SG110CX Trifásico 380V',
    estimatedMonthlyGenKWh: 13200,
    estimatedMonthlySavings: 11800.0,
    createdAt: '2026-08-15T08:00:00.000Z',
  },
  {
    id: 'prop-5-ind-2',
    code: 'PROP-2026-088',
    clientId: 'cli-5',
    clientName: 'Indústria Metalúrgica Progresso',
    title: 'Proposta Galpão B: 65.00 kWp • Linha de Usinagem',
    systemPowerKWp: 65.0,
    systemType: 'On-Grid',
    totalValue: 225000.0,
    status: 'Rascunho',
    modulesCount: 112,
    moduleModel: 'Trina Solar Vertex N 585W',
    inverterModel: 'Sungrow SG60CX Trifásico 380V',
    estimatedMonthlyGenKWh: 7800,
    estimatedMonthlySavings: 7020.0,
    createdAt: '2026-09-01T11:20:00.000Z',
  },
];

export function getStoredProposalsLocal(): ClientProposal[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_CLIENT_PROPOSALS;
  }

  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENT_PROPOSALS));
      return INITIAL_CLIENT_PROPOSALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Erro ao carregar propostas do localStorage:', err);
  }

  return INITIAL_CLIENT_PROPOSALS;
}

export function saveStoredProposalsLocal(proposals: ClientProposal[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
    window.dispatchEvent(new CustomEvent(PROPOSALS_UPDATED_EVENT, { detail: proposals }));
  } catch (err) {
    console.warn('Erro ao salvar propostas no localStorage:', err);
  }
}

export async function fetchAllClientProposals(): Promise<ClientProposal[]> {
  return getStoredProposalsLocal();
}

export async function fetchProposalsForClient(
  clientId: string,
  clientName?: string
): Promise<ClientProposal[]> {
  const all = getStoredProposalsLocal();
  const filtered = all.filter((p) => {
    if (p.clientId === clientId) return true;
    if (clientName && p.clientName.trim().toLowerCase() === clientName.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  // Se o cliente não tiver nenhuma proposta ainda (ex: cliente cadastrado agora),
  // cria automaticamente uma proposta padrão para ele
  if (filtered.length === 0) {
    const defaultCode = `PROP-2026-${Math.floor(100 + Math.random() * 899)}`;
    const autoProposal: ClientProposal = {
      id: `prop-${Date.now()}`,
      code: defaultCode,
      clientId,
      clientName: clientName || 'Cliente',
      title: `Proposta 1: 12.00 kWp • Padrão (${clientName || 'Cliente'})`,
      systemPowerKWp: 12.0,
      systemType: 'On-Grid',
      totalValue: 42000,
      status: 'Pendente',
      modulesCount: 20,
      moduleModel: 'Canadian Solar 585W TOPCon Bi-facial',
      inverterModel: 'Inversor Deye 12kW Trifásico',
      estimatedMonthlyGenKWh: 1440,
      estimatedMonthlySavings: 1290,
      createdAt: new Date().toISOString(),
    };
    const updated = [autoProposal, ...all];
    saveStoredProposalsLocal(updated);
    return [autoProposal];
  }

  return filtered;
}

export async function createQuickProposalForClient(
  data: Partial<ClientProposal> & { clientId: string; clientName: string }
): Promise<ClientProposal> {
  const all = getStoredProposalsLocal();
  const codeNum = Math.floor(100 + Math.random() * 899);
  const newProposal: ClientProposal = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: data.code || `PROP-2026-${codeNum}`,
    clientId: data.clientId,
    clientName: data.clientName,
    title: data.title || `Nova Proposta (${data.systemPowerKWp || 15} kWp)`,
    systemPowerKWp: Number(data.systemPowerKWp || 15),
    systemType: data.systemType || 'On-Grid',
    totalValue: Number(data.totalValue || 52000),
    status: data.status || 'Pendente',
    modulesCount: data.modulesCount,
    moduleModel: data.moduleModel,
    inverterModel: data.inverterModel,
    estimatedMonthlyGenKWh: data.estimatedMonthlyGenKWh,
    estimatedMonthlySavings: data.estimatedMonthlySavings,
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProposal, ...all];
  saveStoredProposalsLocal(updated);
  return newProposal;
}
