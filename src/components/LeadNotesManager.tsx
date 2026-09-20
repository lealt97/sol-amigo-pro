import React, { useState, useRef, useEffect } from 'react';
import {
  NotepadText,
  Plus,
  ImagePlus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  Pencil,
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { LeadNote, parseLeadNotes, serializeLeadNotes, compressImageFile } from '../utils/leadNotes';
import { updateLeadNotes } from '../services/leads';

interface LeadNotesManagerProps {
  leadId: string;
  leadName: string;
  initialNotes?: string;
  theme: ThemeConfig;
  onNotesUpdated?: (serializedNotes: string, notesCount: number) => void;
  onShowToast: (message: string) => void;
}

export const LeadNotesManager: React.FC<LeadNotesManagerProps> = ({
  leadId,
  initialNotes,
  theme,
  onNotesUpdated,
  onShowToast,
}) => {
  const [notes, setNotes] = useState<LeadNote[]>(() => parseLeadNotes(initialNotes));
  const [newText, setNewText] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Estado para edição
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);

  // Drag and drop feedback
  const [isDragging, setIsDragging] = useState(false);

  // Confirmação segura de exclusão de anotação
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNotes(parseLeadNotes(initialNotes));
  }, [initialNotes]);

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

  const handleCreateNote = async () => {
    const trimmed = newText.trim();
    if (!trimmed && newImages.length === 0) {
      onShowToast('Digite um texto ou anexe pelo menos uma imagem para salvar.');
      return;
    }

    setSaving(true);
    const newNoteItem: LeadNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
      images: newImages,
    };

    const updatedNotes = [newNoteItem, ...notes];
    const serialized = serializeLeadNotes(updatedNotes);

    try {
      await updateLeadNotes(leadId, serialized);
      setNotes(updatedNotes);
      setNewText('');
      setNewImages([]);
      onNotesUpdated?.(serialized, updatedNotes.length);
      onShowToast('Anotação adicionada com sucesso.');
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
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    const trimmed = editText.trim();
    if (!trimmed && editImages.length === 0) {
      onShowToast('A anotação não pode ficar vazia.');
      return;
    }

    setSaving(true);
    const updatedNotes = notes.map((item) => {
      if (item.id === editingNoteId) {
        return {
          ...item,
          text: trimmed,
          images: editImages,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    const serialized = serializeLeadNotes(updatedNotes);

    try {
      await updateLeadNotes(leadId, serialized);
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dim)]">
            Nova Anotação
          </label>
          <span className="text-[11px] text-[var(--muted)]">
            Digite ou arraste fotos para anexar
          </span>
        </div>

        <textarea
          rows={3}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Insira detalhes de conversas, preferências do cliente, visitas técnicas ou projeto..."
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
                color: theme.text,
              }}
              title="Anexar fotos da visita ou imagens"
            >
              {processingImages ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ImagePlus className="h-3.5 w-3.5 text-[var(--secondary)]" />
                  Anexar imagens
                </>
              )}
            </button>
            {newImages.length > 0 && (
              <span className="text-xs text-[var(--muted)]">
                {newImages.length} imagem(ns) pronta(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(newText || newImages.length > 0) && (
              <button
                type="button"
                data-text-only="true"
                onClick={() => {
                  setNewText('');
                  setNewImages([]);
                }}
                className="btn-cancel px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCreateNote()}
              disabled={saving || (!newText.trim() && newImages.length === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.secondary,
                color: 'var(--secondary-fg, #0f172a)',
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
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] flex items-center gap-2">
            <NotepadText className="h-3.5 w-3.5 text-[var(--secondary)]" />
            Histórico de Anotações ({notes.length})
          </h3>
        </div>

        {notes.length === 0 ? (
          <div
            className="rounded-xl border border-dashed p-8 text-center"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <NotepadText className="mx-auto h-8 w-8 text-[var(--dim)] mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[var(--text)]">Nenhuma anotação registrada ainda</p>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Utilize o formulário acima para registrar informações de reuniões, telefonemas e fotos do local da instalação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
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
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="flex items-center gap-1 font-medium">
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

                      {/* Texto */}
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
              alt="Imagem ampliada"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <a
                href={activeLightboxImg}
                download="anotacao-lead-foto.jpg"
                className="p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                title="Baixar imagem"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setActiveLightboxImg(null)}
                className="p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
