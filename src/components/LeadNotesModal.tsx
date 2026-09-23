import React, { useState } from 'react';
import { NotepadText, X } from 'lucide-react';
import { Lead, ThemeConfig } from '../types';
import { LeadNotesManager } from './LeadNotesManager';
import { formatPhone } from '../utils/formatters';
import { parseLeadNotes } from '../utils/leadNotes';

interface LeadNotesModalProps {
  lead: Lead;
  theme: ThemeConfig;
  targetType?: 'lead' | 'client';
  onClose: () => void;
  onNotesUpdated: (serializedNotes: string, notesCount: number) => void;
  onShowToast: (message: string) => void;
}

export const LeadNotesModal: React.FC<LeadNotesModalProps> = ({
  lead,
  theme,
  targetType = 'lead',
  onClose,
  onNotesUpdated,
  onShowToast,
}) => {
  const [notesCount, setNotesCount] = useState<number>(() => parseLeadNotes(lead.notes).length);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 82%, transparent)' }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
          boxShadow: `0 24px 60px ${theme.secondary}33`,
        }}
      >
        {/* Header do Ambiente de Anotações */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{
            borderColor: theme.border,
            backgroundColor: 'color-mix(in srgb, var(--primary) 96%, transparent)',
          }}
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
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  {targetType === 'client' ? 'Anotações do Cliente' : 'Anotações do Interessado'}
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)] truncate max-w-md">
                <strong>{lead.name}</strong> · {formatPhone(lead.phone)}{' '}
                {lead.city && `· ${lead.city}/${lead.state}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-[var(--dim)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo do Gerenciador de Anotações com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <LeadNotesManager
            leadId={lead.id}
            leadName={lead.name}
            initialNotes={lead.notes}
            theme={theme}
            targetType={targetType}
            onNotesUpdated={(serializedNotes, count) => {
              setNotesCount(count);
              onNotesUpdated(serializedNotes, count);
            }}
            onShowToast={onShowToast}
          />
        </div>

        {/* Rodapé */}
        <div
          className="border-t px-6 py-3 flex items-center justify-between text-xs text-[var(--muted)] shrink-0"
          style={{
            borderColor: theme.border,
            backgroundColor: 'color-mix(in srgb, var(--primary) 96%, transparent)',
          }}
        >
          <span>
            {notesCount} anotação(ões) vinculada(s) a este interessado
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] transition-colors cursor-pointer"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
