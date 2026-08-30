import { Client } from '../types';
import { supabase } from '../lib/supabase';

type ClientRow = {
  id: string;
  name: string;
  document: string;
  type: Client['type'];
  email: string;
  phone: string;
  city: string;
  state: string;
  concessionaria: string;
  avg_consumption_kwh: number | string | null;
  proposals_count: number | null;
  active_status: Client['activeStatus'];
  crm_status: Client['crmStatus'] | null;
  responsible: string | null;
  source: string | null;
  last_interaction: string | null;
  created_at: string;
  avg_monthly_bill: number | string | null;
  connection_type: Client['connectionType'] | null;
  consumer_unit: string | null;
  tags: string[] | null;
};

const fromRow = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  document: row.document ?? '',
  type: row.type,
  email: row.email ?? '',
  phone: row.phone ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  concessionaria: row.concessionaria ?? '',
  avgConsumptionKWh: Number(row.avg_consumption_kwh ?? 0),
  proposalsCount: Number(row.proposals_count ?? 0),
  activeStatus: row.active_status,
  crmStatus: row.crm_status ?? undefined,
  responsible: row.responsible ?? undefined,
  source: row.source ?? undefined,
  lastInteraction: row.last_interaction ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : undefined,
  avgMonthlyBill: row.avg_monthly_bill == null ? undefined : Number(row.avg_monthly_bill),
  connectionType: row.connection_type ?? undefined,
  consumerUnit: row.consumer_unit ?? undefined,
  tags: row.tags ?? undefined,
});

const toInsertRow = (client: Client) => ({
  name: client.name,
  document: client.document,
  type: client.type,
  email: client.email,
  phone: client.phone,
  city: client.city,
  state: client.state,
  concessionaria: client.concessionaria,
  avg_consumption_kwh: client.avgConsumptionKWh,
  proposals_count: client.proposalsCount,
  active_status: client.activeStatus,
  crm_status: client.crmStatus ?? null,
  responsible: client.responsible ?? null,
  source: client.source ?? null,
  last_interaction: client.lastInteraction ?? null,
  avg_monthly_bill: client.avgMonthlyBill ?? null,
  connection_type: client.connectionType ?? null,
  consumer_unit: client.consumerUnit ?? null,
  tags: client.tags ?? [],
});

const getCurrentUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Sessão inválida.');
  return data.user.id;
};

export const fetchClients = async (): Promise<Client[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ClientRow[]).map(fromRow);
};

export const createClient = async (client: Client): Promise<Client> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...toInsertRow(client), user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as ClientRow);
};

export const deleteClient = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
};

export const updateClientProposalsCount = async (id: string, proposalsCount: number): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('clients')
    .update({ proposals_count: Math.max(0, proposalsCount) })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
};
