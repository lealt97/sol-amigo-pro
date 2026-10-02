import { Client, Lead } from '../types';
import { INITIAL_CLIENTS } from '../data/initialData';
import { serializeLeadNotes, parseLeadNotes, LeadNote } from '../utils/leadNotes';
import { getStoredLeadNotes, setStoredLeadNotes } from '../utils/leadNotesPersistence';
import { supabase } from '../lib/supabase';
import { updateLeadNotes } from './leads';

const CLIENTS_STORAGE_KEY = 'solamigo.clients.v2';
const DELETED_CLIENTS_KEY = 'solamigo.deleted-clients.v1';
export const CLIENTS_UPDATED_EVENT = 'solamigo:clients-updated';

export function getDeletedClientIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(DELETED_CLIENTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markClientAsDeleted(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !id) return;
  try {
    const set = getDeletedClientIds();
    set.add(id);
    localStorage.setItem(DELETED_CLIENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const LEGACY_MOCK_CLIENT_IDS = new Set([
  'cli-1',
  'cli-2',
  'cli-3',
  'cli-4',
  'cli-5',
  'cli-6',
  'cli-7',
  'cli-8',
]);

function getInitialSeededClients(): Client[] {
  return [];
}

export function fetchClientsLocal(): Client[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const deletedIds = getDeletedClientIds();
      const clean = parsed.filter(
        (c: any) =>
          c &&
          !LEGACY_MOCK_CLIENT_IDS.has(c.id) &&
          !deletedIds.has(c.id) &&
          (!c.sourceLeadId || !deletedIds.has(c.sourceLeadId))
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
  } catch (err) {
    console.warn('Erro ao carregar clientes do localStorage:', err);
  }

  return [];
}

export function saveClientsLocal(clients: Client[], emitEvent = true): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(CLIENTS_UPDATED_EVENT, { detail: clients }));
    }
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

      // Aplica sobrescritas salvas no armazenamento resiliente
      combined.forEach((c) => {
        const storedNotes = getStoredLeadNotes(c.id) || (c.sourceLeadId ? getStoredLeadNotes(c.sourceLeadId) : undefined);
        if (storedNotes !== undefined) {
          c.notes = storedNotes;
        }
      });

      const deletedIds = getDeletedClientIds();
      const finalCombined = combined.filter(
        (c) => !deletedIds.has(c.id) && (!c.sourceLeadId || !deletedIds.has(c.sourceLeadId))
      );

      saveClientsLocal(finalCombined, false);
      return finalCombined;
    }
  } catch (err) {
    console.warn('Erro ao carregar clientes do Supabase:', err);
  }

  const deletedIds = getDeletedClientIds();
  const finalLocal = localClients.filter(
    (c) => !deletedIds.has(c.id) && (!c.sourceLeadId || !deletedIds.has(c.sourceLeadId))
  );

  finalLocal.forEach((c) => {
    const storedNotes = getStoredLeadNotes(c.id) || (c.sourceLeadId ? getStoredLeadNotes(c.sourceLeadId) : undefined);
    if (storedNotes !== undefined) {
      c.notes = storedNotes;
    }
  });
  return finalLocal;
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
  const deletedIds = getDeletedClientIds();
  const merged = clientsList.filter(
    (c) => !deletedIds.has(c.id) && (!c.sourceLeadId || !deletedIds.has(c.sourceLeadId))
  );

  leadsList.forEach((lead) => {
    if (deletedIds.has(lead.id) || (lead.clientId && deletedIds.has(lead.clientId))) {
      return;
    }

    if (lead.clientId || (lead.status as string) === 'Cliente' || lead.status === 'ganho') {
      const clientId = lead.clientId || `lead-cli-${lead.id}`;
      if (deletedIds.has(clientId)) {
        return;
      }
      const existing = merged.find(
        (c) => c.id === clientId || c.id === lead.id || c.sourceLeadId === lead.id
      );

      const storedLeadNotes = getStoredLeadNotes(lead.id);
      const effectiveLeadNotes = storedLeadNotes !== undefined ? storedLeadNotes : (lead.notes || '');

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
          notes: effectiveLeadNotes,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        });
      } else {
        if (!existing.sourceLeadId) {
          existing.sourceLeadId = lead.id;
        }

        // Se houver notas no lead ou no cliente existente, mescla deduplicando
        const storedCliNotes = getStoredLeadNotes(existing.id) || (existing.sourceLeadId ? getStoredLeadNotes(existing.sourceLeadId) : undefined);
        const cliNotesToUse = storedCliNotes !== undefined ? storedCliNotes : (existing.notes || '');

        const leadNotesList = parseLeadNotes(effectiveLeadNotes);
        const cliNotesList = parseLeadNotes(cliNotesToUse);

        if (leadNotesList.length > 0 || cliNotesList.length > 0) {
          const notesMap = new Map<string, LeadNote>();
          cliNotesList.forEach((n) => notesMap.set(n.id, n));
          leadNotesList.forEach((n) => notesMap.set(n.id, n));

          const combined = Array.from(notesMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          existing.notes = serializeLeadNotes(combined);
        }
      }
    }
  });
  return merged;
}

export async function updateClientNotes(
  clientId: string,
  rawNotes: string,
  sourceLeadId?: string,
  skipLeadSync = false
): Promise<void> {
  // 1. Persiste imediatamente no armazenamento local resiliente por ID de cliente e de lead
  setStoredLeadNotes(clientId, rawNotes);
  if (sourceLeadId) {
    setStoredLeadNotes(sourceLeadId, rawNotes);
  }

  const current = fetchClientsLocal();
  const targetClient = current.find(
    (c) => c.id === clientId || (sourceLeadId && c.sourceLeadId === sourceLeadId)
  );
  const leadIdToUpdate = sourceLeadId || targetClient?.sourceLeadId;

  if (leadIdToUpdate && !skipLeadSync) {
    try {
      await updateLeadNotes(leadIdToUpdate, rawNotes, true);
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

  if (!found) {
    if (targetClient) {
      updated.push({
        ...targetClient,
        notes: rawNotes,
        updatedAt: new Date().toISOString(),
      });
    } else {
      updated.push({
        id: clientId,
        sourceLeadId: leadIdToUpdate,
        name: 'Cliente',
        email: '',
        phone: '',
        city: '',
        state: '',
        type: 'Residencial',
        propertyType: 'Residencial',
        activeStatus: 'Ativo',
        status: 'ativo',
        notes: rawNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
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

export async function deleteClient(clientId: string, sourceLeadId?: string): Promise<void> {
  markClientAsDeleted(clientId);
  if (sourceLeadId) {
    markClientAsDeleted(sourceLeadId);
  }

  // Also remove or unlink from stored manual leads so it does not resurrect
  try {
    const rawLeads = localStorage.getItem('solamigo.manual-leads.v1');
    if (rawLeads) {
      const leads = JSON.parse(rawLeads);
      if (Array.isArray(leads)) {
        let changed = false;
        const updatedLeads = leads.map((l: any) => {
          if (l.id === clientId || l.id === sourceLeadId || l.clientId === clientId) {
            changed = true;
            return {
              ...l,
              clientId: undefined,
              status: l.status === 'Cliente' || l.status === 'ganho' ? 'novo' : l.status,
            };
          }
          return l;
        });
        if (changed) {
          localStorage.setItem('solamigo.manual-leads.v1', JSON.stringify(updatedLeads));
        }
      }
    }
  } catch {}

  const current = fetchClientsLocal();
  const updated = current.filter(
    (c) => c.id !== clientId && (!sourceLeadId || c.sourceLeadId !== sourceLeadId)
  );
  saveClientsLocal(updated);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
  if (isUuid) {
    try {
      await supabase.from('clients').delete().eq('id', clientId);
    } catch (err) {
      console.warn('Erro ao excluir cliente no Supabase:', err);
    }
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

