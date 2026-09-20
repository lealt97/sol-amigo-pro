import { Client, Lead } from '../types';
import { INITIAL_CLIENTS } from '../data/initialData';
import { serializeLeadNotes } from '../utils/leadNotes';
import { supabase } from '../lib/supabase';
import { updateLeadNotes } from './leads';

const CLIENTS_STORAGE_KEY = 'solamigo.clients.v2';
export const CLIENTS_UPDATED_EVENT = 'solamigo:clients-updated';

function getInitialSeededClients(): Client[] {
  return INITIAL_CLIENTS.map((client) => {
    if (client.id === 'cli-1') {
      return {
        ...client,
        notes: serializeLeadNotes([
          {
            id: 'note-cli-1-1',
            text: 'Cliente solicitou dimensionamento para galpão de ordenha com telhas termoacústicas. Aguardando envio da fatura de energia do mês anterior para refinar geração estimada.',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            images: [],
            proposalId: 'prop-1',
            proposalCode: 'PROP-2026-084',
            proposalTitle: 'Opção 1: 28.08 kWp • Galpão de Ordenha (On-Grid)',
            proposalValue: 98500,
            proposalStatus: 'Aprovada',
          },
        ]),
      };
    }
    if (client.id === 'cli-2') {
      return {
        ...client,
        notes: serializeLeadNotes([
          {
            id: 'note-cli-2-1',
            text: 'Reunião realizada com a gerência administrativa. Proposta comercial aprovada em primeira instância, necessária validação técnica do padrão de entrada trifásico.',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            images: [],
            proposalId: 'prop-2',
            proposalCode: 'PROP-2026-083',
            proposalTitle: 'Proposta Principal: 16.38 kWp • Telhado Loja Matriz',
            proposalValue: 58900,
            proposalStatus: 'Em negociação',
          },
        ]),
      };
    }
    return client;
  });
}

export function fetchClientsLocal(): Client[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getInitialSeededClients();
  }

  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      const seeded = getInitialSeededClients();
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Erro ao carregar clientes do localStorage:', err);
  }

  const seeded = getInitialSeededClients();
  return seeded;
}

export function saveClientsLocal(clients: Client[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    window.dispatchEvent(new CustomEvent(CLIENTS_UPDATED_EVENT, { detail: clients }));
  } catch (err) {
    console.warn('Erro ao salvar clientes no localStorage:', err);
  }
}

export async function fetchClients(): Promise<Client[]> {
  const localClients = fetchClientsLocal();
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mappedDbClients: Client[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sourceLeadId: row.source_lead_id ?? undefined,
        name: row.name,
        email: row.email || '',
        phone: row.phone || '',
        city: row.city || '',
        state: row.state || '',
        street: row.street ?? undefined,
        addressNumber: row.address_number ?? undefined,
        type: row.property_type || row.type || 'Residencial',
        propertyType: row.property_type || row.type || 'Residencial',
        activeStatus: row.status === 'inativo' || row.active_status === 'Inativo' ? 'Inativo' : 'Ativo',
        status: row.status || 'ativo',
        notes: row.notes || '',
        concessionaria: row.concessionaria || '',
        avgConsumptionKWh: row.avg_consumption_kwh ? Number(row.avg_consumption_kwh) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Combina os clientes do banco com os clientes locais (preservando notas locais e clientes de demonstração)
      const combined = [...mappedDbClients];
      for (const local of localClients) {
        const match = combined.find(
          (c) => c.id === local.id || (local.sourceLeadId && c.sourceLeadId === local.sourceLeadId)
        );
        if (!match) {
          combined.push(local);
        } else {
          if (!match.notes && local.notes) {
            match.notes = local.notes;
          }
        }
      }

      saveClientsLocal(combined);
      return combined;
    }
  } catch (err) {
    console.warn('Erro ao carregar clientes do Supabase:', err);
  }

  return localClients;
}

export function syncLeadAsClient(
  lead: Partial<Lead> & { id: string; name: string },
  clientId: string
): Client {
  const current = fetchClientsLocal();
  const existingIdx = current.findIndex(
    (c) => c.id === clientId || c.sourceLeadId === lead.id
  );
  const clientData: Client = {
    id: clientId,
    sourceLeadId: lead.id,
    name: lead.name,
    phone: lead.phone || '',
    email: lead.email || '',
    city: lead.city || '',
    state: lead.state || '',
    street: lead.street,
    addressNumber: lead.addressNumber,
    type: (lead.propertyType as any) || 'Residencial',
    propertyType: (lead.propertyType as any) || 'Residencial',
    activeStatus: 'Ativo',
    status: 'ativo',
    notes: lead.notes || '',
    createdAt: lead.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let updated: Client[];
  if (existingIdx >= 0) {
    updated = current.map((c, idx) =>
      idx === existingIdx ? { ...c, ...clientData, notes: c.notes || clientData.notes } : c
    );
  } else {
    updated = [clientData, ...current];
  }
  saveClientsLocal(updated);
  return clientData;
}

export function mergeClientsWithLeads(clientsList: Client[], leadsList: Lead[]): Client[] {
  const merged = [...clientsList];
  leadsList.forEach((lead) => {
    if (lead.clientId || (lead.status as string) === 'Cliente') {
      const clientId = lead.clientId || `lead-cli-${lead.id}`;
      const existing = merged.find(
        (c) => c.id === clientId || c.id === lead.id || c.sourceLeadId === lead.id
      );
      if (!existing) {
        merged.push({
          id: clientId,
          sourceLeadId: lead.id,
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          city: lead.city || '',
          state: lead.state || '',
          street: lead.street,
          addressNumber: lead.addressNumber,
          type: (lead.propertyType as any) || 'Residencial',
          propertyType: (lead.propertyType as any) || 'Residencial',
          activeStatus: 'Ativo',
          status: 'ativo',
          notes: lead.notes || '',
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        });
      } else {
        if (!existing.notes && lead.notes) {
          existing.notes = lead.notes;
        }
        if (!existing.sourceLeadId) {
          existing.sourceLeadId = lead.id;
        }
      }
    }
  });
  return merged;
}

export async function updateClientNotes(
  clientId: string,
  rawNotes: string,
  sourceLeadId?: string
): Promise<void> {
  const current = fetchClientsLocal();
  const targetClient = current.find(
    (c) => c.id === clientId || (sourceLeadId && c.sourceLeadId === sourceLeadId)
  );
  const leadIdToUpdate = sourceLeadId || targetClient?.sourceLeadId;

  if (leadIdToUpdate) {
    try {
      await updateLeadNotes(leadIdToUpdate, rawNotes);
    } catch (err) {
      console.warn('Erro ao atualizar notas do lead vinculado ao cliente:', err);
    }
  }

  let found = false;
  const updated = current.map((client) => {
    if (client.id === clientId || (leadIdToUpdate && client.sourceLeadId === leadIdToUpdate)) {
      found = true;
      return {
        ...client,
        notes: rawNotes,
        updatedAt: new Date().toISOString(),
      };
    }
    return client;
  });

  if (!found && targetClient) {
    updated.push({
      ...targetClient,
      notes: rawNotes,
      updatedAt: new Date().toISOString(),
    });
  }

  saveClientsLocal(updated);
}

export async function addClient(newClientData: Partial<Client>): Promise<Client> {
  const current = fetchClientsLocal();
  const newClient: Client = {
    id: `cli-${Date.now()}`,
    name: newClientData.name || 'Novo Cliente',
    email: newClientData.email || '',
    phone: newClientData.phone || '',
    city: newClientData.city || 'Campinas',
    state: newClientData.state || 'SP',
    type: newClientData.type || 'Residencial',
    activeStatus: 'Ativo',
    notes: newClientData.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...newClientData,
  };

  const updated = [newClient, ...current];
  saveClientsLocal(updated);
  return newClient;
}

export async function deleteClient(clientId: string): Promise<void> {
  const current = fetchClientsLocal();
  const updated = current.filter((c) => c.id !== clientId);
  saveClientsLocal(updated);
  try {
    await supabase.from('clients').delete().eq('id', clientId);
  } catch (err) {
    console.warn('Erro ao excluir cliente no Supabase:', err);
  }
}

export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  const current = fetchClientsLocal();
  const updated = current.map((c) =>
    c.id === clientId ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
  );
  saveClientsLocal(updated);
  try {
    await supabase.from('clients').update({
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      state: data.state,
      street: data.street,
      address_number: data.addressNumber,
      property_type: data.propertyType || data.type,
      status: data.status,
    }).eq('id', clientId);
  } catch (err) {
    console.warn('Erro ao atualizar cliente no Supabase:', err);
  }
}

