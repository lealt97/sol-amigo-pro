import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  NotepadText,
  Search,
  Plus,
  Filter,
  ImagePlus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  Pencil,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  Check,
  MessageCircle,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  FileText,
  Zap,
  CheckCircle2,
  Receipt,
  Layers,
} from 'lucide-react';
import { Lead, Client, ThemeConfig, LeadStage, PageKey } from '../types';
import { fetchLeads, updateLeadNotes } from '../services/leads';
import { fetchClients, updateClientNotes, CLIENTS_UPDATED_EVENT, mergeClientsWithLeads } from '../services/clients';
import {
  ClientProposal,
  fetchProposalsForClient,
  fetchAllClientProposals,
  createQuickProposalForClient,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';
import { LeadNote, parseLeadNotes, serializeLeadNotes, compressImageFile } from '../utils/leadNotes';
import { formatPhone, formatWhatsAppLink } from '../utils/formatters';
import { LEAD_STAGE_LABELS } from '../utils/leadStatus';
import { LEAD_STATUS_CHANGED_EVENT } from '../utils/leadStatusPersistence';
import { LeadParametersModal } from './LeadParametersModal';

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

interface AnotacoesViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
  onNavigate?: (page: PageKey, proposalCode?: string) => void;
}

export const AnotacoesView: React.FC<AnotacoesViewProps> = ({
  theme,
  onShowToast,
  onNavigate,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Propostas cadastradas no sistema
  const [allProposals, setAllProposals] = useState<ClientProposal[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lead' | 'client'>('all');
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [proposalFilter, setProposalFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');

  // Modal de Criação ("Gerar Anotação")
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTargetType, setCreateTargetType] = useState<NoteTargetType>('lead');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [createText, setCreateText] = useState('');
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [processingCreateImages, setProcessingCreateImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraggingCreate, setIsDraggingCreate] = useState(false);

  // Propostas vinculadas ao cliente selecionado no modal de criação
  const [clientProposals, setClientProposals] = useState<ClientProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [loadingClientProposals, setLoadingClientProposals] = useState(false);

  // Criação rápida de nova proposta inline
  const [showAddProposalInline, setShowAddProposalInline] = useState(false);
  const [newPropCode, setNewPropCode] = useState('');
  const [newPropStatus, setNewPropStatus] = useState('Em negociação');
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  // Modal de Edição
  const [editingNote, setEditingNote] = useState<UnifiedNote | null>(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [processingEditImages, setProcessingEditImages] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Exclusão Segura
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Modal de Parâmetros do Lead
  const [paramsLead, setParamsLead] = useState<Lead | null>(null);
  const [paramsInitialTab, setParamsInitialTab] = useState<'parametros' | 'propostas' | 'conta_luz' | 'anotacoes'>('parametros');

  // Navegação para a proposta ao clicar na tag
  const handleOpenProposalLink = (note: UnifiedNote) => {
    if (onNavigate) {
      onNavigate('propostas', note.proposalCode);
      return;
    }

    if (note.targetType === 'lead') {
      const foundLead = leads.find((l) => l.id === note.targetId) || note.rawLead;
      if (foundLead) {
        setParamsInitialTab('propostas');
        setParamsLead(foundLead);
        return;
      }
    }

    onShowToast(`Proposta vinculada: ${note.proposalCode} (${note.proposalStatus || 'Registrada'})`);
  };

  // Lightbox para imagens
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);


  const leadsRef = useRef<Lead[]>(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // Carrega leads, clientes e propostas
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [leadsData, clientsData, propsData] = await Promise.all([
        fetchLeads().catch((err) => {
          console.warn('Erro ao carregar leads para anotações:', err);
          return [] as Lead[];
        }),
        fetchClients().catch((err) => {
          console.warn('Erro ao carregar clientes para anotações:', err);
          return [] as Client[];
        }),
        fetchAllClientProposals().catch((err) => {
          console.warn('Erro ao carregar propostas para anotações:', err);
          return [] as ClientProposal[];
        }),
      ]);

      const syncedClients = mergeClientsWithLeads(clientsData, leadsData);
      setLeads(leadsData);
      setClients(syncedClients);
      setAllProposals(propsData);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar registros de anotações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    // Sincroniza em tempo real caso clientes ou leads ou propostas sejam atualizados
    const handleClientsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Client[]>;
      if (customEvent.detail) {
        setClients(mergeClientsWithLeads(customEvent.detail, leadsRef.current || []));
      } else {
        void fetchClients().then((cls) => {
          setClients(mergeClientsWithLeads(cls, leadsRef.current || []));
        });
      }
    };

    const handleLeadStatusUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ leadId: string; status: LeadStage }>;
      if (customEvent.detail) {
        setLeads((prev) => {
          const updated = prev.map((l) =>
            l.id === customEvent.detail.leadId ? { ...l, status: customEvent.detail.status } : l
          );
          setClients((prevClients) => mergeClientsWithLeads(prevClients, updated));
          return updated;
        });
      }
    };

    const handleProposalsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ClientProposal[]>;
      if (customEvent.detail) {
        setAllProposals(customEvent.detail);
      } else {
        void fetchAllClientProposals().then(setAllProposals);
      }
    };

    window.addEventListener(CLIENTS_UPDATED_EVENT, handleClientsUpdate);
    window.addEventListener(LEAD_STATUS_CHANGED_EVENT, handleLeadStatusUpdate);
    window.addEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);

    return () => {
      window.removeEventListener(CLIENTS_UPDATED_EVENT, handleClientsUpdate);
      window.removeEventListener(LEAD_STATUS_CHANGED_EVENT, handleLeadStatusUpdate);
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    };
  }, []);

  // Monitora a seleção de cliente no modal de criação e carrega todas as propostas dele
  useEffect(() => {
    if (createTargetType === 'client' && selectedTargetId) {
      setLoadingClientProposals(true);
      const client = clients.find((c) => c.id === selectedTargetId);
      void fetchProposalsForClient(selectedTargetId, client?.name)
        .then((props) => {
          setClientProposals(props);
          if (props.length > 0) {
            setSelectedProposalId(props[0].id);
          } else {
            setSelectedProposalId('');
          }
        })
        .finally(() => {
          setLoadingClientProposals(false);
        });
    } else {
      setClientProposals([]);
      setSelectedProposalId('');
      setShowAddProposalInline(false);
    }
  }, [createTargetType, selectedTargetId, clients]);

  // Mapeia todas as anotações existentes de Leads e Clientes
  const allNotes: UnifiedNote[] = useMemo(() => {
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
      const parsed = parseLeadNotes(lead.notes);
      parsed.forEach((note) => {
        if (seenNoteIds.has(note.id)) return;
        seenNoteIds.add(note.id);
        list.push({
          id: note.id,
          targetType: 'lead',
          targetId: lead.id,
          targetName: lead.name,
          targetPhone: lead.phone,
          targetEmail: lead.email,
          targetLocation: lead.city ? `${lead.city}/${lead.state || 'UF'}` : undefined,
          targetStatus: LEAD_STAGE_LABELS[lead.status] || lead.status,
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
  }, [leads, clients]);

  // Contadores
  const totalNotesCount = allNotes.length;
  const leadNotesCount = useMemo(() => allNotes.filter((n) => n.targetType === 'lead').length, [allNotes]);
  const clientNotesCount = useMemo(() => allNotes.filter((n) => n.targetType === 'client').length, [allNotes]);
  const withProposalCount = useMemo(() => allNotes.filter((n) => !!n.proposalCode).length, [allNotes]);

  // Filtra e ordena as anotações
  const filteredNotes = useMemo(() => {
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
  }, [allNotes, typeFilter, onlyWithImages, proposalFilter, searchTerm, sortBy]);

  // Opções para a escolha no modal de criação
  const targetOptions = useMemo(() => {
    const query = targetSearchQuery.toLowerCase().trim();
    if (createTargetType === 'lead') {
      return leads
        .filter((l) => {
          if (!query) return true;
          return (
            l.name.toLowerCase().includes(query) ||
            (l.phone && l.phone.includes(query)) ||
            (l.city && l.city.toLowerCase().includes(query))
          );
        })
        .map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          city: l.city,
          state: l.state,
          badge: LEAD_STAGE_LABELS[l.status] || l.status,
          notesCount: parseLeadNotes(l.notes).length,
        }));
    } else {
      return clients
        .filter((c) => {
          if (!query) return true;
          return (
            c.name.toLowerCase().includes(query) ||
            (c.phone && c.phone.includes(query)) ||
            (c.city && c.city.toLowerCase().includes(query))
          );
        })
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          city: c.city,
          state: c.state,
          badge: c.activeStatus || c.type,
          notesCount: parseLeadNotes(c.notes).length,
        }));
    }
  }, [createTargetType, leads, clients, targetSearchQuery]);

  // Contato selecionado no modal
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return null;
    return targetOptions.find((t) => t.id === selectedTargetId) || null;
  }, [selectedTargetId, targetOptions]);

  // Prepara criação de nota
  const handleOpenCreateModal = (defaultType?: NoteTargetType, defaultTargetId?: string) => {
    setCreateTargetType(defaultType || 'lead');
    setSelectedTargetId(defaultTargetId || '');
    setTargetSearchQuery('');
    setCreateText('');
    setCreateImages([]);
    setShowAddProposalInline(false);
    setShowCreateModal(true);
  };

  // Criação rápida de nova proposta inline durante o cadastro da anotação
  const handleCreateQuickProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      onShowToast('Selecione primeiro o cliente antes de criar uma proposta.');
      return;
    }
    const client = clients.find((c) => c.id === selectedTargetId);
    if (!client) return;

    setIsCreatingProposal(true);
    try {
      const created = await createQuickProposalForClient({
        clientId: client.id,
        clientName: client.name,
        code: newPropCode.trim() || undefined,
        status: newPropStatus || 'Em negociação',
      });

      setClientProposals((prev) => [created, ...prev]);
      setSelectedProposalId(created.id);
      setShowAddProposalInline(false);
      setNewPropCode('');
      onShowToast(`Nova proposta ${created.code} (${created.status}) vinculada com sucesso!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao criar proposta rápida.');
    } finally {
      setIsCreatingProposal(false);
    }
  };

  // Processamento de imagens no upload
  const handleProcessUploadImages = async (files: FileList | null, isEdit = false) => {
    if (!files || files.length === 0) return;
    const setterLoading = isEdit ? setProcessingEditImages : setProcessingCreateImages;
    setterLoading(true);

    try {
      const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (validFiles.length === 0) {
        onShowToast('Selecione apenas arquivos de imagem válidos (PNG, JPEG, WebP).');
        return;
      }

      const compressedPromises = validFiles.map((file) => compressImageFile(file));
      const compressedList = await Promise.all(compressedPromises);

      if (isEdit) {
        setEditImages((prev) => [...prev, ...compressedList]);
      } else {
        setCreateImages((prev) => [...prev, ...compressedList]);
      }
      onShowToast(`${compressedList.length} imagem(ns) anexada(s) com sucesso.`);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao processar as fotos anexadas.');
    } finally {
      setterLoading(false);
    }
  };

  // Salvar nova anotação
  const handleSaveCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTargetId) {
      onShowToast('Por favor, selecione para quem você deseja gerar a anotação.');
      return;
    }
    if (!createText.trim() && createImages.length === 0) {
      onShowToast('Digite o texto da anotação ou anexe ao menos uma foto.');
      return;
    }

    setIsSubmitting(true);

    // Se for cliente, identifica a proposta vinculada selecionada
    let linkedProposal: ClientProposal | undefined;
    if (createTargetType === 'client') {
      linkedProposal = clientProposals.find((p) => p.id === selectedProposalId);
      if (!linkedProposal && clientProposals.length > 0) {
        linkedProposal = clientProposals[0];
      }
    }

    const newNoteItem: LeadNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: createText.trim(),
      createdAt: new Date().toISOString(),
      images: createImages,
      proposalId: linkedProposal?.id,
      proposalCode: linkedProposal?.code,
      proposalTitle: linkedProposal?.title,
      proposalValue: linkedProposal?.totalValue,
      proposalStatus: linkedProposal?.status,
    };

    try {
      if (createTargetType === 'lead') {
        const lead = leads.find((l) => l.id === selectedTargetId);
        if (!lead) throw new Error('Lead selecionado não encontrado.');
        const existingNotes = parseLeadNotes(lead.notes);
        const updatedNotes = [newNoteItem, ...existingNotes];
        const serialized = serializeLeadNotes(updatedNotes);

        await updateLeadNotes(lead.id, serialized);
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, notes: serialized } : l))
        );
        onShowToast(`Anotação gerada com sucesso para o lead ${lead.name}!`);
      } else {
        const client = clients.find((c) => c.id === selectedTargetId);
        if (!client) throw new Error('Cliente selecionado não encontrado.');
        const existingNotes = parseLeadNotes(client.notes);
        const updatedNotes = [newNoteItem, ...existingNotes];
        const serialized = serializeLeadNotes(updatedNotes);

        await updateClientNotes(client.id, serialized, client.sourceLeadId);
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, notes: serialized } : c))
        );
        if (client.sourceLeadId) {
          setLeads((prev) =>
            prev.map((l) => (l.id === client.sourceLeadId ? { ...l, notes: serialized } : l))
          );
        }
        onShowToast(
          `Anotação vinculada ao cliente ${client.name} ${
            linkedProposal ? `e à proposta ${linkedProposal.code}` : ''
          } salva com sucesso!`
        );
      }

      setShowCreateModal(false);
      setCreateText('');
      setCreateImages([]);
      setSelectedTargetId('');
      setSelectedProposalId('');
    } catch (err: any) {
      onShowToast(err?.message || 'Falha ao salvar anotação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de edição
  const handleOpenEditNote = (note: UnifiedNote) => {
    setEditingNote(note);
    setEditText(note.text);
    setEditImages(note.images || []);
  };

  // Salvar anotação editada
  const handleSaveEditNote = async () => {
    if (!editingNote) return;
    if (!editText.trim() && editImages.length === 0) {
      onShowToast('A anotação não pode ficar vazia.');
      return;
    }

    setIsSavingEdit(true);
    try {
      if (editingNote.targetType === 'lead') {
        const lead = leads.find((l) => l.id === editingNote.targetId);
        if (!lead) throw new Error('Lead não encontrado.');
        const existingNotes = parseLeadNotes(lead.notes);
        const updatedNotes = existingNotes.map((n) =>
          n.id === editingNote.id
            ? { ...n, text: editText.trim(), images: editImages, updatedAt: new Date().toISOString() }
            : n
        );
        const serialized = serializeLeadNotes(updatedNotes);
        await updateLeadNotes(lead.id, serialized);
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, notes: serialized } : l))
        );
      } else {
        const client = clients.find((c) => c.id === editingNote.targetId);
        if (!client) throw new Error('Cliente não encontrado.');

        // Mantém a vinculação original da proposta sem alteração, atualizando somente texto, imagens e data
        const existingNotes = parseLeadNotes(client.notes);
        const updatedNotes = existingNotes.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                text: editText.trim(),
                images: editImages,
                updatedAt: new Date().toISOString(),
              }
            : n
        );
        const serialized = serializeLeadNotes(updatedNotes);
        await updateClientNotes(client.id, serialized, client.sourceLeadId);
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, notes: serialized } : c))
        );
        if (client.sourceLeadId) {
          setLeads((prev) =>
            prev.map((l) => (l.id === client.sourceLeadId ? { ...l, notes: serialized } : l))
          );
        }
      }

      onShowToast('Anotação atualizada com sucesso!');
      setEditingNote(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao atualizar anotação.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Excluir anotação
  const handleDeleteNote = async (note: UnifiedNote) => {
    try {
      if (note.targetType === 'lead') {
        const lead = leads.find((l) => l.id === note.targetId);
        if (!lead) throw new Error('Lead não encontrado.');
        const existingNotes = parseLeadNotes(lead.notes);
        const updatedNotes = existingNotes.filter((n) => n.id !== note.id);
        const serialized = serializeLeadNotes(updatedNotes);
        await updateLeadNotes(lead.id, serialized);
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, notes: serialized } : l))
        );
      } else {
        const client = clients.find((c) => c.id === note.targetId);
        if (!client) throw new Error('Cliente não encontrado.');
        const existingNotes = parseLeadNotes(client.notes);
        const updatedNotes = existingNotes.filter((n) => n.id !== note.id);
        const serialized = serializeLeadNotes(updatedNotes);
        await updateClientNotes(client.id, serialized, client.sourceLeadId);
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, notes: serialized } : c))
        );
        if (client.sourceLeadId) {
          setLeads((prev) =>
            prev.map((l) => (l.id === client.sourceLeadId ? { ...l, notes: serialized } : l))
          );
        }
      }

      setConfirmDeleteNoteId(null);
      onShowToast('Anotação excluída com sucesso.');
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao excluir a anotação.');
    }
  };

  // Formatação de data e hora
  const formatDateDisplay = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <section id="anotacoes-page" className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header do Ambiente */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
              Central de Atendimento & CRM
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                color: theme.secondary,
              }}
            >
              <Sparkles className="h-3 w-3" />
              {totalNotesCount} {totalNotesCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: theme.text }}>
            Anotações
          </h1>
          <p className="text-sm text-[var(--muted)] max-w-2xl">
            Histórico centralizado de registros, alinhamentos comerciais e observações técnicas vinculadas a{' '}
            <strong className="text-[var(--text)]">Leads</strong> e{' '}
            <strong className="text-[var(--text)]">Clientes</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="btn-outline h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.primary }}
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-gerar-anotacao"
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="btn-filled h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
          >
            <Plus className="h-4 w-4" />
            <span>Gerar Anotação</span>
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div
        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-sm"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca em Tempo Real */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--dim)]" />
            <input
              id="search-anotacoes"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do lead/cliente, texto da nota, telefone ou cidade..."
              className="w-full h-11 pl-10 pr-9 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all focus:border-[var(--secondary)]"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <span className="text-xs text-[var(--dim)] font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-11 px-3 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Linha de Filtros por Segmento (Leads / Clientes) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: theme.border }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--dim)] mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filtrar:
            </span>

            {/* Filtro: Todos */}
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'all' ? 'shadow-sm' : 'border opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: typeFilter === 'all' ? theme.secondary : 'transparent',
                color: typeFilter === 'all' ? 'var(--secondary-fg)' : theme.text,
                borderColor: typeFilter === 'all' ? theme.secondary : theme.border,
              }}
            >
              <span>Todos</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px]"
                style={{
                  backgroundColor: typeFilter === 'all' ? 'rgba(0,0,0,0.18)' : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                }}
              >
                {totalNotesCount}
              </span>
            </button>

            {/* Filtro: Apenas Leads */}
            <button
              type="button"
              onClick={() => setTypeFilter('lead')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'lead' ? 'shadow-sm' : 'border opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: typeFilter === 'lead' ? theme.secondary : 'transparent',
                color: typeFilter === 'lead' ? 'var(--secondary-fg)' : theme.text,
                borderColor: typeFilter === 'lead' ? theme.secondary : theme.border,
              }}
            >
              <User className="h-3.5 w-3.5" />
              <span>Leads</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px]"
                style={{
                  backgroundColor: typeFilter === 'lead' ? 'rgba(0,0,0,0.18)' : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                }}
              >
                {leadNotesCount}
              </span>
            </button>

            {/* Filtro: Apenas Clientes */}
            <button
              type="button"
              onClick={() => setTypeFilter('client')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'client' ? 'shadow-sm' : 'border opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: typeFilter === 'client' ? theme.secondary : 'transparent',
                color: typeFilter === 'client' ? 'var(--secondary-fg)' : theme.text,
                borderColor: typeFilter === 'client' ? theme.secondary : theme.border,
              }}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Clientes</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px]"
                style={{
                  backgroundColor: typeFilter === 'client' ? 'rgba(0,0,0,0.18)' : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                }}
              >
                {clientNotesCount}
              </span>
            </button>

            {/* Separador vertical sutil */}
            <div className="h-5 w-px mx-1 bg-[var(--border)]" />

            {/* Seletor de Proposta */}
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[var(--secondary)]" />
              <select
                value={proposalFilter}
                onChange={(e) => setProposalFilter(e.target.value)}
                className="h-8 px-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: theme.background,
                  borderColor: proposalFilter !== 'all' ? theme.secondary : theme.border,
                  color: theme.text,
                }}
                title="Filtrar por proposta vinculada"
              >
                <option value="all">Todas as Propostas</option>
                <option value="with_proposal">Somente com Proposta Vinculada ({withProposalCount})</option>
                <option value="without_proposal">Sem Proposta Vinculada</option>
                {allProposals.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.code} · {prop.status} ({prop.clientName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle de Anotações com Fotos */}
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-[var(--dim)] hover:text-[var(--text)] transition-colors">
            <input
              type="checkbox"
              checked={onlyWithImages}
              onChange={(e) => setOnlyWithImages(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--secondary)] focus:ring-[var(--secondary)] h-4 w-4 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" />
              Apenas anotações com fotos
            </span>
          </label>
        </div>
      </div>

      {/* Feedback de Erro se houver */}
      {error && (
        <div
          className="rounded-xl border p-4 text-xs font-semibold flex items-center justify-between"
          style={{
            borderColor: 'var(--danger)',
            backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            color: 'var(--danger)',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="underline hover:brightness-125 cursor-pointer ml-3"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid de Anotações */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border space-y-3" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
          <RefreshCw className="h-7 w-7 animate-spin text-[var(--secondary)]" />
          <p className="text-sm font-semibold text-[var(--dim)]">Carregando anotações de Leads e Clientes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center p-12 sm:p-16 rounded-2xl border space-y-4 shadow-sm"
          style={{
            backgroundColor: theme.primary,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.secondary,
            }}
          >
            <NotepadText className="h-8 w-8" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold">Nenhuma anotação encontrada</h3>
            <p className="text-xs sm:text-sm text-[var(--muted)]">
              {searchTerm || typeFilter !== 'all' || onlyWithImages
                ? 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar a busca ou limpar os filtros.'
                : 'Você ainda não registrou anotações para seus Leads ou Clientes. Comece agora gerando a primeira!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {(searchTerm || typeFilter !== 'all' || onlyWithImages) && (
              <button
                type="button"
                data-text-only="true"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setOnlyWithImages(false);
                }}
                className="btn-text px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="btn-filled px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 cursor-pointer"
              style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
            >
              <Plus className="h-4 w-4" />
              <span>Gerar Nova Anotação</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => {
            const isDeleting = confirmDeleteNoteId === note.id;
            const isLead = note.targetType === 'lead';

            return (
              <article
                key={`${note.targetType}-${note.targetId}-${note.id}`}
                className="flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden min-w-0"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                {/* Header do Card da Anotação */}
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Badge do Tipo (LEAD ou CLIENTE) */}
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0"
                        style={{
                          backgroundColor: isLead
                            ? 'color-mix(in srgb, var(--secondary) 18%, transparent)'
                            : 'color-mix(in srgb, #10b981 18%, transparent)',
                          color: isLead ? theme.secondary : '#10b981',
                        }}
                      >
                        {isLead ? <User className="h-3 w-3 shrink-0" /> : <Building2 className="h-3 w-3 shrink-0" />}
                        {isLead ? 'Lead' : 'Cliente'}
                      </span>

                      {/* Status secundário (nunca quebra linha internamente) */}
                      {note.targetStatus && (
                        <span
                          className="rounded-lg px-2.5 py-0.5 text-[10px] font-semibold border whitespace-nowrap shrink-0 inline-block"
                          style={{
                            borderColor: theme.border,
                            color: 'var(--dim)',
                            backgroundColor: theme.background,
                          }}
                        >
                          {note.targetStatus}
                        </span>
                      )}
                    </div>

                    {/* Data e Hora do Registro em coluna com os badges */}
                    <div className="flex items-center gap-1 text-[11px] text-[var(--dim)] whitespace-nowrap">
                      <Calendar className="h-3 w-3 shrink-0 text-[var(--dim)]" />
                      <span>{formatDateDisplay(note.createdAt)}</span>
                    </div>
                  </div>

                  {/* Nome da Pessoa / Empresa */}
                  <div>
                    <h3 className="text-base font-bold line-clamp-1 hover:text-[var(--secondary)] transition-colors">
                      {note.targetName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--muted)]">
                      {note.targetPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[var(--dim)]" />
                          {formatPhone(note.targetPhone)}
                        </span>
                      )}
                      {note.targetLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[var(--dim)]" />
                          {note.targetLocation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divisória sutil */}
                  <div className="border-t" style={{ borderColor: theme.border }} />

                  {/* Proposta Vinculada ao Cliente/Lead - Link clicável */}
                  {note.proposalCode && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProposalLink(note);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenProposalLink(note);
                          }
                        }}
                        className="proposal-tag-link group inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer select-none"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondary }} />
                        <span
                          className="font-extrabold tracking-tight whitespace-nowrap shrink-0 group-hover:underline underline-offset-2"
                          style={{ color: theme.secondary }}
                        >
                          {note.proposalCode}
                        </span>
                        {note.proposalStatus && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold border whitespace-nowrap shrink-0"
                            style={{
                              backgroundColor:
                                note.proposalStatus === 'Aprovada'
                                  ? 'color-mix(in srgb, #10b981 18%, transparent)'
                                  : 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                              color: note.proposalStatus === 'Aprovada' ? '#10b981' : theme.secondary,
                              borderColor:
                                note.proposalStatus === 'Aprovada'
                                  ? 'color-mix(in srgb, #10b981 30%, transparent)'
                                  : 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                            }}
                          >
                            {note.proposalStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Texto da Anotação com Scrollbar estritamente vertical */}
                  <div className="text-xs sm:text-sm text-[var(--text)] whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed max-h-48 overflow-y-auto overflow-x-hidden overscroll-contain pr-1.5 w-full">
                    {note.text}
                  </div>

                  {/* Galeria de Fotos Anexadas */}
                  {note.images && note.images.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] text-[var(--dim)] font-semibold mb-1.5">
                        <span className="flex items-center gap-1">
                          <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" />
                          {note.images.length} {note.images.length === 1 ? 'foto anexada' : 'fotos anexadas'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {note.images.slice(0, 3).map((imgUrl, imgIndex) => (
                          <div
                            key={imgIndex}
                            onClick={() => setActiveLightboxImg(imgUrl)}
                            className="group relative h-18 rounded-xl overflow-hidden border cursor-pointer"
                            style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          >
                            <img
                              src={imgUrl}
                              alt={`Anexo ${imgIndex + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                            {imgIndex === 2 && note.images.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                                +{note.images.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer do Card com Ações */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.border }}>
                  {/* Atalhos Rápidos (WhatsApp / Abrir Lead) */}
                  <div className="flex items-center gap-1.5">
                    {note.targetPhone && (
                      <a
                        href={formatWhatsAppLink(note.targetPhone)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border text-[var(--dim)] hover:text-[#25D366] hover:border-[#25D366]/40 transition-colors"
                        style={{ borderColor: theme.border, backgroundColor: theme.background }}
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}

                    {isLead && note.rawLead && (
                      <button
                        type="button"
                        onClick={() => setParamsLead(note.rawLead!)}
                        className="p-1.5 rounded-lg border text-[var(--dim)] hover:text-[var(--secondary)] hover:border-[var(--secondary)]/40 transition-colors cursor-pointer"
                        style={{ borderColor: theme.border, backgroundColor: theme.background }}
                        title="Abrir parâmetros completos do Lead"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ações de Edição e Exclusão com Regras Semânticas */}
                  <div className="flex items-center gap-1.5">
                    {isDeleting ? (
                      <div className="flex items-center gap-1 animate-fadeIn">
                        <span className="text-[11px] font-bold text-[var(--danger)] mr-0.5">Excluir?</span>
                        <button
                          type="button"
                          data-delete-btn="true"
                          onClick={() => void handleDeleteNote(note)}
                          className="btn-danger-solid px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          data-text-only="true"
                          onClick={() => setConfirmDeleteNoteId(null)}
                          className="btn-text px-2 py-1 text-[11px] font-medium cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditNote(note)}
                          className="p-1.5 rounded-lg border text-[var(--dim)] hover:text-[var(--secondary)] hover:border-[var(--secondary)]/40 transition-colors cursor-pointer"
                          style={{ borderColor: theme.border, backgroundColor: theme.background }}
                          title="Editar anotação"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          data-delete-btn="true"
                          onClick={() => setConfirmDeleteNoteId(note.id)}
                          className="btn-delete p-1.5 rounded-lg border text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] transition-colors cursor-pointer"
                          style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}
                          title="Excluir anotação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: GERAR NOVA ANOTAÇÃO */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
          style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 82%, transparent)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
              boxShadow: `0 24px 60px ${theme.secondary}33`,
            }}
          >
            {/* Header do Modal */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: theme.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm shrink-0"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.secondary,
                  }}
                >
                  <NotepadText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Gerar Nova Anotação</h2>
                  <p className="text-xs text-[var(--muted)]">
                    Escolha o destinatário (Lead ou Cliente) e cadastre as observações ou fotos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Formulário com Scroll */}
            <form onSubmit={handleSaveCreateNote} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Etapa 1: Escolher Tipo de Destinatário (Lead ou Cliente) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
                  1. Para quem você deseja gerar a anotação?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Opção Lead */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreateTargetType('lead');
                      setSelectedTargetId('');
                      setTargetSearchQuery('');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      createTargetType === 'lead'
                        ? 'ring-2 border-transparent'
                        : 'hover:border-[var(--secondary)]/50'
                    }`}
                    style={{
                      backgroundColor: createTargetType === 'lead'
                        ? 'color-mix(in srgb, var(--secondary) 12%, transparent)'
                        : theme.background,
                      borderColor: createTargetType === 'lead' ? theme.secondary : theme.border,
                      boxShadow: createTargetType === 'lead' ? `0 0 0 2px ${theme.secondary}` : 'none',
                    }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{
                        backgroundColor: createTargetType === 'lead' ? theme.secondary : 'transparent',
                        color: createTargetType === 'lead' ? 'var(--secondary-fg)' : 'var(--dim)',
                      }}
                    >
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold">Alguém no Leads</div>
                      <div className="text-[11px] text-[var(--muted)]">Oportunidades do funil ({leads.length})</div>
                    </div>
                  </button>

                  {/* Opção Cliente */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreateTargetType('client');
                      setSelectedTargetId('');
                      setTargetSearchQuery('');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      createTargetType === 'client'
                        ? 'ring-2 border-transparent'
                        : 'hover:border-[var(--secondary)]/50'
                    }`}
                    style={{
                      backgroundColor: createTargetType === 'client'
                        ? 'color-mix(in srgb, var(--secondary) 12%, transparent)'
                        : theme.background,
                      borderColor: createTargetType === 'client' ? theme.secondary : theme.border,
                      boxShadow: createTargetType === 'client' ? `0 0 0 2px ${theme.secondary}` : 'none',
                    }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{
                        backgroundColor: createTargetType === 'client' ? theme.secondary : 'transparent',
                        color: createTargetType === 'client' ? 'var(--secondary-fg)' : 'var(--dim)',
                      }}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold">Cliente Adicionado</div>
                      <div className="text-[11px] text-[var(--muted)]">Carteira cadastrada ({clients.length})</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Etapa 2: Selecionar o Lead ou Cliente específico */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
                    2. Selecionar {createTargetType === 'lead' ? 'o Lead' : 'o Cliente'}
                  </label>
                  {selectedTarget && (
                    <span className="text-[11px] font-semibold text-[var(--secondary)] flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Selecionado: {selectedTarget.name}
                    </span>
                  )}
                </div>

                {/* Input de filtro para encontrar o contato rapidamente */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--dim)]" />
                    <input
                      type="text"
                      value={targetSearchQuery}
                      onChange={(e) => setTargetSearchQuery(e.target.value)}
                      placeholder={`Filtrar ${createTargetType === 'lead' ? 'leads' : 'clientes'} por nome, telefone ou cidade...`}
                      className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs font-medium outline-none transition-all focus:border-[var(--secondary)]"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                  </div>

                  {/* Dropdown / Lista de Seleção */}
                  <select
                    id="select-target-contact"
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border text-xs sm:text-sm font-semibold outline-none cursor-pointer"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: selectedTargetId ? theme.secondary : theme.border,
                      color: theme.text,
                    }}
                    required
                  >
                    <option value="" style={{ backgroundColor: theme.primary, color: theme.text }}>
                      -- Escolha um {createTargetType === 'lead' ? 'Lead' : 'Cliente'} ({targetOptions.length} disponíveis) --
                    </option>
                    {targetOptions.map((opt) => (
                      <option
                        key={opt.id}
                        value={opt.id}
                        style={{ backgroundColor: theme.primary, color: theme.text }}
                      >
                        {opt.name} {opt.phone ? `· ${formatPhone(opt.phone)}` : ''} {opt.city ? `(${opt.city}/${opt.state || 'UF'})` : ''} [{opt.badge}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Card de Confirmação do Destinatário Selecionado */}
                {selectedTarget && (
                  <div
                    className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 6%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    }}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-[var(--text)]">{selectedTarget.name}</div>
                      <div className="text-[var(--muted)] flex items-center gap-3">
                        {selectedTarget.phone && <span>{formatPhone(selectedTarget.phone)}</span>}
                        {selectedTarget.city && <span>{selectedTarget.city}/{selectedTarget.state}</span>}
                        <span>{selectedTarget.notesCount} anotação(ões) existentes</span>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--secondary) 20%, transparent)',
                        color: theme.secondary,
                      }}
                    >
                      {selectedTarget.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Etapa 3 (Condicional para Cliente): Vincular à Proposta deste Cliente */}
              {createTargetType === 'client' && selectedTargetId && (
                <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: 'color-mix(in srgb, var(--neutral) 96%, transparent)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--secondary) 18%, transparent)',
                          color: theme.secondary,
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
                          3. Vincular à Proposta deste Cliente
                        </label>
                        <p className="text-[11px] text-[var(--muted)]">
                          Como este cliente pode possuir mais de uma proposta comercial, selecione a opção correspondente:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddProposalInline(!showAddProposalInline)}
                      className="btn-text text-xs font-bold flex items-center gap-1 cursor-pointer"
                      style={{ color: theme.secondary }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {showAddProposalInline ? 'Ocultar' : 'Nova Proposta'}
                    </button>
                  </div>

                  {/* Formulário Inline de Criação Rápida de Proposta */}
                  {showAddProposalInline && (
                    <div
                      className="p-3.5 rounded-xl border space-y-3 animate-fadeIn"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.secondary }}>
                          <Zap className="h-3.5 w-3.5" /> Cadastrar Proposta para {selectedTarget?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddProposalInline(false)}
                          className="p-1 text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[var(--dim)] mb-1">
                            Código da Proposta (Opcional)
                          </label>
                          <input
                            type="text"
                            value={newPropCode}
                            onChange={(e) => setNewPropCode(e.target.value)}
                            placeholder="Ex: PROP-2026-095 (ou automático)"
                            className="w-full h-9 px-3 rounded-lg border text-xs font-medium outline-none"
                            style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[var(--dim)] mb-1">
                            Status da Proposta
                          </label>
                          <select
                            value={newPropStatus}
                            onChange={(e) => setNewPropStatus(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border text-xs font-medium outline-none cursor-pointer"
                            style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                          >
                            <option value="Em negociação">Em negociação</option>
                            <option value="Aprovada">Aprovada</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Recusada">Recusada</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => void handleCreateQuickProposal(e)}
                            disabled={isCreatingProposal}
                            className="h-9 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-98 cursor-pointer"
                            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                          >
                            {isCreatingProposal ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Salvar e Selecionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback de carregamento das propostas */}
                  {loadingClientProposals ? (
                    <div className="flex items-center justify-center p-4 gap-2 text-xs text-[var(--dim)] font-medium">
                      <RefreshCw className="h-4 w-4 animate-spin text-[var(--secondary)]" />
                      Carregando propostas cadastradas do cliente...
                    </div>
                  ) : clientProposals.length === 0 ? (
                    <div className="text-center p-4 rounded-xl border border-dashed text-xs text-[var(--muted)] space-y-2">
                      <p>Nenhuma proposta cadastrada ainda para este cliente.</p>
                      <button
                        type="button"
                        onClick={() => setShowAddProposalInline(true)}
                        className="btn-text text-xs font-bold underline cursor-pointer"
                        style={{ color: theme.secondary }}
                      >
                        Clique aqui para cadastrar a primeira proposta
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {clientProposals.map((prop) => {
                        const isSelected = selectedProposalId === prop.id;

                        return (
                          <div
                            key={prop.id}
                            onClick={() => setSelectedProposalId(prop.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex items-center justify-between ${
                              isSelected
                                ? 'ring-2 border-transparent'
                                : 'hover:border-[var(--secondary)]/40 opacity-90 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: isSelected
                                ? 'color-mix(in srgb, var(--secondary) 10%, transparent)'
                                : theme.background,
                              borderColor: isSelected ? theme.secondary : theme.border,
                              boxShadow: isSelected ? `0 0 0 2px ${theme.secondary}` : 'none',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
                              <span className="text-xs font-extrabold tracking-tight" style={{ color: theme.secondary }}>
                                {prop.code}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor:
                                    prop.status === 'Aprovada'
                                      ? 'color-mix(in srgb, #10b981 18%, transparent)'
                                      : 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                                  color: prop.status === 'Aprovada' ? '#10b981' : theme.secondary,
                                  borderColor:
                                    prop.status === 'Aprovada'
                                      ? 'color-mix(in srgb, #10b981 30%, transparent)'
                                      : 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                                }}
                              >
                                {prop.status}
                              </span>

                              {isSelected && (
                                <div
                                  className="h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm"
                                  style={{ backgroundColor: theme.secondary }}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Etapa seguinte: Conteúdo da Anotação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="create-note-text" className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
                    {createTargetType === 'client' ? '4.' : '3.'} Conteúdo da Anotação
                  </label>
                  <span className="text-[11px] text-[var(--dim)]">
                    {createText.length} caracteres
                  </span>
                </div>
                <textarea
                  id="create-note-text"
                  rows={4}
                  value={createText}
                  onChange={(e) => setCreateText(e.target.value)}
                  placeholder="Escreva aqui os detalhes da conversa, pendências técnicas, alinhamentos da proposta ou notas de visita..."
                  className="w-full p-3.5 rounded-xl border text-xs sm:text-sm font-medium outline-none resize-y transition-all focus:border-[var(--secondary)]"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  autoFocus
                />
              </div>

              {/* Etapa final: Anexar Fotos / Documentos */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
                  {createTargetType === 'client' ? '5.' : '4.'} Anexar Fotos / Documentos (Opcional)
                </label>

                {/* Área de Drag & Drop */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingCreate(true);
                  }}
                  onDragLeave={() => setIsDraggingCreate(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingCreate(false);
                    void handleProcessUploadImages(e.dataTransfer.files, false);
                  }}
                  onClick={() => createFileInputRef.current?.click()}
                  className={`p-4 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    isDraggingCreate
                      ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)]'
                      : 'hover:border-[var(--secondary)]/60'
                  }`}
                  style={{ borderColor: isDraggingCreate ? theme.secondary : theme.border, backgroundColor: theme.background }}
                >
                  <input
                    ref={createFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleProcessUploadImages(e.target.files, false)}
                  />
                  <UploadCloud className="h-6 w-6 text-[var(--secondary)]" />
                  <p className="text-xs font-semibold">
                    Arraste imagens para cá ou <span style={{ color: theme.secondary }}>clique para escolher</span>
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    Suporta fotos do padrão de entrada, telhado, faturas de luz (PNG, JPG, WebP)
                  </p>
                </div>

                {/* Feedback de processamento */}
                {processingCreateImages && (
                  <div className="flex items-center gap-2 text-xs text-[var(--secondary)] font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Otimizando fotos anexadas...
                  </div>
                )}

                {/* Previews das Imagens Anexadas */}
                {createImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                    {createImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative h-16 rounded-lg overflow-hidden border"
                        style={{ borderColor: theme.border }}
                      >
                        <img src={img} alt={`Anexo ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreateImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                          title="Remover foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  data-cancel-outline="true"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline-cancel px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ borderColor: theme.border }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTargetId || (!createText.trim() && createImages.length === 0)}
                  className="btn-filled px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Salvar Anotação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ANOTAÇÃO */}
      {editingNote && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
          style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 82%, transparent)' }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[var(--secondary)]" />
                <h3 className="text-base font-bold">Editar Anotação - {editingNote.targetName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="p-1 rounded-lg text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Informações de Vinculação Fixas (Destinatário e Proposta Vinculada) */}
              <div
                className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--neutral) 96%, transparent)',
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0"
                    style={{
                      backgroundColor:
                        editingNote.targetType === 'lead'
                          ? 'color-mix(in srgb, var(--primary) 20%, transparent)'
                          : 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                      color: editingNote.targetType === 'lead' ? 'var(--text)' : theme.secondary,
                      borderColor:
                        editingNote.targetType === 'lead'
                          ? theme.border
                          : 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    }}
                  >
                    {editingNote.targetType === 'lead' ? 'Lead' : 'Cliente'}: {editingNote.targetName}
                  </span>

                  {editingNote.proposalCode ? (
                    <div
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                      }}
                      title="Proposta vinculada a esta anotação (fixa/não editável)"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondary }} />
                      <span className="font-extrabold tracking-tight whitespace-nowrap shrink-0" style={{ color: theme.secondary }}>
                        {editingNote.proposalCode}
                      </span>
                      {editingNote.proposalStatus && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold border whitespace-nowrap shrink-0"
                          style={{
                            backgroundColor:
                              editingNote.proposalStatus === 'Aprovada'
                                ? 'color-mix(in srgb, #10b981 18%, transparent)'
                                : 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                            color: editingNote.proposalStatus === 'Aprovada' ? '#10b981' : theme.secondary,
                            borderColor:
                              editingNote.proposalStatus === 'Aprovada'
                                ? 'color-mix(in srgb, #10b981 30%, transparent)'
                                : 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                          }}
                        >
                          {editingNote.proposalStatus}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--muted)]">
                      (Sem proposta específica vinculada)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-1.5">
                  Texto da Anotação
                </label>
                <textarea
                  rows={5}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border text-xs sm:text-sm font-medium outline-none resize-y"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  autoFocus
                />
              </div>

              {/* Anexos na edição */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--dim)]">Fotos Anexadas</span>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="btn-text text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" /> Adicionar foto
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleProcessUploadImages(e.target.files, true)}
                  />
                </div>

                {editImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {editImages.map((img, idx) => (
                      <div key={idx} className="group relative h-16 rounded-lg overflow-hidden border" style={{ borderColor: theme.border }}>
                        <img src={img} alt={`Anexo ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 flex items-center justify-end gap-3 border-t" style={{ borderColor: theme.border }}>
              <button
                type="button"
                data-cancel-outline="true"
                onClick={() => setEditingNote(null)}
                className="btn-outline-cancel px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ borderColor: theme.border }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEditNote()}
                disabled={isSavingEdit || (!editText.trim() && editImages.length === 0)}
                className="btn-filled px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PARÂMETROS DO LEAD (se o usuário clicar para ver detalhes do lead a partir da anotação) */}
      {paramsLead && (
        <LeadParametersModal
          lead={paramsLead}
          theme={theme}
          statusLabels={LEAD_STAGE_LABELS}
          initialTab={paramsInitialTab}
          onClose={() => {
            setParamsLead(null);
            setParamsInitialTab('parametros');
          }}
          onLeadUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setParamsLead(updated);
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* LIGHTBOX PARA VISUALIZAÇÃO DE IMAGEM */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/85"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeLightboxImg}
              alt="Visualização do anexo"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </section>
  );
};
