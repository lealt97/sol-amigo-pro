import {
  KitEquipmentItem,
  OpportunityKitCosts,
  OpportunitySizing,
  PdfSettingsConfig,
  ProposalRecord,
  ProposalStatus,
  ProposalVersion,
  SolarProposal,
} from '../types';
import { supabase } from '../lib/supabase';
import { updateLeadStage } from './leads';

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sessão inválida.');
  return data.user.id;
};

// Formata código amigável para a proposta
export const generateProposalCode = (sequence = 1): string => {
  const year = new Date().getFullYear();
  return `PROP-${year}-${String(sequence).padStart(4, '0')}`;
};

export const fetchProposalByLeadId = async (
  leadId: string
): Promise<ProposalRecord | null> => {
  const userId = await getCurrentUserId();

  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .maybeSingle();

    if (error) {
      // Se a tabela ainda não existir no Supabase remoto (PGRST205), retorna null sem quebrar a tela
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return null;
      }
      throw error;
    }

    if (!proposal) return null;

    // Buscar versões da proposta
    const { data: versions, error: vErr } = await supabase
      .from('proposal_versions')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('version_number', { ascending: false });

    if (vErr && vErr.code !== 'PGRST205') throw vErr;

    const mappedVersions: ProposalVersion[] = (versions || []).map((row: any) => ({
      id: row.id,
      proposalId: row.proposal_id,
      userId: row.user_id,
      versionNumber: row.version_number,
      status: row.status,
      validUntil: row.valid_until,
      totalValue: Number(row.total_value) || 0,
      sizingSnapshot: row.sizing_snapshot,
      equipmentSnapshot: row.equipment_snapshot || [],
      costsSnapshot: row.costs_snapshot,
      commercialConditions: row.commercial_conditions || {},
      pdfSettingsSnapshot: row.pdf_settings_snapshot,
      customNotes: row.custom_notes,
      sentAt: row.sent_at,
      viewedAt: row.viewed_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
    }));

    const currentVersion =
      mappedVersions.find((v) => v.versionNumber === proposal.current_version_number) ||
      mappedVersions[0];

    return {
      id: proposal.id,
      userId: proposal.user_id,
      leadId: proposal.lead_id,
      code: proposal.code,
      publicToken: proposal.public_token,
      status: proposal.status as ProposalStatus,
      currentVersionNumber: proposal.current_version_number,
      totalValue: Number(proposal.total_value) || 0,
      validUntil: proposal.valid_until,
      sentAt: proposal.sent_at,
      viewedAt: proposal.viewed_at,
      decidedAt: proposal.decided_at,
      decisionNotes: proposal.decision_notes,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      versions: mappedVersions,
      currentVersion,
    };
  } catch (err) {
    console.warn('Aviso ao consultar propostas:', err);
    return null;
  }
};

export const saveProposalVersion = async (params: {
  leadId: string;
  code?: string;
  sizing: OpportunitySizing;
  equipmentItems: KitEquipmentItem[];
  kitCosts: OpportunityKitCosts;
  commercialConditions: {
    paymentMethods?: string;
    warrantyTerms?: string;
    deliveryTimeframe?: string;
    notes?: string;
  };
  pdfSettings?: PdfSettingsConfig;
  customNotes?: string;
  validDays?: number;
}): Promise<ProposalRecord> => {
  const userId = await getCurrentUserId();
  const existing = await fetchProposalByLeadId(params.leadId);

  const validDays = params.validDays || 15;
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + validDays);
  const validUntilStr = validUntilDate.toISOString().split('T')[0];

  const totalValue = params.kitCosts.finalSalePrice || 0;

  if (!existing) {
    // 1. Criar proposta mestre inicial
    const code = params.code || generateProposalCode(Math.floor(Math.random() * 9000) + 1000);

    const { data: newProp, error: propErr } = await supabase
      .from('proposals')
      .insert({
        user_id: userId,
        lead_id: params.leadId,
        code,
        status: 'rascunho',
        current_version_number: 1,
        total_value: totalValue,
        valid_until: validUntilStr,
      })
      .select('*')
      .single();

    if (propErr) throw propErr;

    // 2. Criar Versão 1
    const { data: newVer, error: verErr } = await supabase
      .from('proposal_versions')
      .insert({
        proposal_id: newProp.id,
        user_id: userId,
        version_number: 1,
        status: 'rascunho',
        valid_until: validUntilStr,
        total_value: totalValue,
        sizing_snapshot: params.sizing,
        equipment_snapshot: params.equipmentItems,
        costs_snapshot: params.kitCosts,
        commercial_conditions: params.commercialConditions,
        pdf_settings_snapshot: params.pdfSettings || {},
        customNotes: params.customNotes || '',
      })
      .select('*')
      .single();

    if (verErr) throw verErr;

    // Registrar atividade de criação da proposta
    await supabase.from('lead_activities').insert({
      user_id: userId,
      lead_id: params.leadId,
      activity_type: 'proposta_criada',
      title: 'Proposta comercial criada (v1)',
      description: `Código ${code} gerado no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}.`,
      metadata: { proposal_id: newProp.id, code, version: 1, total_value: totalValue },
    });

    return (await fetchProposalByLeadId(params.leadId))!;
  }

  // Se a proposta já existe:
  // Se a versão atual já foi enviada ou visualizada pelo cliente, NUNCA altere retroativamente!
  // Em conformidade com o Requisito 13: crie uma NOVA versão imutável.
  const currentVer = existing.currentVersion;
  const isAlreadySent =
    currentVer && ['enviada', 'visualizada', 'aprovada', 'recusada'].includes(currentVer.status);

  if (isAlreadySent) {
    const nextVerNumber = existing.currentVersionNumber + 1;

    // Marcar versão anterior como 'substituida' caso ainda não aprovada/recusada
    if (currentVer.status === 'enviada' || currentVer.status === 'visualizada') {
      await supabase
        .from('proposal_versions')
        .update({ status: 'substituida' })
        .eq('id', currentVer.id);
    }

    // Criar nova versão
    const { error: newVerErr } = await supabase.from('proposal_versions').insert({
      proposal_id: existing.id,
      user_id: userId,
      version_number: nextVerNumber,
      status: 'rascunho',
      valid_until: validUntilStr,
      total_value: totalValue,
      sizing_snapshot: params.sizing,
      equipment_snapshot: params.equipmentItems,
      costs_snapshot: params.kitCosts,
      commercial_conditions: params.commercialConditions,
      pdf_settings_snapshot: params.pdfSettings || {},
      custom_notes: params.customNotes || '',
    });

    if (newVerErr) throw newVerErr;

    // Atualizar proposta mestre para apontar para a nova versão
    const { error: updatePropErr } = await supabase
      .from('proposals')
      .update({
        current_version_number: nextVerNumber,
        status: 'rascunho',
        total_value: totalValue,
        valid_until: validUntilStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updatePropErr) throw updatePropErr;

    // Registrar histórico da nova versão
    await supabase.from('lead_activities').insert({
      user_id: userId,
      lead_id: params.leadId,
      activity_type: 'proposta_criada',
      title: `Nova versão da proposta gerada (v${nextVerNumber})`,
      description: `Parâmetros técnicos ou comerciais revisados geraram a versão ${nextVerNumber} com valor final de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}.`,
      metadata: { proposal_id: existing.id, version: nextVerNumber, total_value: totalValue },
    });

    return (await fetchProposalByLeadId(params.leadId))!;
  } else {
    // Se a versão atual ainda é rascunho, atualiza a versão 1 ou versão atual diretamente
    if (currentVer) {
      await supabase
        .from('proposal_versions')
        .update({
          valid_until: validUntilStr,
          total_value: totalValue,
          sizing_snapshot: params.sizing,
          equipment_snapshot: params.equipmentItems,
          costs_snapshot: params.kitCosts,
          commercial_conditions: params.commercialConditions,
          pdf_settings_snapshot: params.pdfSettings || {},
          custom_notes: params.customNotes || '',
        })
        .eq('id', currentVer.id);
    }

    await supabase
      .from('proposals')
      .update({
        total_value: totalValue,
        valid_until: validUntilStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return (await fetchProposalByLeadId(params.leadId))!;
  }
};

export const markProposalAsSent = async (
  proposalId: string,
  leadId: string,
  versionNumber: number
): Promise<void> => {
  const userId = await getCurrentUserId();
  const nowIso = new Date().toISOString();

  // 1. Atualizar proposta mestre
  await supabase
    .from('proposals')
    .update({
      status: 'enviada',
      sent_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', proposalId)
    .eq('user_id', userId);

  // 2. Atualizar versão
  await supabase
    .from('proposal_versions')
    .update({
      status: 'enviada',
      sent_at: nowIso,
    })
    .eq('proposal_id', proposalId)
    .eq('version_number', versionNumber)
    .eq('user_id', userId);

  // 3. Atualizar status do lead no funil comercial para 'proposta_enviada'
  await updateLeadStage(leadId, 'proposta_enviada');

  // 4. Registrar atividade
  await supabase.from('lead_activities').insert({
    user_id: userId,
    lead_id: leadId,
    activity_type: 'proposta_enviada',
    title: `Proposta enviada ao cliente (v${versionNumber})`,
    description: `A versão ${versionNumber} da proposta comercial foi compartilhada com o interessado.`,
    metadata: { proposal_id: proposalId, version_number: versionNumber, sent_at: nowIso },
  });
};

export const convertProposalToSolarProposal = (
  proposalRecord: ProposalRecord,
  lead: { name: string; email?: string; phone?: string; city: string; state: string; distributor?: string }
): SolarProposal => {
  const version = proposalRecord.currentVersion;
  const sizing = version?.sizingSnapshot;
  const costs = version?.costsSnapshot;

  const annualSavings = (sizing?.estimatedAnnualGenerationKWh || 0) * 0.95;
  const monthlySavings = annualSavings / 12;
  const payback =
    proposalRecord.totalValue > 0 && annualSavings > 0
      ? Number((proposalRecord.totalValue / annualSavings).toFixed(1))
      : 3.8;

  const co2Saved = Number(((sizing?.estimatedAnnualGenerationKWh || 0) * 0.084 / 1000).toFixed(2));
  const trees = Math.round((sizing?.estimatedAnnualGenerationKWh || 0) * 0.005);

  const statusMap: Record<string, SolarProposal['status']> = {
    rascunho: 'Rascunho',
    enviada: 'Enviada',
    visualizada: 'Visualizada',
    em_negociacao: 'Em negociação',
    aprovada: 'Aprovada',
    recusada: 'Recusada',
    expirada: 'Pendente',
  };

  return {
    id: proposalRecord.id,
    code: proposalRecord.code,
    publicToken: proposalRecord.publicToken,
    versionNumber: proposalRecord.currentVersionNumber,
    versionsCount: proposalRecord.versions?.length || 1,
    clientName: lead.name,
    clientEmail: lead.email,
    clientPhone: lead.phone,
    clientCity: lead.city,
    clientState: lead.state,
    concessionaria: lead.distributor || 'Concessionária Local',
    monthlyConsumptionKWh: sizing?.averageConsumptionKWh || 0,
    currentMonthlyBill: sizing?.averageConsumptionKWh ? sizing.averageConsumptionKWh * 0.95 : 0,
    systemPowerKWp: sizing?.installedPowerKWp || 0,
    estimatedMonthlyGenKWh: sizing?.estimatedMonthlyGenerationKWh || 0,
    modulesCount: sizing?.modulesCount || 0,
    moduleModel: `${sizing?.modulePowerW || 550}W Monocristalino Tier 1`,
    inverterModel: `${sizing?.inverterPowerKW || 5}kW Grid-Tie Homologado`,
    totalValue: proposalRecord.totalValue || costs?.finalSalePrice || 0,
    estimatedMonthlySavings: Math.round(monthlySavings),
    paybackYears: payback,
    status: statusMap[proposalRecord.status] || 'Pendente',
    createdAt: proposalRecord.createdAt,
    validUntil: proposalRecord.validUntil,
    co2SavedTonsYear: co2Saved,
    treesEquivalent: trees,
    co2AvoidedTons: co2Saved * 25,
    treesPlanted: trees * 5,
    sizing,
    pricing: costs,
    commercialConditions: version?.commercialConditions,
  };
};

export const fetchPublicProposal = async (token: string): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('public-proposal', {
    body: { token, action: 'get' },
  });

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Proposta não encontrada.');
  }

  return data;
};

export const decidePublicProposal = async (
  token: string,
  decision: 'aprovada' | 'recusada',
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.functions.invoke('public-proposal', {
    body: { token, action: 'decide', decision, reason },
  });

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Falha ao registrar decisão da proposta.');
  }

  return data;
};
