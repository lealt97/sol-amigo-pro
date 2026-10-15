import type { Lead, Client } from '../../types';
import { parseLeadNotes } from '../../utils/leadNotes';
import { LEAD_STAGE_LABELS } from '../../utils/leadStatus';
import { isLeadConverted } from '../crm/leadSelectors';

export type NoteTargetType = 'lead' | 'client';

export interface UnifiedNote {
  id: string;
  targetType: NoteTargetType;
  targetId: string;
  targetName: string;
  targetPhone?: string;
  targetEmail?: string;
  targetLocation?: string;
  targetStatus?: string;
  text: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
  rawLead?: Lead;
  rawClient?: Client;
  // Campos de vinculação com proposta do cliente
  proposalId?: string;
  proposalCode?: string;
  proposalTitle?: string;
  proposalValue?: number;
  proposalStatus?: string;
}

export function collectNotes(leads: Lead[], clients: Client[]): UnifiedNote[] {
    const list: UnifiedNote[] = [];
    const seenNoteIds = new Set<string>();

    // Anotações dos Clientes (processados primeiro para destacar notas em clientes convertidos)
    clients.forEach((client) => {
      const parsed = parseLeadNotes(client.notes);
      parsed.forEach((note) => {
        if (seenNoteIds.has(note.id)) return;
        seenNoteIds.add(note.id);
        list.push({
          id: note.id,
          targetType: 'client',
          targetId: client.id,
          targetName: client.name,
          targetPhone: client.phone,
          targetEmail: client.email,
          targetLocation: client.city ? `${client.city}/${client.state || 'UF'}` : undefined,
          targetStatus: client.activeStatus || client.type,
          text: note.text,
          images: note.images || [],
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          rawClient: client,
          proposalId: note.proposalId,
          proposalCode: note.proposalCode,
          proposalTitle: note.proposalTitle,
          proposalValue: note.proposalValue,
          proposalStatus: note.proposalStatus,
        });
      });
    });

    // Anotações dos Leads
    leads.forEach((lead) => {
      const isConverted = isLeadConverted(lead);
      const parsed = parseLeadNotes(lead.notes);
      parsed.forEach((note) => {
        if (seenNoteIds.has(note.id)) return;
        seenNoteIds.add(note.id);
        list.push({
          id: note.id,
          targetType: isConverted ? 'client' : 'lead',
          targetId: isConverted ? (lead.clientId || lead.id) : lead.id,
          targetName: lead.name,
          targetPhone: lead.phone,
          targetEmail: lead.email,
          targetLocation: lead.city ? `${lead.city}/${lead.state || 'UF'}` : undefined,
          targetStatus: isConverted ? 'Ativo' : (LEAD_STAGE_LABELS[lead.status] || lead.status),
          text: note.text,
          images: note.images || [],
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          rawLead: lead,
          proposalId: note.proposalId,
          proposalCode: note.proposalCode,
          proposalTitle: note.proposalTitle,
          proposalValue: note.proposalValue,
          proposalStatus: note.proposalStatus,
        });
      });
    });

    return list;
 }
export interface NoteFilters { typeFilter: 'all' | 'lead' | 'client'; onlyWithImages: boolean; proposalFilter: string; searchTerm: string; sortBy: 'recent' | 'oldest' | 'name' }
export function filterNotes(allNotes: UnifiedNote[], { typeFilter, onlyWithImages, proposalFilter, searchTerm, sortBy }: NoteFilters): UnifiedNote[] {
    return allNotes
      .filter((note) => {
        // Filtro por tipo (Lead / Cliente / Todos)
        if (typeFilter !== 'all' && note.targetType !== typeFilter) {
          return false;
        }

        // Filtro por fotos anexadas
        if (onlyWithImages && (!note.images || note.images.length === 0)) {
          return false;
        }

        // Filtro por proposta
        if (proposalFilter !== 'all') {
          if (proposalFilter === 'with_proposal' && !note.proposalCode) return false;
          if (proposalFilter === 'without_proposal' && note.proposalCode) return false;
          if (
            proposalFilter !== 'with_proposal' &&
            proposalFilter !== 'without_proposal' &&
            note.proposalId !== proposalFilter &&
            note.proposalCode !== proposalFilter
          ) {
            return false;
          }
        }

        // Filtro por busca de texto (nome, texto, telefone, e-mail, local, código ou título da proposta)
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          const matchesName = note.targetName.toLowerCase().includes(query);
          const matchesText = note.text.toLowerCase().includes(query);
          const matchesPhone = note.targetPhone ? note.targetPhone.toLowerCase().includes(query) : false;
          const matchesEmail = note.targetEmail ? note.targetEmail.toLowerCase().includes(query) : false;
          const matchesLoc = note.targetLocation ? note.targetLocation.toLowerCase().includes(query) : false;
          const matchesProposalCode = note.proposalCode ? note.proposalCode.toLowerCase().includes(query) : false;
          const matchesProposalTitle = note.proposalTitle ? note.proposalTitle.toLowerCase().includes(query) : false;
          return matchesName || matchesText || matchesPhone || matchesEmail || matchesLoc || matchesProposalCode || matchesProposalTitle;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.targetName.localeCompare(b.targetName);
        }
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        if (sortBy === 'oldest') {
          return dateA - dateB;
        }
        return dateB - dateA; // recent
      });
}
