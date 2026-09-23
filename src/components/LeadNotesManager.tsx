import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  NotepadText,
  Plus,
  ImagePlus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ZoomIn,
  Pencil,
  FileText,
  Check,
  Zap,
  User,
  Building2,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { LeadNote, parseLeadNotes, serializeLeadNotes, compressImageFile } from '../utils/leadNotes';
import { updateLeadNotes } from '../services/leads';
import { updateClientNotes } from '../services/clients';
import {
  ClientProposal,
  fetchProposalsForTarget,
  createQuickProposalForTarget,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';

export interface LeadNotesManagerProps {
  leadId: string;
  leadName: string;
  initialNotes?: string;
  theme: ThemeConfig;
  targetType?: 'lead' | 'client';
  onNotesUpdated?: (serializedNotes: string, notesCount: number) => void;
  onShowToast: (message: string) => void;
}

export const LeadNotesManager: React.FC<LeadNotesManagerProps> = ({
  leadId,
  leadName,
  initialNotes,
  theme,
  targetType = 'lead',
  onNotesUpdated,
  onShowToast,
}) => {
  const [notes, setNotes] = useState<LeadNote[]>(() => parseLeadNotes(initialNotes));
  const [newText, setNewText] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Regras de destino da anotação: 'general' (interessado/cliente) ou 'proposal' (proposta específica)
  const [destinationType, setDestinationType] = useState<'general' | 'proposal'>('general');
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [loadingProposals, setLoadingProposals] = useState(false);

  // Criação rápida de nova proposta inline
  const [showAddPropInline, setShowAddPropInline] = useState(false);
  const [newPropCode, setNewPropCode] = useState('');
  const [newPropStatus, setNewPropStatus] = useState('Em negociação');
  const [isCreatingProp, setIsCreatingProp] = useState(false);

  // Filtro da lista de anotações
  const [listFilter, setListFilter] = useState<'all' | 'general' | 'proposal'>('all');

  // Estado para edição
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editDestinationType, setEditDestinationType] = useState<'general' | 'proposal'>('general');
  const [editProposalId, setEditProposalId] = useState<string>('');

  // Drag and drop feedback
  const [isDragging, setIsDragging] = useState(false);

  // Confirmação segura de exclusão de anotação
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Atualiza notas se o prop mudar
  useEffect(() => {
    setNotes(parseLeadNotes(initialNotes));
  }, [initialNotes]);

  const normalizedTargetType: 'lead' | 'client' = targetType === 'client' ? 'client' : 'lead';

  // Carrega propostas vinculadas a este lead ou cliente
  const loadProposals = async () => {
    if (!leadId) return;
    setLoadingProposals(true);
    try {
      const props = await fetchProposalsForTarget(normalizedTargetType, leadId, leadName);
      setProposals(props);
      if (props.length > 0 && !selectedProposalId) {
        setSelectedProposalId(props[0].id);
      }
    } catch (err) {
      console.warn('Erro ao carregar propostas do target no LeadNotesManager:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    void loadProposals();

    const handleProposalsUpdate = () => {
      void loadProposals();
    };

    window.addEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    return () => {
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    };
  }, [leadId, leadName, targetType]);

  const handleProcessFiles = async (files: FileList | null, isEdit = false) => {
    if (!files || files.length === 0) return;
    setProcessingImages(true);

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      onShowToast('Selecione apenas arquivos de imagem (PNG, JPG, WebP).');
      setProcessingImages(false);
      return;
    }

    try {
      const compressedList = await Promise.all(
        imageFiles.map((file) => compressImageFile(file, 1280, 1280, 0.82))
      );

      if (isEdit) {
        setEditImages((prev) => [...prev, ...compressedList]);
      } else {
        setNewImages((prev) => [...prev, ...compressedList]);
      }
      onShowToast(`${compressedList.length} imagem(ns) anexada(s).`);
    } catch (err) {
      console.error('Erro ao processar imagens:', err);
      onShowToast('Falha ao processar imagens selecionadas.');
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  // Criação rápida de proposta inline
  const handleQuickCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;

    setIsCreatingProp(true);
    try {
      const created = await createQuickProposalForTarget(normalizedTargetType, leadId, leadName, {
        code: newPropCode.trim() || undefined,
        status: newPropStatus || 'Em negociação',
      });

      setProposals((prev) => [created, ...prev]);
      setSelectedProposalId(created.id);
      setDestinationType('proposal');
      setShowAddPropInline(false);
      setNewPropCode('');
      onShowToast(`Proposta ${created.code} cadastrada e selecionada!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao criar proposta.');
    } finally {
      setIsCreatingProp(false);
    }
  };

  const handleCreateNote = async () => {
    const trimmed = newText.trim();
    if (!trimmed && newImages.length === 0) {
      onShowToast('Digite um texto ou anexe pelo menos uma imagem para salvar.');
      return;
    }

    setSaving(true);

    // Identifica se a anotação é para a proposta ou geral para o interessado/cliente
    let linkedProp: ClientProposal | undefined;
    if (destinationType === 'proposal') {
      linkedProp = proposals.find((p) => p.id === selectedProposalId) || (proposals.length > 0 ? proposals[0] : undefined);
    }

    const newNoteItem: LeadNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
      images: newImages,
      proposalId: linkedProp?.id,
      proposalCode: linkedProp?.code,
      proposalTitle: linkedProp?.title,
      proposalValue: linkedProp?.totalValue,
      proposalStatus: linkedProp?.status,
    };

    const updatedNotes = [newNoteItem, ...notes];
    const serialized = serializeLeadNotes(updatedNotes);

    try {
      await updateLeadNotes(leadId, serialized);
      if (targetType === 'client') {
        try {
          await updateClientNotes(leadId, serialized);
        } catch {
          // ignore
        }
      }

      setNotes(updatedNotes);
      setNewText('');
      setNewImages([]);
      setDestinationType('general');
      onNotesUpdated?.(serialized, updatedNotes.length);
      onShowToast(
        linkedProp
          ? `Anotação vinculada à proposta ${linkedProp.code} salva com sucesso!`
          : `Anotação ${targetType === 'client' ? 'do cliente' : 'do interessado'} salva com sucesso!`
      );
    } catch (err: any) {
      console.error('Erro ao salvar anotação:', err);
      onShowToast(err?.message || 'Erro ao salvar anotação.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
    setEditImages(note.images || []);
    if (note.proposalId || note.proposalCode) {
      setEditDestinationType('proposal');
      setEditProposalId(note.proposalId || (proposals.find((p) => p.code === note.proposalCode)?.id || ''));
    } else {
      setEditDestinationType('general');
      setEditProposalId(proposals.length > 0 ? proposals[0].id : '');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    const trimmed = editText.trim();
    if (!trimmed && editImages.length === 0) {
      onShowToast('A anotação não pode ficar vazia.');
      return;
    }

    setSaving(true);

    let linkedProp: ClientProposal | undefined;
    if (editDestinationType === 'proposal') {
      linkedProp = proposals.find((p) => p.id === editProposalId) || (proposals.length > 0 ? proposals[0] : undefined);
    }

    const updatedNotes = notes.map((item) => {
      if (item.id === editingNoteId) {
        return {
          ...item,
          text: trimmed,
          images: editImages,
          updatedAt: new Date().toISOString(),
          proposalId: linkedProp ? linkedProp.id : undefined,
          proposalCode: linkedProp ? linkedProp.code : undefined,
          proposalTitle: linkedProp ? linkedProp.title : undefined,
          proposalValue: linkedProp ? linkedProp.totalValue : undefined,
          proposalStatus: linkedProp ? linkedProp.status : undefined,
        };
      }
      return item;
    });

    const serialized = serializeLeadNotes(updatedNotes);

    try {
      await updateLeadNotes(leadId, serialized);
      if (targetType === 'client') {
        try {
          await updateClientNotes(leadId, serialized);
        } catch {
          // ignore
        }
      }

      setNotes(updatedNotes);
      setEditingNoteId(null);
      onNotesUpdated?.(serialized, updatedNotes.length);
      onShowToast('Anotação atualizada.');
    } catch (err: any) {
      console.error('Erro ao atualizar anotação:', err);
      onShowToast(err?.message || 'Erro ao atualizar anotação.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setSaving(true);
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    const serialized = serializeLeadNotes(updatedNotes);

    try {
      await updateLeadNotes(leadId, serialized);
      if (targetType === 'client') {
        try {
          await updateClientNotes(leadId, serialized);
        } catch {
          // ignore
        }
      }
      setNotes(updatedNotes);
      setConfirmDeleteId(null);
      if (editingNoteId === noteId) setEditingNoteId(null);
      onNotesUpdated?.(serialized, updatedNotes.length);
      onShowToast('Anotação excluída.');
    } catch (err: any) {
      console.warn('Persistindo exclusão de anotação localmente:', err);
      setNotes(updatedNotes);
      setConfirmDeleteId(null);
      if (editingNoteId === noteId) setEditingNoteId(null);
      onNotesUpdated?.(serialized, updatedNotes.length);
      onShowToast('Anotação excluída.');
    } finally {
      setSaving(false);
    }
  };

  const formatNoteDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Anotações filtradas
  const filteredNotes = useMemo(() => {
    if (listFilter === 'general') {
      return notes.filter((n) => !n.proposalCode);
    }
    if (listFilter === 'proposal') {
      return notes.filter((n) => !!n.proposalCode);
    }
    return notes;
  }, [notes, listFilter]);

  const generalCount = useMemo(() => notes.filter((n) => !n.proposalCode).length, [notes]);
  const proposalCount = useMemo(() => notes.filter((n) => !!n.proposalCode).length, [notes]);

  const isClient = targetType === 'client';
  const targetLabel = isClient ? 'Cliente' : 'Interessado';

  return (
    <div className="space-y-5">
      {/* Caixa de Criação de Nova Anotação */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleProcessFiles(e.dataTransfer.files, false);
        }}
        className={`rounded-xl border p-4 transition-all ${isDragging ? 'ring-2' : ''}`}
        style={{
          backgroundColor: theme.background,
          borderColor: isDragging ? theme.secondary : theme.border,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
            Nova Anotação para {leadName}
          </label>
          <span className="text-[11px] text-[var(--muted)]">
            Digite ou arraste fotos para anexar
          </span>
        </div>

        {/* REGRAS DO USUÁRIO: Seletor de Destino da Anotação */}
        <div className="mb-3.5 p-3 rounded-xl border space-y-2.5" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">
            Destino da Anotação:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Opção 1: Anotação do Interessado / Cliente */}
            <button
              type="button"
              onClick={() => setDestinationType('general')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                destinationType === 'general' ? 'shadow-sm' : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  destinationType === 'general'
                    ? 'color-mix(in srgb, var(--secondary) 10%, transparent)'
                    : theme.background,
                borderColor: destinationType === 'general' ? theme.secondary : theme.border,
              }}
            >
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    destinationType === 'general'
                      ? theme.secondary
                      : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                  color: destinationType === 'general' ? 'var(--secondary-fg)' : 'var(--dim)',
                }}
              >
                {isClient ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text)]">
                  Para o {targetLabel} (Geral)
                </div>
                <div className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">
                  Observações de contato, reuniões e perfil
                </div>
              </div>
            </button>

            {/* Opção 2: Anotação para a Proposta */}
            <button
              type="button"
              onClick={() => {
                setDestinationType('proposal');
                if (proposals.length > 0 && !selectedProposalId) {
                  setSelectedProposalId(proposals[0].id);
                }
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                destinationType === 'proposal' ? 'shadow-sm' : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  destinationType === 'proposal'
                    ? 'color-mix(in srgb, var(--secondary) 10%, transparent)'
                    : theme.background,
                borderColor: destinationType === 'proposal' ? theme.secondary : theme.border,
              }}
            >
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    destinationType === 'proposal'
                      ? theme.secondary
                      : 'color-mix(in srgb, var(--neutral) 80%, transparent)',
                  color: destinationType === 'proposal' ? 'var(--secondary-fg)' : 'var(--dim)',
                }}
              >
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                  <span>Para a Proposta do {targetLabel}</span>
                  {proposals.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[color-mix(in_srgb,var(--secondary)_20%,transparent)]" style={{ color: theme.secondary }}>
                      {proposals.length}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--muted)] leading-tight mt-0.5 truncate">
                  Vincular anotação a uma proposta técnica/comercial
                </div>
              </div>
            </button>
          </div>

          {/* Sub-seção: Seleção da Proposta quando destinationType === 'proposal' */}
          {destinationType === 'proposal' && (
            <div className="pt-2 border-t space-y-2 animate-fadeIn" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--muted)]">
                  Selecione a proposta correspondente:
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPropInline(!showAddPropInline)}
                  className="btn-text text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ color: theme.secondary }}
                >
                  <FileText className="h-3 w-3" />
                  {showAddPropInline ? 'Ocultar' : 'Gerar Proposta'}
                </button>
              </div>

              {/* Formulário Inline de Criação Rápida de Proposta */}
              {showAddPropInline && (
                <div
                  className="p-3 rounded-lg border space-y-2.5 animate-fadeIn"
                  style={{ backgroundColor: theme.background, borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.secondary }}>
                      <FileText className="h-3.5 w-3.5" /> Gerar Proposta para {leadName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddPropInline(false)}
                      className="p-1 text-[var(--dim)] hover:text-[var(--text)] cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newPropCode}
                      onChange={(e) => setNewPropCode(e.target.value)}
                      placeholder="Código (Ex: PROP-2026-095)"
                      className="h-8 px-2.5 rounded-lg border text-xs outline-none"
                      style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                    />
                    <select
                      value={newPropStatus}
                      onChange={(e) => setNewPropStatus(e.target.value)}
                      className="h-8 px-2 rounded-lg border text-xs outline-none cursor-pointer"
                      style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="Em negociação">Em negociação</option>
                      <option value="Aprovada">Aprovada</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em análise">Em análise</option>
                      <option value="Recusada">Recusada</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => void handleQuickCreateProposal(e)}
                      disabled={isCreatingProp}
                      className="h-7 px-3 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                      style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                    >
                      {isCreatingProp ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      Gerar Proposta
                    </button>
                  </div>
                </div>
              )}

              {loadingProposals ? (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)] py-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: theme.secondary }} />
                  Carregando propostas cadastradas...
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center p-3 rounded-xl border border-dashed text-xs text-[var(--muted)] space-y-1.5">
                  <p>Nenhuma proposta cadastrada ainda para este {targetLabel.toLowerCase()}.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddPropInline(true)}
                    className="btn-text text-xs font-bold underline cursor-pointer"
                    style={{ color: theme.secondary }}
                  >
                    Clique aqui para cadastrar a primeira proposta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {proposals.map((prop) => {
                    const isSelected = selectedProposalId === prop.id;
                    return (
                      <div
                        key={prop.id}
                        onClick={() => setSelectedProposalId(prop.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected ? 'ring-2' : 'hover:border-[var(--secondary)]/40 opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--secondary) 12%, transparent)'
                            : theme.background,
                          borderColor: isSelected ? theme.secondary : theme.border,
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondary }} />
                          <span className="text-xs font-bold tracking-tight truncate" style={{ color: theme.secondary }}>
                            {prop.code}
                          </span>
                          {prop.systemPowerKWp && (
                            <span className="text-[10px] text-[var(--muted)]">
                              · {prop.systemPowerKWp} kWp
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded-full border"
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
                          {isSelected && <Check className="h-3 w-3" style={{ color: theme.secondary }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Campo de Texto da Anotação */}
        <textarea
          rows={3}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={`Insira observações sobre este ${targetLabel.toLowerCase()}, preferências, visitas técnicas ou projeto...`}
          className="w-full rounded-lg border p-3 text-sm outline-none resize-none focus:border-[var(--secondary)] transition-colors"
          style={{
            backgroundColor: theme.primary,
            borderColor: theme.border,
            color: theme.text,
          }}
        />

        {/* Pré-visualização de imagens anexadas */}
        {newImages.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" />
              Fotos anexadas ({newImages.length}):
            </p>
            <div className="flex flex-wrap gap-2.5">
              {newImages.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="group relative h-20 w-20 rounded-lg border overflow-hidden shadow-sm"
                  style={{ borderColor: theme.border }}
                >
                  <img
                    src={imgSrc}
                    alt={`Anexo ${idx + 1}`}
                    className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setActiveLightboxImg(imgSrc)}
                  />
                  <button
                    type="button"
                    onClick={() => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remover imagem"
                    className="absolute top-1 right-1 rounded-full p-1 bg-black/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Ações da Nova Anotação */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleProcessFiles(e.target.files, false)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImages || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:border-[var(--secondary)] hover:text-[var(--secondary)] transition-colors cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.border,
              }}
            >
              <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" />
              <span>Anexar fotos</span>
            </button>
            {processingImages && (
              <span className="text-[11px] text-[var(--secondary)] flex items-center gap-1 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Processando fotos...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCreateNote()}
              disabled={saving || (!newText.trim() && newImages.length === 0)}
              className="btn-filled px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: theme.secondary,
                color: 'var(--secondary-fg)',
              }}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Salvar Anotação
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Feed de Anotações Existentes */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] flex items-center gap-2">
            <NotepadText className="h-3.5 w-3.5 text-[var(--secondary)]" />
            Histórico de Anotações ({notes.length})
          </h3>

          {/* Filtro por destino da anotação */}
          {notes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--dim)] font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filtrar:
              </span>
              <button
                type="button"
                onClick={() => setListFilter('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  listFilter === 'all' ? 'shadow-sm' : 'border opacity-80'
                }`}
                style={{
                  backgroundColor: listFilter === 'all' ? theme.secondary : 'transparent',
                  color: listFilter === 'all' ? 'var(--secondary-fg)' : theme.text,
                  borderColor: theme.border,
                }}
              >
                Todas ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('general')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  listFilter === 'general' ? 'shadow-sm' : 'border opacity-80'
                }`}
                style={{
                  backgroundColor: listFilter === 'general' ? theme.secondary : 'transparent',
                  color: listFilter === 'general' ? 'var(--secondary-fg)' : theme.text,
                  borderColor: theme.border,
                }}
              >
                Gerais ({generalCount})
              </button>
              <button
                type="button"
                onClick={() => setListFilter('proposal')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  listFilter === 'proposal' ? 'shadow-sm' : 'border opacity-80'
                }`}
                style={{
                  backgroundColor: listFilter === 'proposal' ? theme.secondary : 'transparent',
                  color: listFilter === 'proposal' ? 'var(--secondary-fg)' : theme.text,
                  borderColor: theme.border,
                }}
              >
                Com Proposta ({proposalCount})
              </button>
            </div>
          )}
        </div>

        {filteredNotes.length === 0 ? (
          <div
            className="rounded-xl border border-dashed p-8 text-center"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <NotepadText className="mx-auto h-8 w-8 text-[var(--dim)] mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[var(--text)]">
              {notes.length === 0
                ? 'Nenhuma anotação registrada ainda'
                : 'Nenhuma anotação corresponde ao filtro selecionado'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              {notes.length === 0
                ? `Utilize o formulário acima para registrar anotações gerais ou vinculadas às propostas deste ${targetLabel.toLowerCase()}.`
                : 'Alterne os filtros acima para visualizar as outras anotações cadastradas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => {
              const isEditing = editingNoteId === note.id;

              return (
                <article
                  key={note.id}
                  className="rounded-xl border p-4 transition-all shadow-sm"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  }}
                >
                  {isEditing ? (
                    /* Modo Edição */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                        <span className="text-xs font-bold text-[var(--secondary)]">
                          Editando anotação
                        </span>
                        <button
                          type="button"
                          data-text-only="true"
                          onClick={() => setEditingNoteId(null)}
                          className="btn-cancel text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Seletor de Destino no Modo de Edição */}
                      <div className="p-2.5 rounded-lg border space-y-2" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                          Vincular a:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditDestinationType('general')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              editDestinationType === 'general' ? 'shadow-sm' : 'border opacity-80'
                            }`}
                            style={{
                              backgroundColor: editDestinationType === 'general' ? theme.secondary : 'transparent',
                              color: editDestinationType === 'general' ? 'var(--secondary-fg)' : theme.text,
                              borderColor: theme.border,
                            }}
                          >
                            {targetLabel} (Geral)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditDestinationType('proposal')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              editDestinationType === 'proposal' ? 'shadow-sm' : 'border opacity-80'
                            }`}
                            style={{
                              backgroundColor: editDestinationType === 'proposal' ? theme.secondary : 'transparent',
                              color: editDestinationType === 'proposal' ? 'var(--secondary-fg)' : theme.text,
                              borderColor: theme.border,
                            }}
                          >
                            Proposta Específica
                          </button>
                        </div>

                        {editDestinationType === 'proposal' && proposals.length > 0 && (
                          <div className="pt-1.5">
                            <select
                              value={editProposalId}
                              onChange={(e) => setEditProposalId(e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border text-xs outline-none cursor-pointer"
                              style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                            >
                              {proposals.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} · {p.status} {p.systemPowerKWp ? `(${p.systemPowerKWp} kWp)` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg border p-2.5 text-sm outline-none resize-none"
                        style={{
                          backgroundColor: theme.primary,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />

                      {/* Imagens no modo de edição */}
                      {editImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editImages.map((imgSrc, i) => (
                            <div
                              key={i}
                              className="relative h-16 w-16 rounded-md border overflow-hidden"
                              style={{ borderColor: theme.border }}
                            >
                              <img src={imgSrc} alt="Anexo" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-0.5 right-0.5 rounded-full p-0.5 bg-black/80 text-white hover:bg-red-600"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <input
                          type="file"
                          ref={editFileInputRef}
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => void handleProcessFiles(e.target.files, true)}
                        />
                        <button
                          type="button"
                          data-text-only="true"
                          onClick={() => editFileInputRef.current?.click()}
                          className="btn-text inline-flex items-center gap-1 text-xs cursor-pointer"
                        >
                          <ImagePlus className="h-3.5 w-3.5" /> Adicionar mais fotos
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-cancel-outline="true"
                            onClick={() => setEditingNoteId(null)}
                            className="btn-outline-cancel px-3 py-1 text-xs rounded-lg cursor-pointer"
                            style={{ borderColor: theme.border }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit()}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-bold rounded-lg shadow"
                            style={{
                              backgroundColor: theme.secondary,
                              color: 'var(--secondary-fg, #0f172a)',
                            }}
                          >
                            Salvar Alteração
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Exibição normal do Card da Nota */
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
                          {/* BADGES CLARAS: Proposta ou Geral */}
                          {note.proposalCode ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shrink-0"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                                color: theme.secondary,
                              }}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span>Proposta: {note.proposalCode}</span>
                              {note.proposalStatus && (
                                <span
                                  className="text-[10px] px-1.5 py-0.2 rounded-full font-bold border"
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
                          ) : (
                            <div
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border shrink-0"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: theme.primary,
                                color: 'var(--dim)',
                              }}
                            >
                              {isClient ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                              <span>Anotação do {targetLabel}</span>
                            </div>
                          )}

                          <span className="flex items-center gap-1 font-medium whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 text-[var(--dim)]" />
                            {formatNoteDate(note.createdAt)}
                          </span>
                          {note.updatedAt && (
                            <span className="text-[10px] opacity-75">(editada)</span>
                          )}
                        </div>

                        {confirmDeleteId === note.id ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] animate-fadeIn">
                            <span className="text-[11px] font-bold text-[var(--danger)]">Excluir?</span>
                            <button
                              type="button"
                              data-delete-btn="true"
                              onClick={() => void handleDeleteNote(note.id)}
                              disabled={saving}
                              className="btn-danger-solid px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                              title="Confirmar exclusão desta anotação"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              data-text-only="true"
                              onClick={() => setConfirmDeleteId(null)}
                              className="btn-cancel px-1.5 py-0.5 text-[10px] cursor-pointer"
                              title="Cancelar exclusão"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(note)}
                              title="Editar anotação"
                              className="p-1 rounded text-[var(--dim)] hover:text-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_12%,transparent)] transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              data-delete-btn="true"
                              onClick={() => setConfirmDeleteId(note.id)}
                              title="Excluir anotação"
                              className="btn-delete p-1 rounded text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Texto da Anotação */}
                      {note.text && (
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[var(--text)]">
                          {note.text}
                        </p>
                      )}

                      {/* Galeria de Fotos Anexadas */}
                      {note.images && note.images.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2.5">
                            {note.images.map((imgSrc, imgIdx) => (
                              <div
                                key={imgIdx}
                                onClick={() => setActiveLightboxImg(imgSrc)}
                                className="group relative h-20 w-20 sm:h-24 sm:w-24 rounded-lg border overflow-hidden shadow-sm cursor-pointer"
                                style={{ borderColor: theme.border }}
                                title="Clique para ampliar"
                              >
                                <img
                                  src={imgSrc}
                                  alt={`Anexo ${imgIdx + 1}`}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Modal de Imagem Ampliada */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeLightboxImg}
              alt="Foto ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
